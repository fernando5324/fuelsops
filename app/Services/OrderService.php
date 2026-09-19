<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\OrderStatus;
use App\Models\OrderStatusHistory;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
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

        $order = DB::transaction(function () use ($data, $customer) {
            $order = Order::create([
                'order_date' => $data['order_date'] ?? now()->toDateString(),
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

    private function actorId(): int
    {
        return auth()->id() ?? (int) config('sertoco.system_user_id', 999999);
    }
}