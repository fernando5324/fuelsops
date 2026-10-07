<?php

namespace App\Http\Controllers\Platform\Orders;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderRequest;
use App\Models\Advisor;
use App\Models\Order;
use App\Models\Plant;
use App\Models\Product;
use App\Models\Wholesaler;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function index(Request $request, OrderService $orders)
    {
        $query = Order::query()
            ->with(['customer', 'advisor', 'driver', 'tanker', 'status'])
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
                    // CÃ³digo operativo del pedido (ADR-020): es lo que el
                    // usuario ve y escribe al buscar.
                    ->where('code', 'like', "%{$q}%")
                    ->orWhere('notes', 'like', "%{$q}%")
                    ->orWhereHas('customer', fn ($customer) => $customer
                        ->where('name', 'like', "%{$q}%")
                        ->orWhere('tax_id', 'like', "%{$q}%"))
                    ->orWhereHas('driver', fn ($driver) => $driver
                        ->where('name', 'like', "%{$q}%"))
                    // El tracto ya no es una entidad (ADR-023): se busca por su snapshot
                    // de la columna `tractor_plate` del propio pedido.
                    ->orWhere('tractor_plate', 'like', "%{$q}%")
                    ->orWhereHas('tanker', fn ($vehicle) => $vehicle
                        ->where('license_plate', 'like', "%{$q}%")
                        ->orWhere('tractor_plate', 'like', "%{$q}%"));
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

/**
     * ALTA MANUAL de un pedido (ADR-025). Reutiliza el formulario de edición
     * (`Platform/Orders/Edit`) en modo alta: mismo formulario, sin pedido que
     * editar y sin campo `code` (lo genera la secuencia por organización).
     */
    public function create()
    {
        return Inertia::render('Platform/Orders/Edit', [
            'order' => null,
            'advisors' => Advisor::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
            'plants' => Plant::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
            'wholesalers' => Wholesaler::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
            'products' => Product::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Guarda el pedido del alta manual y pasa al modo consulta.
     *
     * El origen se fija aquí (`panel`) y NO se deduce de la petición: un pedido
     * del formulario web sigue siendo `public` aunque lo envíe un usuario del
     * panel. `created_by` lo asigna el trait Auditable con el usuario
     * autenticado (ADR-025).
     */
    public function store(StoreOrderRequest $request, OrderService $orders)
    {
        $order = $orders->create($request->validated(), 'panel');

        return redirect()->route('pedidos.show', $order->id)
            ->with('flash', ['success' => __('order.created_ok')]);
    }

    public function show(Order $order, OrderService $orders)
    {
        $order->load([
            'customer',
            'advisor',
            'driver',
            'tanker',
                        'status',
            'details.plant',
            'details.wholesaler',
            'details.product',
            'files',
            'deposits.createdBy:id,name',
            'compartments.product',
            'statusHistory.status',
            'statusHistory.previousStatus',
            'statusHistory.createdBy:id,name',
            // Auditoría del pedido (ADR-025): quién lo registró y quién hizo la
            // última modificación. `updated_by` es NULL si nunca se editó.
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);

        // Precios de compra, mÃ¡rgenes de la relaciÃ³n y monto margen Ã— galones
        // por detalle (ADR-010 Â§35 / ADR-013): atributos no persistidos.
        $orders->attachPricing($order);

        return Inertia::render('Platform/Orders/Show', [
            'order' => $order,
            'totals' => $orders->totals($order),
            'supplier_payables' => $orders->supplierPayables($order),
            'statuses' => $orders->statuses(),
        ]);
    }

    /**
     * Formulario de ediciÃ³n del pedido (docs/06_Design/order-detail.md, Fase B).
     * Modo ediciÃ³n = variante del modo consulta (mismos datos).
     */
    public function edit(Order $order)
    {
        $order->load([
            'customer',
            'advisor',
            'driver',
            'tanker',
                        'status',
            'details.plant',
            'details.wholesaler',
            'details.product',
            'files',
            'compartments.product',
        ]);

        return Inertia::render('Platform/Orders/Edit', [
            'order' => $order,
            'advisors' => Advisor::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
            'plants' => Plant::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
            'wholesalers' => Wholesaler::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
            'products' => Product::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Guarda los cambios del pedido y regresa al modo consulta.
     */
    public function update(Order $order, UpdateOrderRequest $request, OrderService $orders)
    {
        $orders->update($order, $request->validated());

        return redirect()->route('pedidos.show', $order->id)
            ->with('flash', ['success' => __('order.updated_ok')]);
    }
}