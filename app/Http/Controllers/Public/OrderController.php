<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\PublicOrderStoreRequest;
use App\Models\Advisor;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\Order;
use App\Models\Plant;
use App\Models\Product;
use App\Models\Vehicle;
use App\Models\Wholesaler;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

    /**
     * Consulta aditiva para el formulario público: dado un RUC, devuelve el
     * nombre del cliente registrado (si existe y está activo) para
     * autocompletar el campo. Limitada por throttle en la ruta.
     */
    public function lookupCustomer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tax_id' => ['required', 'string', 'max:20'],
        ]);

        $customer = Customer::query()
            ->where('tax_id', trim($data['tax_id']))
            ->where('is_active', 1)
            ->first(['name']);

        return response()->json([
            'found' => (bool) $customer,
            'name' => $customer?->name,
        ]);
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