<?php

namespace App\Services\Pricing;

use App\Imports\PricesImport;
use App\Models\Plant;
use App\Models\PlantProduct;
use App\Models\PriceImportBatch;
use App\Models\PriceImportItem;
use App\Models\PricingConfiguration;
use App\Models\Product;
use App\Models\Wholesaler;
use App\Models\WholesalerPrice;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Maatwebsite\Excel\Facades\Excel;
use RuntimeException;

/**
 * Importación de precios desde Excel (ADR-010 §18-§24, Fases 5-7).
 *
 * - `upload()`: guarda el archivo en el disco local bajo el lote, analiza la
 *   hoja (columnas A-B = Planta/Producto, C-M = mayoristas, N-V derivadas),
 *   persiste los items de auditoría (price_import_items) con su estado
 *   (new|updated|unchanged|error) y deja el lote en `pending`. NO toca los
 *   precios definitivos.
 * - `catalogPreview()`: re-lectura del archivo guardado para listar los
 *   catálogos nuevos (planta/producto/mayorista) y las diferencias entre la
 *   columna V del Excel y el motor del sistema (preview informativo).
 * - `confirm()`: aplica los precios en una transacción: crea los catálogos
 *   confirmados, asocia plant_product, hace upsert de wholesaler_prices,
 *   recalcula precios con el motor y registra los snapshots históricos.
 * - `cancel()`: deja el lote en `cancelled` sin aplicar nada.
 *
 * Reglas críticas (ADR-010 §24): una celda vacía representa "sin precio" y
 * NUNCA se interpreta como 0. Un 0 explícito (o un negativo) es un error de
 * la fila, se guarda en price_import_items.error_message y no detiene la
 * importación.
 */
class PriceImportService
{
    /** Índice 0-based de la primera columna de mayoristas (C). */
    public const WHOLESALERS_START_COLUMN = 2;

    /** Índice 0-based de la última columna de mayoristas (M) del ADR. */
    public const WHOLESALERS_END_COLUMN = 12;

    /** Índice 0-based de la columna derivada V (precio final del Excel). */
    public const EXCEL_FINAL_COLUMN = 21;

    public function __construct(
        private readonly PricesImport $import,
        private readonly PriceCalculator $calculator,
        private readonly PriceHistoryService $history,
        private readonly PricingConfigurationService $configurations,
    ) {
    }

    public function upload(UploadedFile $file): PriceImportBatch
    {
        $fileName = $file->getClientOriginalName();
        $ext = strtolower($file->getClientOriginalExtension());

        if (! in_array($ext, ['xlsx', 'xls'], true)) {
            throw new RuntimeException('invalid_extension');
        }

        $batch = PriceImportBatch::create([
            'file_name' => $fileName,
            'status' => 'pending',
            'started_at' => now(),
        ]);

        try {
            $path = 'imports/'.$batch->id;
            Storage::disk('local')->putFileAs($path, $file, 'data.'.$ext);

            $parsed = $this->parse(Storage::disk('local')->path($path.'/data.'.$ext));
            $this->persistItems($batch, $parsed);
            $this->refreshCounters($batch, 'pending');

            return $batch;
        } catch (\Throwable $e) {
            Storage::disk('local')->deleteDirectory('imports/'.$batch->id);
            $batch->forceDelete();

            throw $e;
        }
    }

    /**
     * Re-lectura del archivo guardado para el preview: catálogos nuevos y
     * comparación de la columna V del Excel contra el motor del sistema.
     *
     * @return array{new_catalogs: array, calc: array}
     */
    public function catalogPreview(PriceImportBatch $batch): array
    {
        $parsed = $this->parse($this->storedPath($batch));

        return [
            'new_catalogs' => $this->newCatalogs($parsed),
            'calc' => $this->calcPreview($parsed),
        ];
    }

