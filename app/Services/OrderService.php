<?php

namespace App\Services;

use App\Models\Advisor;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\MediaFile;
use App\Models\Order;
use App\Models\OrderCompartment;
use App\Models\OrderDeletion;
use App\Models\OrderDeposit;
use App\Models\OrderDetail;
use App\Models\OrderStatus;
use App\Models\OrderStatusHistory;
use App\Models\Plant;
use App\Models\Product;
use App\Models\Vehicle;
use App\Models\VehicleCompartment;
use App\Models\Wholesaler;
use App\Services\Pricing\PricingMatrix;
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
    public function __construct(
        private readonly MediaService $mediaService,
        private readonly PricingMatrix $matrix,
        private readonly OrderCodeService $orderCodes,
    ) {
    }

    /**
     * Crea una orden con sus detalles y archivos en una sola transacción.
     * El cliente se reutiliza por tax_id o se crea (ADR-004).
     *
     * `$source` es el ORIGEN del registro (ADR-025): `public` para el formulario
     * web del cliente y `panel` para el alta manual del panel. Es un parámetro
     * explícito y NO se deduce de `auth()`: un pedido del formulario web
     * enviado por un usuario interno sigue siendo `public` (aunque `created_by`
     * guarde ese usuario). El valor por defecto es `public`, el camino más
     * frecuente y el que no debe malinterpretarse.
     *
     * @param  array  $data  ['order_date', 'advisor_id', 'customer', 'driver_id',
     *                       'tanker', 'tractor_plate', 'notes', 'details',
     *                       'compartments', 'files']
     */
    public function create(array $data, string $source = 'public'): Order
    {
        $customer = $this->resolveCustomer($data['customer'] ?? []);

        // Chofer y cisterna: se reutilizan por licencia/placa o se crean si no
        // existen (flujo público, mismo patrón que resolveCustomer). La placa
        // del tracto es un dato del vehículo (ADR-023), no una entidad: se
        // normaliza a mayúsculas y se guarda como snapshot en el pedido.
        $data['driver_id'] = $this->resolveDriver($data['driver'] ?? [])->id;
        $data['tractor_plate'] = $this->normalizePlate($data['tractor_plate'] ?? null);
        $data['tanker'] = $this->resolveVehicle($this->tankerInput($data));

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

        $order = DB::transaction(function () use ($data, $customer, $orderDate, $source) {
            $order = Order::create([
                // Código operativo del pedido (ADR-020): lo genera la secuencia
                // por organización dentro de esta misma transacción. Ni el
                // formulario público ni el alta manual del panel lo piden.
                'code' => $this->orderCodes->next(),
                // Origen del registro (ADR-025): `public` (formulario web del
                // cliente) o `panel` (alta manual). `created_by` lo pone el
                // trait Auditable con el actor real de la petición.
                'source' => $source,
                'order_date' => $orderDate,
                'status_id' => $this->pendingStatusId(),
                'advisor_id' => $data['advisor_id'],
                'customer_id' => $customer->id,
                'driver_id' => $data['driver_id'],
                'tanker_id' => $data['tanker']->id,
                'tractor_plate' => $data['tractor_plate'],
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
                    'created_by' => $this->actorId(),
                ]);
            }

            $this->storeCompartments($order, $data['compartments'] ?? []);

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

        $order->load(['details', 'compartments', 'files', 'status']);

        return $order;
    }

    /**
     * Actualiza una orden completa (panel, Fase B). Transacción:
     * - Cliente/chofer/cisterna se reutilizan o crean (find-or-create).
     * - La placa del tracto se normaliza a mayúsculas y se congela como
     *   snapshot del pedido; si cambió, la cisterna del parque se actualiza
     *   (ADR-023).
     * - Detalle: soft-delete de los actuales y alta de los nuevos (aditivo,
     *   conservando auditoría y referencias históricas).
     * - Distribución por compartimentos (ADR-015): mismo criterio que el
     *   detalle, baja lógica de los previos y alta de los nuevos.
     * - Archivos: añade los nuevos y elimina (disco + baja lógica) los que
     *   vengan en `remove_files`, siempre restringidos a los del pedido.
     */
    public function update(Order $order, array $data): Order
    {
        $customer = $this->resolveCustomer($data['customer'] ?? []);
        $data['driver_id'] = $this->resolveDriver($data['driver'] ?? [])->id;
        $data['tractor_plate'] = $this->normalizePlate($data['tractor_plate'] ?? null);
        $data['tanker'] = $this->resolveVehicle($this->tankerInput($data));

        $this->assertReferencedEntities($data);

        $orderDate = $data['order_date'] ?? now()->format('Y-m-d');
        $orderDate = Carbon::parse($orderDate)->setTimeFrom(now());

        DB::transaction(function () use ($order, $data, $customer, $orderDate) {
            $order->update([
                // El código es editable (ADR-020 §6): cambiarlo no toca el id ni
                // las relaciones; la unicidad la validó el request contra el
                // tenant (incluidos los pedidos en papelera, que reservan su
                // código porque el índice único no mira `is_deleted`).
                'code' => $data['code'],
                'order_date' => $orderDate,
                'advisor_id' => $data['advisor_id'],
                'customer_id' => $customer->id,
                'driver_id' => $data['driver_id'],
                'tanker_id' => $data['tanker']->id,
                'tractor_plate' => $data['tractor_plate'],
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
                    'created_by' => $this->actorId(),
                ]);
            }

            $this->replaceCompartments($order, $data['compartments'] ?? []);

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
     * Arma la entrada de `resolveVehicle()` uniendo la placa de la cisterna
     * (`tanker.license_plate`) con la del tracto (`tractor_plate`, nivel superior
     * del payload). Sin esto, el tracto se guardaría solo como snapshot del
     * pedido y la fila de `vehicles` se quedaría con el dato viejo: la placa del
     * tracto es de la cisterna, no del pedido.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function tankerInput(array $data): array
    {
        $tanker = $data['tanker'] ?? [];
        $tanker['license_plate'] = is_array($tanker) ? ($tanker['license_plate'] ?? null) : null;
        $tanker['tractor_plate'] = $data['tractor_plate'] ?? null;

        return $tanker;
    }

    /**
     * Reutiliza la cisterna por su placa; si no existe la crea (ADR-023).
     *
     * Una fila de `vehicles` es una CISTERNA con sus dos placas, así que la
     * búsqueda es solo por `license_plate` y la unicidad también
     * (`uq_vehicles_tenant_plate`): no hay `type` ni entidad "tractor".
     *
     * La placa del tracto se guarda en la MISMA fila: si viene informada y
     * cambió, se actualiza (última realidad gana) y el pedido guarda su
     * snapshot en `orders.tractor_plate`.
     *
     * Se busca con `withDeleted()` a propósito: el índice único no incluye
     * `is_deleted`, así que un `firstOrCreate` a secas chocaría con
     * duplicate key si la placa quedó dada de baja (mismo gotcha que
     * `plant_products`); en ese caso se revive la fila en vez de duplicarla.
     */
    public function resolveVehicle(array $input): Vehicle
    {
        $licensePlate = $this->normalizePlate($input['license_plate'] ?? null);
        $tractorPlate = $this->normalizePlate($input['tractor_plate'] ?? null);

        if ($licensePlate === null) {
            throw ValidationException::withMessages([
                'tanker.license_plate' => __('order.vehicle_required'),
            ]);
        }

        $vehicle = Vehicle::withDeleted()->where('license_plate', $licensePlate)->first();

        if (! $vehicle) {
            return Vehicle::create([
                'license_plate' => $licensePlate,
                'tractor_plate' => $tractorPlate,
                'is_active' => 1,
            ]);
        }

        // Se reviven las filas dadas de baja o desactivadas y se actualiza la
        // placa del tracto solo si cambió. `update()` no genera SQL si nada
        // quedó dirty, así que no hace falta condicionarlo.
        $changes = ['is_deleted' => 0, 'is_active' => 1];

        if ($tractorPlate !== null && $tractorPlate !== $vehicle->tractor_plate) {
            $changes['tractor_plate'] = $tractorPlate;
        }

        $vehicle->update($changes);

        return $vehicle->refresh();
    }

    /**
     * Normaliza una placa a mayúsculas sin espacios (los dos campos de
     * `vehicles` y el snapshot `orders.tractor_plate`). Devuelve null si no
     * llega nada: la placa de tracto es obligatoria en el formulario, pero el
     * servicio no la exige para no romper datos históricos.
     */
    private function normalizePlate(mixed $plate): ?string
    {
        $plate = mb_strtoupper(trim((string) $plate));

        return $plate === '' ? null : $plate;
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
     * A partir de ADR-010, si los detalles traen `purchase_price`, se calcula
     * además total_purchase (SUM galones * precio de compra, precisión bcmath).
     * Si ninguna línea tiene precio de compra registrado, `total_purchase` es
     * null (la UI muestra '-'), para no mostrar una compra en cero.
     *
     * A partir de ADR-013, `gain` es la SUMA DE LOS MÁRGENES configurados por
     * relación planta+producto (`plant_products.margin`, monto absoluto en S/
     * por galón): gain = SUM(gallons * margin). Ya no es (total_sale -
     * total_purchase): el margen es el markup que el motor aplica sobre el
     * precio sin IGV (ADR-010 §35) y es un dato que el negocio conoce aunque
     * falte el precio de compra de alguna línea. Si ningún detalle tiene
     * margen, `gain` es null (la UI muestra '-'). Todos los montos se suman
     * con bcmath (nunca float) y se redondean a 2 decimales.
     */
    public function totals(Order $order): array
    {
        $totalGallons = round($order->details->sum('gallons'), 2);
        $totalSale = round($order->details->sum(fn ($detail) => (float) $detail->gallons * (float) $detail->sale_price), 2);

        $pricing = $this->pricingFor($order);

        $purchaseAcc = '0';
        $gainAcc = '0';
        $hasPurchase = false;
        $hasMargin = false;

        foreach ($order->details as $detail) {
            $price = $detail->purchase_price ?? ($pricing['purchases'][$this->purchaseKey($detail)] ?? null);
            if ($price !== null) {
                $hasPurchase = true;
                $purchaseAcc = bcadd($purchaseAcc, bcmul((string) $detail->gallons, (string) $price, 4), 2);
            }

            $margin = $detail->margin ?? ($pricing['margins'][$this->marginKey($detail)] ?? null);
            if ($margin !== null) {
                $hasMargin = true;
                $gainAcc = bcadd($gainAcc, $this->marginLineAmount($detail->gallons, $margin), 2);
            }
        }

        return [
            'total_gallons' => $totalGallons,
            'total_sale' => $totalSale,
            'total_purchase' => $hasPurchase ? $purchaseAcc : null,
            'gain' => $hasMargin ? $gainAcc : null,
            'details' => $order->details->count(),
        ];
    }

    /**
     * Cuenta por pagar a los mayoristas del pedido: agrupa las líneas por su
     * propio `order_details.wholesaler_id` y suma galones × precio de compra de
     * la celda de ESE mayorista (ADR-010), que es lo que Sertoco le debe a cada
     * uno por este pedido.
     *
     * El `total` se acumula con la misma operación y sobre las mismas líneas en
     * el mismo orden que `total_purchase` en `totals()`, así que el cuadro
     * "Depósito por proveedor" cuadra exactamente con el cuadro "Compra" (los
     * dos usan `bcmul(gallons, precio, 4)` + `bcadd(..., 2)`, nunca float).
     *
     * Las líneas sin precio (celda vacía o 0 explícito) no aportan y NO se
     * inventan: se devuelven en `lines_without_price` para que la UI lo diga en
     * lugar de mostrar un total incompleto en silencio. Es la misma regla de
     * `total_purchase`: si ninguna línea tiene precio, `total` es `null`.
     *
     * DATO DERIVADO: no se persiste nada ni hay tabla propia; se recalcula desde
     * los detalles y la matriz de precios. Por eso es de solo lectura en la UI
     * (tampoco en la papelera) y no genera escrituras, rutas ni permisos.
     *
     * @return array{items: array<int, array{wholesaler_id: int, wholesaler_name: ?string, gallons: string, amount: string, lines: int}>, total: ?string, lines_without_price: int}
     */
    public function supplierPayables(Order $order): array
    {
        $pricing = $this->pricingFor($order);

        $groups = [];
        $total = '0';
        $hasPurchase = false;
        $withoutPrice = 0;

        foreach ($order->details as $detail) {
            $price = $detail->purchase_price ?? ($pricing['purchases'][$this->purchaseKey($detail)] ?? null);

            if ($price === null) {
                $withoutPrice++;

                continue;
            }

            $hasPurchase = true;
            $lineAmount = bcmul((string) $detail->gallons, (string) $price, 4);
            $total = bcadd($total, $lineAmount, 2);

            $wholesalerId = (int) $detail->wholesaler_id;

            if (! isset($groups[$wholesalerId])) {
                $groups[$wholesalerId] = [
                    'wholesaler_id' => $wholesalerId,
                    'wholesaler_name' => $detail->wholesaler?->name,
                    'gallons' => '0',
                    'amount' => '0',
                    'lines' => 0,
                ];
            }

            $groups[$wholesalerId]['gallons'] = bcadd($groups[$wholesalerId]['gallons'], (string) $detail->gallons, 2);
            $groups[$wholesalerId]['amount'] = bcadd($groups[$wholesalerId]['amount'], $lineAmount, 2);
            $groups[$wholesalerId]['lines']++;
        }

        $items = array_values($groups);

        // Mayor monto primero; desempate por id asc (criterio determinista, el
        // mismo que usa el motor de precios cuando dos mayoristas empatan).
        usort($items, function (array $a, array $b) {
            $byAmount = bccomp((string) $b['amount'], (string) $a['amount']);

            return $byAmount !== 0 ? $byAmount : $a['wholesaler_id'] <=> $b['wholesaler_id'];
        });

        return [
            'items' => $items,
            'total' => $hasPurchase ? $total : null,
            'lines_without_price' => $withoutPrice,
        ];
    }

    /**
     * Adjunta a cada detalle, como atributos no persistidos, los datos de
     * referencia del módulo de precios (ADR-010) que muestran las columnas del
     * detalle del pedido:
     *  - `purchase_price`: precio de compra de la celda (planta+producto,
     *    mayorista) de `wholesaler_prices`, o null si no hay precio (celda vacía
     *    == sin precio).
     *  - `margin`: margen absoluto en S/ por galón de la relación
     *    `plant_products.margin` (columna R del Excel), o null si la relación
     *    no existe.
     *  - `margin_amount`: la multiplicación margen × galones del detalle
     *    (bcmath), que es la línea que suma el pie de la tabla y alimenta el
     *    total de `gain` del resumen financiero.
     * Se ignoran `is_active` e `is_deleted` de `plant_products` (dato de
     * referencia: la relación dada de baja conserva sus precios y su margen).
     */
    public function attachPricing(Order $order): void
    {
        $pricing = $this->pricingFor($order);

        foreach ($order->details as $detail) {
            $margin = $pricing['margins'][$this->marginKey($detail)] ?? null;

            $detail->setAttribute('purchase_price', $pricing['purchases'][$this->purchaseKey($detail)] ?? null);
            $detail->setAttribute('margin', $margin);
            $detail->setAttribute('margin_amount', $margin === null ? null : $this->marginLineAmount($detail->gallons, $margin));
        }
    }

    /**
     * Registra un depósito del cliente a partir de un voucher adjunto
     * (ADR-013). El alta es MANUAL: el sistema guarda lo que el usuario leyó del
     * voucher (banco, N° de operación, fecha y monto) sin interpretar el
     * archivo adjunto.
     */
    public function storeDeposit(Order $order, array $data): OrderDeposit
    {
        return OrderDeposit::create([
            'tenant_id' => $order->tenant_id,
            'order_id' => $order->id,
            'deposit_date' => $data['deposit_date'],
            'bank' => trim((string) $data['bank']),
            'operation_number' => trim((string) $data['operation_number']),
            'amount' => $data['amount'],
            'created_by' => $this->actorId(),
        ]);
    }

    /**
     * Registra la distribución por compartimentos del pedido (ADR-015 + ADR-023).
     * Una fila por compartimento, en el orden en que llegan (que es el orden en
     * que el usuario las ve): `compartment_number` es la numeración 1..N.
     *
     * El producto y el SCOP los valida el request (deben ser una línea del
     * detalle que se está guardando), aquí solo se persisten.
     *
     * `vehicle_id` NO viene del formulario: se toma de la cisterna del pedido
     * (`tanker_id`), que es la única fuente válida (ADR-023). Y cada alta o
     * edición reconcilia la plantilla de cámaras de esa cisterna
     * (`vehicle_compartments`) con lo que el usuario declaró, que es la última
     * realidad del parque.
     */
    public function storeCompartments(Order $order, array $rows): void
    {
        $number = 0;
        $declared = [];

        foreach ($rows as $row) {
            $number++;

            OrderCompartment::create([
                'tenant_id' => $order->tenant_id,
                'order_id' => $order->id,
                'vehicle_id' => $order->tanker_id,
                'compartment_number' => $number,
                'product_id' => $row['product_id'],
                'scop' => trim((string) $row['scop']),
                'volume' => $row['volume'],
                'created_by' => $this->actorId(),
            ]);

            $declared[$number] = [
                'scop' => trim((string) $row['scop']),
                'volume' => $row['volume'],
            ];
        }

        $this->reconcileVehicleCompartments($order, $declared);
    }

    /**
     * Reconcilia la plantilla de cámaras de la cisterna (ADR-023) con lo que el
     * usuario declaró en este pedido:
     *
     * - la crea si la cisterna todavía no tiene cámaras: es el primer pedido que
     *   describe su distribución;
     * - actualiza SCOP/volumen de las que coinciden por numeración;
     * - da de baja las que sobran (la cisterna perdió cámaras);
     * - y crea las que falten, si el usuario declaró más de las que había.
     *
     * Solo se llama cuando el pedido trae distribución (`$declared` no vacío):
     * un pedido que no declara compartimentos no dice nada del vehículo y no
     * debe tocar su plantilla.
     */
    private function reconcileVehicleCompartments(Order $order, array $declared): void
    {
        if ($declared === []) {
            return;
        }

        $vehicleId = (int) $order->tanker_id;

        $current = VehicleCompartment::where('vehicle_id', $vehicleId)
            ->orderBy('compartment_number')
            ->get();

        foreach ($current as $template) {
            $number = (int) $template->compartment_number;

            if (! array_key_exists($number, $declared)) {
                $template->delete();

                continue;
            }

            $changes = [];

            if ($template->scop !== $declared[$number]['scop']) {
                $changes['scop'] = $declared[$number]['scop'];
            }

            // Se compara con bcmath a 2 decimales porque la columna es
            // DECIMAL(12,2) y el formulario puede mandar "2" donde la plantilla
            // tiene "2.00": sin esto se actualizaría la fila sin motivo.
            if (bccomp((string) $template->volume, (string) $declared[$number]['volume'], 2) !== 0) {
                $changes['volume'] = $declared[$number]['volume'];
            }

            if ($changes !== []) {
                $template->update($changes);
            }
        }

        foreach ($declared as $number => $data) {
            if ($current->contains('compartment_number', $number)) {
                continue;
            }

            VehicleCompartment::create([
                'tenant_id' => $order->tenant_id,
                'vehicle_id' => $vehicleId,
                'compartment_number' => $number,
                'scop' => $data['scop'],
                'volume' => $data['volume'],
                'is_active' => 1,
                'created_by' => $this->actorId(),
            ]);
        }
    }

    /**
     * Reemplaza la distribución por compartimentos al editar el pedido: da de
     * baja lógica las filas actuales y crea las nuevas (mismo criterio que el
     * detalle, para conservar auditoría y no perder histórico). La cantidad de
     * compartimentos es la cantidad de filas, por eso no hay nada que actualizar
     * en `orders`.
     */
    public function replaceCompartments(Order $order, array $rows): void
    {
        foreach ($order->compartments()->get() as $compartment) {
            $compartment->delete();
        }

        $this->storeCompartments($order, $rows);
    }

    private function purchaseKey(OrderDetail $detail): string
    {
        return "{$detail->plant_id}-{$detail->wholesaler_id}-{$detail->product_id}";
    }

    /** Clave del margen: el margen es de la RELACIÓN (planta + producto). */
    private function marginKey(OrderDetail $detail): string
    {
        return "{$detail->plant_id}-{$detail->product_id}";
    }

    /**
     * Multiplicación de una línea: margen (monto absoluto en S/ por galón) ×
     * galones del detalle. Se calcula con bcmath a 4 decimales y se suma con
     * `bcadd` a escala 2 (los importes se registran en soles con 2 decimales),
     * nunca con float.
     */
    private function marginLineAmount(mixed $gallons, mixed $margin): string
    {
        return bcmul((string) $gallons, (string) $margin, 4);
    }

    /**
     * Datos de referencia de precios de los detalles del pedido. La resolución
     * de la matriz (relación con withDeleted + MIN(price) por celda, solo
     * precios > 0) vive en `PricingMatrix`, compartida con el reporte
     * "Avance de ventas" (ADR-017) para que ambos Outlet usen la misma regla.
     *
     * @return array{purchases: array<string,string>, margins: array<string,string>}
     */
    private function pricingFor(Order $order): array
    {
        if ($order->details->isEmpty()) {
            return ['purchases' => [], 'margins' => []];
        }

        return $this->matrix->resolve(PricingMatrix::linesFrom($order->details));
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
     * Los depósitos del cliente (ADR-013) y la distribución por compartimentos
     * (ADR-015) NO se tocan: son datos del pedido que sobreviven a la papelera
     * (§9/§12/§21); solo se copian al snapshot como dato histórico.
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
     * apoya en él, usa los registros reales (orders/order_details/
     * media_files/order_deposits).
     */
    public function buildSnapshot(Order $order): array
    {
        $order->load([
            'customer',
            'status',
            'details.plant',
            'details.wholesaler',
            'details.product',
            'deposits',
            'compartments.product',
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

        // Depósitos del cliente registrados a mano desde los vouchers (ADR-013):
        // la información financiera del pedido que la papelera debe conservar
        // (ADR-011 §9/§12/§16/§21 ya no son N/A).
        $deposits = $order->deposits->map(fn (OrderDeposit $deposit) => [
            'id' => $deposit->id,
            'deposit_date' => $deposit->deposit_date?->format('Y-m-d'),
            'bank' => $deposit->bank,
            'operation_number' => $deposit->operation_number,
            'amount' => (string) $deposit->amount,
        ])->all();

        // Distribución por compartimentos (ADR-015): datos históricos del
        // pedido que la papelera no toca y se copian al snapshot (solo los
        // activos, igual que los depósitos).
        $compartments = $order->compartments->map(fn (OrderCompartment $compartment) => [
            'vehicle_id' => (int) $compartment->vehicle_id,
            'compartment_number' => (int) $compartment->compartment_number,
            'product_id' => $compartment->product_id,
            'product_name' => $compartment->product?->name,
            'scop' => $compartment->scop,
            'volume' => (string) $compartment->volume,
        ])->all();

        return [
            'order' => [
                'id' => $order->id,
                'code' => $order->code,
                // Origen del registro (ADR-025): queda congelado en el snapshot
                // para saber, tras el papelero, si lo envío el cliente o lo
                // registró alguien del panel.
                'source' => $order->source,
                'order_date' => $order->order_date?->format('Y-m-d H:i:s'),
                'status' => $order->status?->name,
                // Snapshot de la placa de tracto del día (ADR-023): sin FK, así
                // que es el único lugar donde queda registrada.
                'tractor_plate' => $order->tractor_plate,
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
            'deposits' => $deposits,
            'compartments' => $compartments,
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
            // La cisterna viene ya resuelta (ADR-023): es la fila que se usó
            // para resolver o crear el vehículo, no un id del formulario.
            ['type' => Vehicle::class, 'id' => $data['tanker']->id ?? null],
        ];

        foreach ($data['details'] ?? [] as $detail) {
            $checks[] = ['type' => Plant::class, 'id' => $detail['plant_id'] ?? null];
            $checks[] = ['type' => Wholesaler::class, 'id' => $detail['wholesaler_id'] ?? null];
            $checks[] = ['type' => Product::class, 'id' => $detail['product_id'] ?? null];
        }

        // Distribución por compartimentos (ADR-015): sus productos también
        // tienen que ser de la organización destino.
        foreach ($data['compartments'] ?? [] as $compartment) {
            $checks[] = ['type' => Product::class, 'id' => $compartment['product_id'] ?? null];
        }

        foreach ($checks as $check) {
            if ($check['id'] === null) {
                continue;
            }

            $query = ($check['type'])::query()->whereKey((int) $check['id']);

            if (! $query->exists()) {
                throw ValidationException::withMessages([
                    'details' => __('order.invalid_references'),
                ]);
            }
        }
    }

    private function actorId(): int
    {
        return auth()->id() ?? (int) config('platform.system_user_id', 999999);
    }
}