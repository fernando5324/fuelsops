<?php

namespace App\Http\Controllers\Platform\Orders;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function index(Request $request, OrderService $orders)
    {
        $query = Order::query()
            ->with(['customer', 'advisor', 'driver', 'status'])
            ->latest('order_date')
            ->latest('id');

        $filter = $request->only(['q', 'status_id', 'order_date']);

        if ($q = trim((string) ($filter['q'] ?? ''))) {
            $query->where(function ($builder) use ($q) {
                $builder
                    ->where('notes', 'like', "%{$q}%")
                    ->orWhereHas('customer', fn ($customer) => $customer
                        ->where('name', 'like', "%{$q}%")
                        ->orWhere('tax_id', 'like', "%{$q}%"));
            });
        }

        if (! empty($filter['status_id'])) {
            $query->where('status_id', $filter['status_id']);
        }

        if (! empty($filter['order_date'])) {
            $query->whereDate('order_date', $filter['order_date']);
        }

        return Inertia::render('Platform/Orders/Index', [
            'orders' => $query->paginate(15)->withQueryString(),
            'filter' => $filter,
            'statuses' => $orders->statuses(),
        ]);
    }

    public function show(Order $order, OrderService $orders)
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

        return Inertia::render('Platform/Orders/Show', [
            'order' => $order,
            'totals' => $orders->totals($order),
            'statuses' => $orders->statuses(),
        ]);
    }
}