<?php

namespace App\Http\Controllers\Platform\Orders;

use App\Http\Controllers\Controller;
use App\Http\Requests\OrderChangeStatusRequest;
use App\Http\Requests\StoreOrderDepositRequest;
use App\Http\Requests\TrashOrderRequest;
use App\Models\Order;
use App\Models\OrderDeposit;
use App\Services\OrderService;

class OrderApiController extends Controller
{
    /**
     * Envía un pedido a la papelera (ADR-011 §6). Solo el dueño (is_owner).
     * El binding de {order} usa el scope global, por lo que un pedido ya
     * eliminado da 404 (no se puede enviar dos veces).
     */
    public function trash(Order $order, TrashOrderRequest $request, OrderService $orders)
    {
        abort_unless((bool) auth()->user()?->is_owner, 403);

        $orders->sendToTrash($order, $request->validated('reason'));

        return redirect()->route('pedidos.papelera.index')
            ->with('flash', ['success' => __('order.sent_to_trash')]);
    }

    /**
     * Restaura un pedido desde la papelera (ADR-011 §18). Solo el dueño
     * (is_owner). El id se resuelve manualmente porque el binding estándar
     * excluiría a los pedidos eliminados; onlyDeleted() mantiene el tenant.
     */
    public function restore(int $order, OrderService $orders)
    {
        abort_unless((bool) auth()->user()?->is_owner, 403);

        $order = Order::onlyDeleted()->findOrFail((int) $order);

        $orders->restoreFromTrash($order);

        return redirect()->route('pedidos.papelera.index')
            ->with('flash', ['success' => __('order.restored_ok')]);
    }
    public function changeStatus(Order $order, OrderChangeStatusRequest $request, OrderService $orders)
    {
        $orders->changeStatus(
            $order,
            (int) $request->validated('status_id'),
            $request->validated('notes', null),
        );

        return redirect()->route('pedidos.show', $order->id)
            ->with('flash', ['success' => __('order.change_status_ok')]);
    }

    /**
     * Registra un depósito del cliente leído de un voucher adjunto (ADR-013).
     * El alta es manual (no hay OCR) y no es una acción de dueño: la registra
     * cualquier usuario del panel, igual que el cambio de estado.
     *
     * Un pedido en la papelera ya no es resoluble por el binding (el scope
     * global de `LogicalDelete` lo esconde → 404, igual que el resto de la API
     * de pedidos); el `abort_if` queda como red de seguridad si algún día el
     * binding llegara con `withTrashed`.
     */
    public function storeDeposit(Order $order, StoreOrderDepositRequest $request, OrderService $orders)
    {
        abort_if((int) $order->is_deleted === 1, 409, __('order.deposit_order_in_trash'));

        $orders->storeDeposit($order, $request->validated());

        return redirect()->route('pedidos.show', $order->id)
            ->with('flash', ['success' => __('order.deposit_added_ok')]);
    }

    /**
     * Baja lógica de un depósito (ADR-013): la fila queda con is_deleted = 1
     * y sale del cuadro de depósitos, sin tocar el voucher adjunto. El id se
     * resuelve dentro del pedido y con el scope del tenant, por lo que un
     * depósito de otro pedido, de otra organización o ya dado de baja da 404.
     */    public function destroyDeposit(Order $order, int $deposit, OrderService $orders)
    {
        abort_if((int) $order->is_deleted === 1, 409, __('order.deposit_order_in_trash'));

        $model = OrderDeposit::where('order_id', $order->id)->findOrFail($deposit);

        $model->delete();

        return redirect()->route('pedidos.show', $order->id)
            ->with('flash', ['success' => __('order.deposit_deleted_ok')]);
    }

    /**
     * Detalle completo en JSON (ADR-006: ficha de inspección del Drawer).
     */
    public function detail(Order $order, OrderService $orders)
    {
        $order->load([
            'customer',
            'advisor',
            'driver',
            'tanker',
            'tractor',
            'status',
            'details.plant',
            'details.wholesaler',
            'details.product',
            'files',
            'statusHistory.status',
            'statusHistory.previousStatus',
            'createdBy:id,name',
        ]);

        return response()->json([
            'order' => $order,
            'totals' => $orders->totals($order),
        ]);
    }
}