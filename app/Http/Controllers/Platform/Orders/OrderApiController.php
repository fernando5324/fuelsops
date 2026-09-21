<?php

namespace App\Http\Controllers\Platform\Orders;

use App\Http\Controllers\Controller;
use App\Http\Requests\OrderChangeStatusRequest;
use App\Models\Order;
use App\Services\OrderService;

class OrderApiController extends Controller
{
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