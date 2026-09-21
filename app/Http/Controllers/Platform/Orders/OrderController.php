<?php

namespace App\Http\Controllers\Platform\Orders;

use App\Http\Controllers\Controller;
use App\Models\Advisor;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function index(Request $request, OrderService $orders)
    {
        $query = Order::query()
            ->with(['customer', 'advisor', 'driver', 'tanker', 'tractor', 'status'])
            ->withSum('details as total_gallons', 'gallons')
            ->withSum('details as total_sale', DB::raw('gallons * sale_price'))
            ->latest('order_date')
            ->latest('id');

        $filter = $request->only([
            'q',
            'status_id',
            'order_date',
            'date_from',
            'date_to',
            'advisor_id',
        ]);

        if ($q = trim((string) ($filter['q'] ?? ''))) {
            $query->where(function ($builder) use ($q) {
                $builder
                    ->where('notes', 'like', "%{$q}%")
                    ->orWhereHas('customer', fn ($customer) => $customer
                        ->where('name', 'like', "%{$q}%")
                        ->orWhere('tax_id', 'like', "%{$q}%"))
                    ->orWhereHas('driver', fn ($driver) => $driver
                        ->where('name', 'like', "%{$q}%"))
                    ->orWhereHas('tanker', fn ($vehicle) => $vehicle
                        ->where('license_plate', 'like', "%{$q}%"))
                    ->orWhereHas('tractor', fn ($vehicle) => $vehicle
                        ->where('license_plate', 'like', "%{$q}%"));
            });
        }

        if (! empty($filter['status_id'])) {
            $query->where('status_id', $filter['status_id']);
        }

        if (! empty($filter['order_date'])) {
            $query->whereDate('order_date', $filter['order_date']);
        }

        if (! empty($filter['date_from'])) {
            $query->whereDate('order_date', '>=', $filter['date_from']);
        }

        if (! empty($filter['date_to'])) {
            $query->whereDate('order_date', '<=', $filter['date_to']);
        }

        if (! empty($filter['advisor_id'])) {
            $query->where('advisor_id', $filter['advisor_id']);
        }

        return Inertia::render('Platform/Orders/Index', [
            'orders' => $query->paginate(15)->withQueryString(),
            'filter' => $filter,
            'statuses' => $orders->statuses(),
            'advisors' => Advisor::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
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