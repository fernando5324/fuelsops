<?php

namespace App\Http\Controllers\Platform\Orders;

use App\Http\Controllers\Controller;
use App\Http\Requests\OrderChangeStatusRequest;
use App\Http\Requests\TrashOrderRequest;
use App\Models\Order;
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