    /**
     * Aplica los precios de la importación en una transacción.
     *
     * @param  array{plants?: array, products?: array, wholesalers?: array}  $createFlags
     *         Nombres de catálogos nuevos que el usuario confirmó crear.
     * @return array{imported: int, updated: int, errors: int}
     */
    public function confirm(PriceImportBatch $batch, array $createFlags): array
    {
        if (! in_array($batch->status, ['pending', 'processing'], true)) {
            throw new RuntimeException('batch_not_pending');
        }

        $config = $this->configurations->active();
        if ($config === null) {
            throw new RuntimeException('no_active_configuration');
        }

        $items = $batch->items()->get();

        return DB::transaction(function () use ($batch, $items, $createFlags, $config) {
            $plants = $this->resolveCatalogs($items, 'plant_name', $createFlags['plants'] ?? []);
            $products = $this->resolveCatalogs($items, 'product_name', $createFlags['products'] ?? []);
            $wholesalers = $this->resolveCatalogs($items, 'wholesaler_name', $createFlags['wholesalers'] ?? []);

            $affected = collect();

            $groups = $items->groupBy(fn (PriceImportItem $item) => $item->plant_name.'|'.$item->product_name);

            foreach ($groups as $groupItems) {
                /** @var PriceImportItem $first */
                $first = $groupItems->first();

                if ($first->plant_name === '-' || $first->product_name === '-') {
                    continue;
                }

                $plant = $plants[$first->plant_name] ?? null;
                $product = $products[$first->product_name] ?? null;

                if ($plant === null || $product === null) {
                    $groupItems->each(fn (PriceImportItem $item) => $this->failItem($item, 'catalog_not_confirmed'));

                    continue;
                }

                $plantProduct = PlantProduct::firstOrCreate(
                    ['plant_id' => $plant->id, 'product_id' => $product->id],
                    ['is_active' => true],
                );

                $hasWrites = false;

                foreach ($groupItems as $item) {
                    if ($item->status === 'error') {
                        continue;
                    }

                    $wholesaler = $wholesalers[$item->wholesaler_name] ?? null;

                    if ($wholesaler === null) {
                        $this->failItem($item, 'catalog_not_confirmed');

                        continue;
                    }

                    if ($item->status === 'unchanged') {
                        continue;
                    }

                    if ($item->new_price === null) {
                        continue;
                    }

                    WholesalerPrice::updateOrCreate(
                        ['plant_product_id' => $plantProduct->id, 'wholesaler_id' => $wholesaler->id],
                        ['price' => $item->new_price, 'import_batch_id' => $batch->id],
                    );

                    $hasWrites = true;
                }

                if ($hasWrites) {
                    $affected->push($plantProduct);
                }
            }

            foreach ($affected->unique('id') as $plantProduct) {
                $result = $this->calculator->calculate($plantProduct, $config);

                if ($result !== null) {
                    $this->history->record($plantProduct, $result, $config);
                }
            }

            $this->refreshCounters($batch, 'completed');

            return [
                'imported' => (int) $batch->new_rows + (int) $batch->updated_rows,
                'updated' => (int) $batch->updated_rows,
                'errors' => (int) $batch->error_rows,
            ];
        });
    }

    public function cancel(PriceImportBatch $batch): void
    {
        if (! in_array($batch->status, ['pending', 'processing'], true)) {
            throw new RuntimeException('batch_not_pending');
        }

        $batch->update([
            'status' => 'cancelled',
            'completed_at' => now(),
        ]);
    }

