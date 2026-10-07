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
use App\Models\VehicleCompartment;
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
        ]);
    }

    public function store(PublicOrderStoreRequest $request, OrderService $orders)
    {
        // `source = 'public'`: este pedido lo pidió el cliente desde el formulario
        // web, aunque la petición llegue con sesión (p. ej. si un usuario del
        // panel lo rellena por teléfono). `created_by` conserva quién lo envió
        // (ADR-025).
        $order = $orders->create($request->validated(), 'public');

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
     * Consulta aditiva para el formulario público: dada la placa de una
     * CISTERNA, devuelve la unidad registrada con la placa de tracto que tiene
     * hoy y la plantilla de sus cámaras (ADR-023), para que el formulario
     * complete solo esos datos. Limitada por throttle en la ruta.
     *
     * Ya no se manda `type`: la cisterna es la única entidad de `vehicles`.
     */
    public function lookupVehicle(Request $request): JsonResponse
    {
        $data = $request->validate([
            'license_plate' => ['required', 'string', 'max:20'],
        ]);

        $vehicle = Vehicle::query()
            ->where('license_plate', strtoupper(trim($data['license_plate'])))
            ->where('is_active', 1)
            ->first(['id', 'license_plate', 'tractor_plate']);

        $compartments = $vehicle
            ? VehicleCompartment::where('vehicle_id', $vehicle->id)
                ->orderBy('compartment_number')
                ->get(['compartment_number', 'scop', 'volume'])
                ->map(fn (VehicleCompartment $compartment) => [
                    'compartment_number' => (int) $compartment->compartment_number,
                    'scop' => $compartment->scop,
                    'volume' => (string) $compartment->volume,
                ])
                ->all()
            : [];

        return response()->json([
            'found' => (bool) $vehicle,
            'id' => $vehicle?->id,
            'tractor_plate' => $vehicle?->tractor_plate,
            'compartments' => $compartments,
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