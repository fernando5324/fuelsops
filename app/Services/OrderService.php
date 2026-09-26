<?php

namespace App\Services;

use App\Models\Advisor;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\MediaFile;
use App\Models\Order;
use App\Models\OrderDeletion;
use App\Models\OrderDetail;
use App\Models\OrderStatus;
use App\Models\OrderStatusHistory;
use App\Models\Plant;
use App\Models\PlantProduct;
use App\Models\Product;
use App\Models\Vehicle;
use App\Models\Wholesaler;
use App\Models\WholesalerPrice;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Lógica de negocio de pedidos (ADR-064: el servicio se usa cuando la
 * operación involucra varias entidades, transacciones o reglas).
 */
class OrderService
{
    public function __construct(private readonly MediaService $mediaService)
    {
    }

    /**
     * Crea una orden con sus detalles y archivos en una sola transacción.
     * El cliente se reutiliza por tax_id o se crea (ADR-004).
     *
     * @param  array  $data  ['order_date', 'advisor_id', 'customer', 'driver_id',
     *                       'tanker_id', 'tractor_id', 'notes', 'details', 'files']
     */
    public function create(array $data): Order
    {
        $customer = $this->resolveCustomer($data['customer'] ?? []);

        // Chofer y vehículos: se reutilizan por licencia/placa o se crean si
        // no existen (flujo público, mismo patrón que resolveCustomer).
        $data['driver_id'] = $this->resolveDriver($data['driver'] ?? [])->id;
        $data['tanker_id'] = $this->resolveVehicle($data['tanker'] ?? [], Vehicle::TYPE_TANKER)->id;
        $data['tractor_id'] = $this->resolveVehicle($data['tractor'] ?? [], Vehicle::TYPE_TRACTOR)->id;

        // Validación estricta multi-tenant: todas las entidades referenciadas
        // deben pertenecer a la organización destino (scope del contexto).
        $this->assertReferencedEntities($data);

        // Fecha del pedido: la fecha elegida con la hora de registro actual
        // (America/Lima). Si no se envía fecha, se usa el momento actual.
        $orderDate = $data['order_date'] ?? null;
        if ($orderDate) {
            $orderDate = Carbon::parse($orderDate)->setTimeFrom(now());
        } else {
            $orderDate = now();
        }

        $order = DB::transaction(function () use ($data, $customer, $orderDate) {
            $order = Order::create([
                'order_date' => $orderDate,
                'status_id' => $this->pendingStatusId(),
                'advisor_id' => $data['advisor_id'],
                'customer_id' => $customer->id,
                'driver_id' => $data['driver_id'],
                'tanker_id' => $data['tanker_id'],
                'tractor_id' => $data['tractor_id'],
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['details'] as $detail) {
                OrderDetail::create([
                    'order_id' => $order->id,
                    'scop' => $detail['scop'],
                    'plant_id' => $detail['plant_id'],
                    'wholesaler_id' => $detail['wholesaler_id'],
                    'product_id' => $detail['product_id'],
                    'gallons' => $detail['gallons'],
                    'sale_price' => $detail['sale_price'] ?? 0,
                    'compartments' => $detail['compartments'] ?? 1,
                    'created_by' => $this->actorId(),
                ]);
            }

            foreach (($data['files'] ?? []) as $upload) {
                $this->mediaService->storeFor($order, $upload, [
                    'directory' => 'orders/' . $order->id,
                ]);
            }

            // El historial documenta el estado inicial.
            OrderStatusHistory::create([
                'order_id' => $order->id,
                'status_id' => $order->status_id,
                'previous_status_id' => null,
                'notes' => 'Pedido registrado.',
            ]);

            return $order;
        });

        $order->load(['details', 'files', 'status']);

        return $order;
    }

    /**
     * Actualiza una orden completa (panel, Fase B). Transacción:
     * - Cliente/chofer/vehículos se reutilizan o crean (find-or-create).
     * - Detalle: soft-delete de los actuales y alta de los nuevos (aditivo,
     *   conservando auditoría y referencias históricas).
     * - Archivos: añade los nuevos y elimina (disco + baja lógica) los que
     *   vengan en `remove_files`, siempre restringidos a los del pedido.
     */
    public function update(Order $order, array $data): Order
    {
        $customer = $this->resolveCustomer($data['customer'] ?? []);
        $data['driver_id'] = $this->resolveDriver($data['driver'] ?? [])->id;
        $data['tanker_id'] = $this->resolveVehicle($data['tanker'] ?? [], Vehicle::TYPE_TANKER)->id;
        $data['tractor_id'] = $this->resolveVehicle($data['tractor'] ?? [], Vehicle::TYPE_TRACTOR)->id;

        $this->assertReferencedEntities($data);

        $orderDate = $data['order_date'] ?? now()->format('Y-m-d');
        $orderDate = Carbon::parse($orderDate)->setTimeFrom(now());

        DB::transaction(function () use ($order, $data, $customer, $orderDate) {
            $order->update([
                'order_date' => $orderDate,
                'advisor_id' => $data['advisor_id'],
                'customer_id' => $customer->id,
                'driver_id' => $data['driver_id'],
                'tanker_id' => $data['tanker_id'],
                'tractor_id' => $data['tractor_id'],
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($order->details()->get() as $detail) {
                $detail->delete();
            }

            foreach ($data['details'] as $detail) {
                OrderDetail::create([
                    'order_id' => $order->id,
                    'scop' => $detail['scop'],
                    'plant_id' => $detail['plant_id'],
                    'wholesaler_id' => $detail['wholesaler_id'],
                    'product_id' => $detail['product_id'],
                    'gallons' => $detail['gallons'],
                    'sale_price' => $detail['sale_price'] ?? 0,
                    'compartments' => $detail['compartments'] ?? 1,
                    'created_by' => $this->actorId(),
                ]);
            }

            foreach (($data['files'] ?? []) as $upload) {
                $this->mediaService->storeFor($order, $upload, [
                    'directory' => 'orders/' . $order->id,
                ]);
            }

            $removeIds = collect($data['remove_files'] ?? [])
                ->map(fn ($id) => (int) $id)
                ->all();

            if ($removeIds !== []) {
                foreach ($order->files()->whereIn('id', $removeIds)->get() as $file) {
                    $this->mediaService->destroy($file);
                }
            }
        });

        $order->refresh();

        return $order;
    }

    /**
     * Reutiliza el cliente por RUC; si no existe lo crea (usuario sistema).
     */
    public function resolveCustomer(array $input): Customer
    {
        $taxId = trim((string) ($input['tax_id'] ?? ''));

        return Customer::where('tax_id', $taxId)
            ->firstOrCreate(
                ['tax_id' => $taxId],
                ['name' => trim((string) ($input['name'] ?? ''))],
            );
    }

    /**
     * Reutiliza el chofer por número de licencia; si no existe lo crea.
     */
    public function resolveDriver(array $input): Driver
    {
        $licenseNumber = trim((string) ($input['license_number'] ?? ''));

        if ($licenseNumber === '') {
            throw ValidationException::withMessages([
                'driver.license_number' => __('order.driver_required'),
            ]);
        }

        return Driver::where('license_number', $licenseNumber)
            ->firstOrCreate(
                ['license_number' => $licenseNumber],
                ['name' => trim((string) ($input['name'] ?? ''))],
            );
    }

    /**
     * Reutiliza el vehículo por placa y tipo; si no existe lo crea con el
     * tipo pedido. La misma placa puede estar registrada como cisterna y como
     * tracto (unidades distintas): la unicidad es por (placa, tipo).
     */
    public function resolveVehicle(array $input, string $type): Vehicle
    {
        $licensePlate = strtoupper(trim((string) ($input['license_plate'] ?? '')));

        $field = $type === Vehicle::TYPE_TANKER ? 'tanker.license_plate' : 'tractor.license_plate';

        if ($licensePlate === '') {
            throw ValidationException::withMessages([
                $field => __('order.vehicle_required'),
            ]);
        }

        return Vehicle::firstOrCreate(
            [
                'license_plate' => $licensePlate,
                'type' => $type,
            ],
            [
                'is_active' => 1,
            ],
        );
    }

    /**
     * Estado por defecto (Pendiente) que reciben las órdenes nuevas.
     */
    public function pendingStatusId(): int
    {
        $id = OrderStatus::where('is_default', 1)->where('is_active', 1)->value('id');

        return (int) ($id ?? OrderStatus::min('id'));
    }

    /**
     * Cambia el estado de una orden y registra el historial (ADR-004).
     */
    public function changeStatus(Order $order, int $statusId, ?string $notes = null): Order
    {
        return DB::transaction(function () use ($order, $statusId, $notes) {
            if ($order->status_id !== $statusId) {
                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'status_id' => $statusId,
                    'previous_status_id' => $order->status_id,
                    'notes' => $notes,
                ]);

                $order->update(['status_id' => $statusId]);
            }

            $order->load(['status', 'statusHistory.status', 'statusHistory.previousStatus']);

            return $order;
        });
    }

    /**
     * Totalizadores según la regla provisional (ADR-001):
     * detail_total = gallons * sale_price; total_sale = SUM(gallons * sale_price).
     *
     * A partir de ADR-010, si los detalles traen `purchase_price`, se calculan
     * además total_purchase (SUM galones * precio de compra, precisión bcmath),
     * gain (venta - compra) y margin (% sobre la venta). Si ninguna línea tiene
     * precio de compra registrado, `total_purchase`/`gain`/`margin` son null
     * (la UI muestra '-'): evita una "ganancia = venta completa" engañosa.
     */
    public function totals(Order $order): array
    {
        $totalGallons = round($order->details->sum('gallons'), 2);
        $totalSale = round($order->details->sum(fn ($detail) => (float) $detail->gallons * (float) $detail->sale_price), 2);

        $totalPurchase = null;
        $purchases = $this->purchasePricesFor($order);
        $hasPurchase = false;
        $acc = '0';
        foreach ($order->details as $detail) {
            $price = $detail->purchase_price ?? ($purchases[$this->purchaseKey($detail)] ?? null);
            if ($price === null) {
                continue;
            }
            $hasPurchase = true;
            $acc = bcadd($acc, bcmul((string) $detail->gallons, (string) $price, 4), 2);
        }

        if ($hasPurchase) {
            $totalPurchase = $acc;
        }

        $gain = null;
        $margin = null;
        if ($totalPurchase !== null) {
            $gain = bcsub((string) $totalSale, $totalPurchase, 2);
            if ((float) $totalSale > 0) {
                $margin = bcmul(bcdiv($gain, (string) $totalSale, 6), '100', 2);
            }
        }

        return [
            'total_gallons' => $totalGallons,
            'total_sale' => $totalSale,
            'total_purchase' => $totalPurchase,
            'gain' => $gain,
            'margin' => $margin,
            'details' => $order->details->count(),
        ];
    }

    /**
     * Adjunta el precio de compra a cada detalle del pedido como atributo
     * (sin persistir): la celda de `wholesaler_prices` de la relación
     * (planta+producto, mayorista), o null si no existe (celda vacía == sin
     * precio). Se ignora `is_active` de `plant_products` (dato de referencia).
     */
    public function attachPurchasePrices(Order $order): void
    {
        $purchases = $this->purchasePricesFor($order);

        foreach ($order->details as $detail) {
            $detail->setAttribute('purchase_price', $purchases[$this->purchaseKey($detail)] ?? null);
        }
    }

    private function purchaseKey(OrderDetail $detail): string
    {
        return "{$detail->plant_id}-{$detail->wholesaler_id}-{$detail->product_id}";
    }

    /**
     * Mapa (planta, mayorista, producto) => precio de compra más bajo (MIN)
     * para los detalles del pedido. Query en dos pasos:
     *  1. plant_products resuelve (tenant, planta, producto) -> plant_product_id.
     *  2. wholesaler_prices MIN(price) por (plant_product_id, wholesaler_id),
     *     solo precios válidos (> 0, misma regla del motor ADR-010); una celda
     *     vacía (NULL) o 0 explícito == sin precio disponible.
     */
    private function purchasePricesFor(Order $order): array
    {
        if ($order->details->isEmpty()) {
            return [];
        }

        $plantProducts = PlantProduct::query()
            ->whereIn('plant_id', $order->details->pluck('plant_id')->unique())
            ->whereIn('product_id', $order->details->pluck('product_id')->unique())
            ->get()
            ->mapWithKeys(fn (PlantProduct $pp) => [
                "{$pp->plant_id}-{$pp->product_id}" => $pp->id,
            ]);

        if ($plantProducts->isEmpty()) {
            return [];
        }

        $plantProductIds = $plantProducts->values()->all();

        $prices = WholesalerPrice::query()
            ->whereIn('wholesaler_id', $order->details->pluck('wholesaler_id')->unique())
            ->where('price', '>', '0')
            ->whereIn('plant_product_id', $plantProductIds)
            ->select('plant_product_id', 'wholesaler_id', DB::raw('MIN(price) AS price'))
            ->groupBy('plant_product_id', 'wholesaler_id')
            ->get()
            ->mapWithKeys(
                fn (WholesalerPrice $wp) => [
                    $this->cellKey($wp->plant_product_id, $wp->wholesaler_id) => (string) $wp->price,
                ]
            );

        $result = [];
        foreach ($order->details as $detail) {
            $key = $this->purchaseKey($detail);
            $ppKey = "{$detail->plant_id}-{$detail->product_id}";
            if (isset($plantProducts[$ppKey], $prices[$this->cellKey($plantProducts[$ppKey], $detail->wholesaler_id)])) {
                $result[$key] = $prices[$this->cellKey($plantProducts[$ppKey], $detail->wholesaler_id)];
            }
        }

        return $result;
    }

    private function cellKey(int $plantProductId, int $wholesalerId): string
    {
        return "{$plantProductId}-{$wholesalerId}";
    }

    public function statuses(): Collection
    {
        return OrderStatus::query()
            ->orderBy('id')
            ->get(['id', 'code', 'name', 'color', 'is_default', 'is_active']);
    }

    public function statusByCode(string $code): ?OrderStatus
    {
        return OrderStatus::where('code', $code)->first();
    }

    /**
     * Envía un pedido a la papelera (ADR-011 §6/§29). Transacción:
     *  1. Valida que el pedido esté activo y el motivo.
     *  2. Genera el snapshot (fotografía histórica, §5).
     *  3. Colecta los media activos del pedido (para restaurarlos luego, §20).
     *  4. Crea el registro en order_deletions (deleted_at/deleted_by).
     *  5. orders.is_deleted = 1.
     *  6. Marca los media afectados como is_deleted = 1 SIN borrar el archivo
     *     físico (§10; no usa MediaService::destroy a propósito).
     * Los pagos no se tocan (no existe tabla de pagos aún; placeholder).
     *
     * @throws ValidationException si el pedido ya está eliminado o el motivo falta.
     */
    public function sendToTrash(Order $order, string $reason): Order
    {
        $reason = trim($reason);
        if ($reason === '') {
            throw ValidationException::withMessages([
                'reason' => __('order.trash_reason_required'),
            ]);
        }

        if ((int) $order->is_deleted === 1) {
            throw ValidationException::withMessages([
                'order' => __('order.already_in_trash'),
            ]);
        }

        $snapshot = $this->buildSnapshot($order);

        DB::transaction(function () use ($order, $reason, $snapshot) {
            $affectedMediaIds = $order->files()
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            OrderDeletion::create([
                'tenant_id' => $order->tenant_id,
                'order_id' => $order->id,
                'reason' => $reason,
                'deleted_at' => now(),
                'deleted_by' => $this->actorId(),
                'snapshot' => $snapshot,
                'affected_media_ids' => $affectedMediaIds,
            ]);

            $order->forceFill(['is_deleted' => 1])->save();

            foreach ($affectedMediaIds as $mediaId) {
                MediaFile::withDeleted()
                    ->whereKey($mediaId)
                    ->where('is_deleted', 0)
                    ->first()
                    ?->forceFill(['is_deleted' => 1])->save();
            }
        });

        $order->is_deleted = 1;

        return $order;
    }

    /**
     * Restaura un pedido desde la papelera (ADR-011 §18/§29). Transacción:
     *  1. Validaciones (§22: existe, tenant por scope, eliminado, eliminación
     *     activa, relaciones principales disponibles).
     *  2. orders.is_deleted = 0.
     *  3. Restaura los media afectados por ESTA eliminación que sigan
     *     is_deleted = 1 (no toca los borrados por otra razón, §20).
     *  4. Cierra el registro de eliminación (restored_at/restored_by) sin
     *     borrarlo (§18).
     *
     * @throws ValidationException si alguna validación falla.
     */
    public function restoreFromTrash(Order $order): Order
    {
        if ((int) $order->is_deleted !== 1) {
            throw ValidationException::withMessages([
                'order' => __('order.already_active'),
            ]);
        }

        $activeDeletion = $order->deletions()
            ->whereNull('restored_at')
            ->first();

        if (! $activeDeletion) {
            throw ValidationException::withMessages([
                'order' => __('order.trash_not_found'),
            ]);
        }

        DB::transaction(function () use ($order, $activeDeletion) {
            // Relaciones principales disponibles. Las FK RESTRICT ya las
            // garantizan; se valida igual por robustez (ADR-011 §22).
            if (! $order->customer()->exists() || ! $order->status()->exists()) {
                throw ValidationException::withMessages([
                    'order' => __('order.restore_failed'),
                ]);
            }

            $order->forceFill(['is_deleted' => 0])->save();

            $affected = array_map('intval', $activeDeletion->affected_media_ids ?? []);

            if ($affected !== []) {
                foreach (MediaFile::withDeleted()->whereIn('id', $affected)->get() as $media) {
                    if ((int) $media->is_deleted === 1) {
                        $media->forceFill(['is_deleted' => 0])->save();
                    }
                }
            }

            $activeDeletion->forceFill([
                'restored_at' => now(),
                'restored_by' => $this->actorId(),
            ])->save();
        });

        $order->is_deleted = 0;

        return $order;
    }

    /**
     * Fotografía histórica del pedido al momento de su eliminación
     * (ADR-011 §5). Es EXCLUSIVAMENTE informativo: la restauración no se
     * apoya en él, usa los registros reales (orders/order_details/media_files).
     */
    public function buildSnapshot(Order $order): array
    {
        $order->load([
            'customer',
            'status',
            'details.plant',
            'details.wholesaler',
            'details.product',
        ]);

        $details = $order->details->map(fn (OrderDetail $detail) => [
            'product_id' => $detail->product_id,
            'product_name' => $detail->product?->name,
            'wholesaler_id' => $detail->wholesaler_id,
            'wholesaler_name' => $detail->wholesaler?->name,
            'gallons' => (float) $detail->gallons,
            'sale_price' => (float) $detail->sale_price,
        ])->all();

        $firstPlant = $order->details->first()?->plant;

        return [
            'order' => [
                'id' => $order->id,
                'order_date' => $order->order_date?->format('Y-m-d H:i:s'),
                'status' => $order->status?->name,
            ],
            'customer' => [
                'id' => $order->customer_id,
                'name' => $order->customer?->name,
                'ruc' => $order->customer?->tax_id,
            ],
            'plant' => $firstPlant ? [
                'id' => $firstPlant->id,
                'name' => $firstPlant->name,
            ] : null,
            'details' => $details,
            'payments' => [],
        ];
    }

    /**
     * Verifica que cada entidad referenciada exista dentro de la organización
     * activa del contexto (los global scopes de BelongsToTenant filtran por
     * tenant_id, por lo que "no existe" es equivalente a "es de otra org").
     */
    private function assertReferencedEntities(array $data): void
    {
        $checks = [
            ['type' => Advisor::class, 'id' => $data['advisor_id'] ?? null],
            ['type' => Driver::class, 'id' => $data['driver_id'] ?? null],
            ['type' => Vehicle::class, 'id' => $data['tanker_id'] ?? null, 'type_value' => Vehicle::TYPE_TANKER],
            ['type' => Vehicle::class, 'id' => $data['tractor_id'] ?? null, 'type_value' => Vehicle::TYPE_TRACTOR],
        ];

        foreach ($data['details'] ?? [] as $detail) {
            $checks[] = ['type' => Plant::class, 'id' => $detail['plant_id'] ?? null];
            $checks[] = ['type' => Wholesaler::class, 'id' => $detail['wholesaler_id'] ?? null];
            $checks[] = ['type' => Product::class, 'id' => $detail['product_id'] ?? null];
        }

        foreach ($checks as $check) {
            if ($check['id'] === null) {
                continue;
            }

            $query = ($check['type'])::query()->whereKey((int) $check['id']);

            if (isset($check['type_value'])) {
                $query->where('type', $check['type_value']);
            }

            if (! $query->exists()) {
                throw ValidationException::withMessages([
                    'details' => __('order.invalid_references'),
                ]);
            }
        }
    }

    private function actorId(): int
    {
        return auth()->id() ?? (int) config('sertoco.system_user_id', 999999);
    }
}