    /**
     * Lee la hoja activa del archivo y la normaliza a estructura interna.
     *
     * @return array{
     *   header_row: int,
     *   wholesalers: array<string, int>,
     *   groups: array<int, array>,
     *   missing_catalogs: array{plants: array, products: array, wholesalers: array}
     * }
     */
    private function parse(string $path): array
    {
        $sheets = Excel::toArray($this->import, $path);
        $rows = $sheets[0] ?? [];

        if ($rows === []) {
            throw new RuntimeException('empty_file');
        }

        $headerRow = $this->findHeaderRow($rows);
        if ($headerRow === null) {
            throw new RuntimeException('no_header_row');
        }

        $header = $rows[$headerRow];

        $wholesalers = [];
        for ($col = self::WHOLESALERS_START_COLUMN; $col <= self::WHOLESALERS_END_COLUMN; $col++) {
            $name = trim((string) ($header[$col] ?? ''));

            if ($name === '') {
                continue;
            }

            if (isset($wholesalers[$name])) {
                throw new RuntimeException('wholesalers_duplicated');
            }

            $wholesalers[$name] = $col;
        }

        if ($wholesalers === []) {
            throw new RuntimeException('no_wholesalers');
        }

        $plants = $this->catalogMap(Plant::query()->get()->map(fn (Plant $p) => ['id' => $p->id, 'name' => $p->name]));
        $products = $this->catalogMap(Product::query()->get()->map(fn (Product $p) => ['id' => $p->id, 'name' => $p->name]));
        $wholesalerIds = $this->catalogMap(Wholesaler::query()->get()->map(fn (Wholesaler $w) => ['id' => $w->id, 'name' => $w->name]));

        $plantProducts = PlantProduct::query()->get()
            ->keyBy(fn (PlantProduct $pp) => $pp->plant_id.':'.$pp->product_id);

        $wholesalerPrices = WholesalerPrice::query()->get()
            ->mapWithKeys(fn (WholesalerPrice $wp) => [$wp->plant_product_id.':'.$wp->wholesaler_id => (string) $wp->price]);

        $groups = [];
        $missing = ['plants' => [], 'products' => [], 'wholesalers' => []];
        $currentPlant = '';

        foreach ($rows as $index => $row) {
            if ($index <= $headerRow) {
                continue;
            }

            $plant = trim((string) ($row[0] ?? ''));
            $product = trim((string) ($row[1] ?? ''));

            if ($plant !== '') {
                $currentPlant = $plant;
            }

            if ($this->isBlankRow($row)) {
                continue;
            }

            // Filas estructurales del encabezado real (p. ej. la segunda fila
            // con "Precio" repetido y una fecha serial en A, o filas con solo
            // ceros en las derivadas N-V): producto vacío y sin precios
            // numéricos en C-M se ignoran por completo. Si hay precios, la
            // fila es un dato con producto omitido y se marca missing_product.
            if ($product === '' && ! $this->hasNumericWholesalerPrices($row)) {
                continue;
            }

            // Plantas en celdas combinadas: la fila de continuación no repite
            // la planta; se hereda de la última fila del grupo.
            $plant = $currentPlant;

            $sheetRow = $index + 1;

            if ($plant === '') {
                $groups[] = $this->rowGroup($sheetRow, $plant, $product, [
                    $this->priceRecord('-', null, 'missing_plant', null, null, null, null),
                ]);

                continue;
            }

            if ($product === '') {
                $groups[] = $this->rowGroup($sheetRow, $plant, $product, [
                    $this->priceRecord('-', null, 'missing_product', null, null, null, null),
                ]);

                continue;
            }

            $plantId = $plants[mb_strtolower($plant)] ?? null;
            $productId = $products[mb_strtolower($product)] ?? null;

            $plantProductId = ($plantId !== null && $productId !== null)
                ? ($plantProducts[$plantId.':'.$productId]->id ?? null)
                : null;

            $prices = [];

            foreach ($wholesalers as $wsName => $col) {
                $raw = trim((string) ($row[$col] ?? ''));

                if ($raw === '') {
                    continue;
                }

                $wsId = $wholesalerIds[mb_strtolower($wsName)] ?? null;

                if ($wsId === null) {
                    $missing['wholesalers'][$wsName] = true;
                }

                $parsedPrice = $this->parsePrice($raw);

                if ($parsedPrice['error'] !== null) {
                    $prices[] = $this->priceRecord(
                        $wsName,
                        null,
                        $parsedPrice['error'],
                        $plantId,
                        $productId,
                        $plantProductId,
                        $wsId,
                    );

                    continue;
                }

                $previous = ($plantProductId !== null && $wsId !== null)
                    ? ($wholesalerPrices[$plantProductId.':'.$wsId] ?? null)
                    : null;

                $prices[] = $this->priceRecord(
                    $wsName,
                    $parsedPrice['price'],
                    null,
                    $plantId,
                    $productId,
                    $plantProductId,
                    $wsId,
                    $previous,
                );
            }

            if ($prices === []) {
                continue;
            }

            // Solo se registran como catálogos nuevos pendientes los que la
            // fila realmente va a tocar (tiene precios); las plantas/productos
            // sin precios en el archivo no generan items y no deben ofrecerse
            // para confirmar (coherencia preview <-> confirm).
            if ($plantId === null) {
                $missing['plants'][$plant] = true;
            }
            if ($productId === null) {
                $missing['products'][$product] = true;
            }

            $groups[] = $this->rowGroup($sheetRow, $plant, $product, $prices, $this->excelFinal($row));
        }

        if ($groups === []) {
            throw new RuntimeException('empty_file');
        }

        return [
            'header_row' => $headerRow,
            'wholesalers' => $wholesalers,
            'groups' => $groups,
            'missing_catalogs' => $missing,
        ];
    }

