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
use Illuminate\Validation\Rule;
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

    /**
     * Consulta aditiva para el formulario público: dado un número de licencia,
     * devuelve el chofer registrado (si existe y está activo) para
     * autocompletar el nombre. Limitada por throttle en la ruta.
     */
    public function lookupDriver(Request $request): JsonResponse
    {
        $data = $request->validate([
            'license_number' => ['required', 'string', 'max:50'],
        ]);

        $driver = Driver::query()
            ->where('license_number', trim($data['license_number']))
            ->where('is_active', 1)
            ->first(['id', 'name']);

        return response()->json([
            'found' => (bool) $driver,
            'id' => $driver?->id,
            'name' => $driver?->name,
        ]);
    }

    /**
     * Consulta aditiva para el formulario público: dado una placa y un tipo,
     * devuelve el vehículo registrado (si existe y está activo) para
     * confirmar el campo. Limitada por throttle en la ruta.
     */
    public function lookupVehicle(Request $request): JsonResponse
    {
        $data = $request->validate([
            'license_plate' => ['required', 'string', 'max:20'],
            'type' => ['required', Rule::in([Vehicle::TYPE_TANKER, Vehicle::TYPE_TRACTOR])],
        ]);

        $vehicle = Vehicle::query()
            ->where('license_plate', strtoupper(trim($data['license_plate'])))
            ->where('type', $data['type'])
            ->where('is_active', 1)
            ->first(['id', 'license_plate']);

        return response()->json([
            'found' => (bool) $vehicle,
            'id' => $vehicle?->id,
        ]);
    }

    public function confirmed(Order $order, OrderService $orders)
    {
        // Todo lo que la página de confirmación muestra debe venir cargado:
        // sin eager loading las relaciones llegan como null y el front las
        // pinta como "-" o vacías (asesor, conductor, vehículos, planta /
        // mayorista / producto del detalle, compartimentos y adjuntos).
        $order->load([
            'advisor',
            'customer',
            'driver',
            'tanker',
            'tractor',
            'status',
            'details.plant',
            'details.wholesaler',
            'details.product',
            'compartments.product',
            'files',
        ]);

        return Inertia::render('Public/Orders/Confirmed', [
            'order' => $order,
            'totals' => $orders->totals($order),
        ]);
    }
}