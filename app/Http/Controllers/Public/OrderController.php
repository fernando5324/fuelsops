<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\PublicOrderStoreRequest;
use App\Models\Advisor;
use App\Models\Driver;
use App\Models\Order;
use App\Models\Plant;
use App\Models\Product;
use App\Models\Vehicle;
use App\Models\Wholesaler;
use App\Services\OrderService;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function create(OrderService $orders)
    {
        return Inertia::render('Public/Orders/Create', [
            'advisors' => Advisor::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
            'plants' => Plant::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
            'wholesalers' => Wholesaler::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
            'products' => Product::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
            'drivers' => Driver::where('is_active', 1)->orderBy('name')->get(['id', 'name', 'license_number']),
            'vehicles' => Vehicle::where('is_active', 1)->orderBy('license_plate')->get(['id', 'license_plate', 'type']),
        ]);
    }

    public function store(PublicOrderStoreRequest $request, OrderService $orders)
    {
        $order = $orders->create($request->validated());

        return redirect()->route('pedidos.confirmado', $order->id)
            ->with('flash', ['success' => __('order.registration_success')]);
    }

    public function confirmed(Order $order, OrderService $orders)
    {
        $order->load(['customer', 'details', 'status']);

        return Inertia::render('Public/Orders/Confirmed', [
            'order' => $order,
            'totals' => $orders->totals($order),
        ]);
    }
}