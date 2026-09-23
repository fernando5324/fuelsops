<?php

namespace App\Services;

use App\Models\Advisor;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\OrderStatus;
use App\Models\OrderStatusHistory;
use App\Models\Plant;
use App\Models\Product;
use App\Models\Vehicle;
use App\Models\Wholesaler;
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
     * Reutiliza el vehículo por placa; si no existe lo crea con el tipo pedido.
     * Si la placa ya existe con otro tipo, se rechaza (validación por campo).
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

        $existing = Vehicle::where('license_plate', $licensePlate)->first();

        if ($existing) {
            if ($existing->type !== $type) {
                $label = $existing->type === Vehicle::TYPE_TANKER ? 'tanker' : 'tractor';

                throw ValidationException::withMessages([
                    $field => __('order.plate_type_conflict', [
                        'plate' => $licensePlate,
                        'type' => __('order.'.$label),
                    ]),
                ]);
            }

            return $existing;
        }

        return Vehicle::create([
            'license_plate' => $licensePlate,
            'type' => $type,
            'is_active' => 1,
        ]);
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
     */
    public function totals(Order $order): array
    {
        $totalGallons = round($order->details->sum('gallons'), 2);
        $totalSale = round($order->details->sum(fn ($detail) => (float) $detail->gallons * (float) $detail->sale_price), 2);

        return [
            'total_gallons' => $totalGallons,
            'total_sale' => $totalSale,
            'details' => $order->details->count(),
        ];
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