    private function findHeaderRow(array $rows): ?int
    {
        foreach ($rows as $index => $row) {
            $plant = trim((string) ($row[0] ?? ''));
            $product = trim((string) ($row[1] ?? ''));

            if ($plant !== '' && $product !== '') {
                return $index;
            }
        }

        return null;
    }

    private function isBlankRow(array $row): bool
    {
        foreach ($row as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * True si alguna celda de mayoristas (C-M) contiene un valor numérico.
     * Se usa para distinguir filas estructurales ("Precio" repetido, fechas
     * seriales) de filas de datos con producto omitido.
     */
    private function hasNumericWholesalerPrices(array $row): bool
    {
        for ($col = self::WHOLESALERS_START_COLUMN; $col <= self::WHOLESALERS_END_COLUMN; $col++) {
            $raw = trim((string) ($row[$col] ?? ''));

            if ($raw !== '' && is_numeric($raw)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array{ok: bool, price: ?string, error: ?string}
     */
    private function parsePrice(string $raw): array
    {
        if (! is_numeric($raw)) {
            return ['ok' => false, 'price' => null, 'error' => 'price_invalid'];
        }

        $value = (float) $raw;

        if ($value == 0.0) {
            return ['ok' => false, 'price' => null, 'error' => 'price_zero'];
        }

        if ($value < 0.0) {
            return ['ok' => false, 'price' => null, 'error' => 'price_negative'];
        }

        return ['ok' => true, 'price' => Decimal::round($raw, 4), 'error' => null];
    }

    /**
     * @return array{wholesaler: string, new_price: ?string, error: ?string,
     *              plant_id: ?int, product_id: ?int, plant_product_id: ?int,
     *              wholesaler_id: ?int, previous_price: ?string}
     */
    private function priceRecord(
        string $wholesaler,
        ?string $newPrice,
        ?string $error,
        ?int $plantId,
        ?int $productId,
        ?int $plantProductId,
        ?int $wholesalerId,
        ?string $previousPrice = null,
    ): array {
        return [
            'wholesaler' => $wholesaler,
            'new_price' => $newPrice,
            'error' => $error,
            'plant_id' => $plantId,
            'product_id' => $productId,
            'plant_product_id' => $plantProductId,
            'wholesaler_id' => $wholesalerId,
            'previous_price' => $previousPrice,
        ];
    }

    private function rowGroup(int $row, string $plant, string $product, array $prices, ?string $excelFinal = null): array
    {
        return [
            'row' => $row,
            'plant' => $plant,
            'product' => $product,
            'prices' => $prices,
            'excel_final' => $excelFinal,
        ];
    }

    private function excelFinal(array $row): ?string
    {
        $raw = trim((string) ($row[self::EXCEL_FINAL_COLUMN] ?? ''));

        if ($raw === '' || ! is_numeric($raw)) {
            return null;
        }

        return Decimal::round($raw, 4);
    }

    private function persistItems(PriceImportBatch $batch, array $parsed): void
    {
        foreach ($parsed['groups'] as $group) {
            foreach ($group['prices'] as $price) {
                $status = $price['error'] !== null
                    ? 'error'
                    : ($price['previous_price'] === null
                        ? 'new'
                        : ((string) $price['previous_price'] === (string) $price['new_price'] ? 'unchanged' : 'updated'));

                PriceImportItem::create([
                    'import_batch_id' => $batch->id,
                    'row_number' => $group['row'],
                    'plant_name' => $group['plant'] !== '' ? $group['plant'] : '-',
                    'product_name' => $group['product'] !== '' ? $group['product'] : '-',
                    'wholesaler_name' => $price['wholesaler'] ?: '-',
                    'previous_price' => $price['previous_price'],
                    'new_price' => $price['new_price'],
                    'status' => $status,
                    'error_message' => $price['error'],
                ]);
            }
        }
    }

    private function refreshCounters(PriceImportBatch $batch, string $status): void
    {
        $items = $batch->items()->get();

        $batch->update([
            'status' => $status,
            'total_rows' => $items->count(),
            'new_rows' => $items->where('status', 'new')->count(),
            'updated_rows' => $items->where('status', 'updated')->count(),
            'unchanged_rows' => $items->where('status', 'unchanged')->count(),
            'error_rows' => $items->where('status', 'error')->count(),
            'completed_at' => now(),
        ]);
    }

    /**
     * @return array{plants: array, products: array, wholesalers: array}
     */
    private function newCatalogs(array $parsed): array
    {
        $missing = $parsed['missing_catalogs'];

        return [
            'plants' => array_values(array_unique(array_map('trim', array_keys($missing['plants'])))),
            'products' => array_values(array_unique(array_map('trim', array_keys($missing['products'])))),
            'wholesalers' => array_values(array_unique(array_map('trim', array_keys($missing['wholesalers'])))),
        ];
    }

    /**
     * Compara la columna V del Excel (precio final) con el motor del sistema
     * usando los precios del archivo (los mayoristas nuevos participan con un
     * id sintético determinístico para mantener el desempate del §16).
     */
    private function calcPreview(array $parsed): array
    {
        $config = $this->configurations->active();

        if ($config === null) {
            return ['active' => false, 'rows' => [], 'mismatches' => 0];
        }

        $sortedNewWholesalers = $parsed['missing_catalogs']['wholesalers'];
        asort($sortedNewWholesalers);
        $newIndex = array_flip(array_keys($sortedNewWholesalers));

        $rows = [];
        $mismatches = 0;

        foreach ($parsed['groups'] as $group) {
            if ($group['plant'] === '' || $group['product'] === '') {
                continue;
            }

            $priceRows = collect($group['prices'])
                ->filter(fn (array $price) => $price['error'] === null && $price['new_price'] !== null)
                ->map(function (array $price) use ($newIndex) {
                    $wholesalerId = $price['wholesaler_id'];

                    if ($wholesalerId === null) {
                        $wholesalerId = -1 * ((int) ($newIndex[$price['wholesaler']] ?? 0) + 1);
                    }

                    return ['wholesaler_id' => $wholesalerId, 'price' => $price['new_price']];
                });

            $result = $this->calculator->resolve($priceRows->values(), $config);

            if ($result === null) {
                continue;
            }

            $excelFinal = $group['excel_final'];
            $match = $excelFinal === null ? null : ($excelFinal === $result->finalPrice);

            if ($match === false) {
                $mismatches++;
            }

            $rows[] = [
                'row_number' => $group['row'],
                'plant' => $group['plant'],
                'product' => $group['product'],
                'excel_final' => $excelFinal,
                'system_final' => $result->finalPrice,
                'match' => $match,
            ];
        }

        return ['active' => true, 'rows' => $rows, 'mismatches' => $mismatches];
    }

    /**
     * Mapa de nombre (minúsculas sin normalizar) a id de catálogo.
     *
     * @param  \Illuminate\Support\Collection<int, array{id:int, name:string}>  $rows
     * @return array<string, int>
     */
    private function catalogMap(Collection $rows): array
    {
        $map = [];

        foreach ($rows as $row) {
            $map[mb_strtolower(trim((string) $row['name']))] = (int) $row['id'];
        }

        return $map;
    }

    /**
     * Resuelve (o crea, si fue confirmado) los catálogos mencionados en los
     * items. Devuelve mapa de nombre exacto -> modelo.
     *
     * @return array<string, Plant|Product|Wholesaler>
     */
    private function resolveCatalogs(EloquentCollection $items, string $field, array $confirmedNames): array
    {
        $modelClass = match ($field) {
            'plant_name' => Plant::class,
            'product_name' => Product::class,
            default => Wholesaler::class,
        };

        $confirmed = array_map(fn ($name) => trim((string) $name), $confirmedNames);

        $names = $items->pluck($field)
            ->filter(fn (?string $name) => $name !== null && $name !== '')
            ->unique()
            ->sort()
            ->values();

        $resolved = [];

        foreach ($names as $name) {
            $key = mb_strtolower($name);
            $existing = $modelClass::query()
                ->whereRaw('LOWER(name) = ?', [$key])
                ->first();

            if ($existing !== null) {
                $resolved[$name] = $existing;

                continue;
            }

            if (! in_array($name, $confirmed, true)) {
                continue;
            }

            $resolved[$name] = $modelClass::create(['name' => $name, 'is_active' => true]);
        }

        return $resolved;
    }

    private function failItem(PriceImportItem $item, string $error): void
    {
        if ($item->status !== 'error' || $item->error_message !== $error) {
            $item->status = 'error';
            $item->error_message = $error;
            $item->save();
        }
    }

    private function storedPath(PriceImportBatch $batch): string
    {
        $files = Storage::disk('local')->files('imports/'.$batch->id);

        if ($files === []) {
            throw new RuntimeException('file_missing');
        }

        return Storage::disk('local')->path($files[0]);
    }
}