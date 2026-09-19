<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(OrderService $orders)
    {
        $grouped = Order::query()
            ->selectRaw('status_id, COUNT(*) as total')
            ->groupBy('status_id')
            ->pluck('total', 'status_id');

        return Inertia::render('Platform/Dashboard', [
            'statuses' => $orders->statuses(),
            'counts' => $grouped,
            'total_orders' => Order::query()->count(),
            'recent' => Order::query()
                ->with(['customer', 'advisor', 'status'])
                ->latest('id')
                ->limit(5)
                ->get(),
        ]);
    }
}