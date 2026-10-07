<?php

namespace App\Http\Controllers\Platform\Orders;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Papelera de pedidos (ADR-011).
 *
 * Consulta únicamente pedidos eliminados (orders.is_deleted = 1). El listado
 * y el detalle son accesibles por cualquier usuario autenticado; las acciones
 * de enviar a papelera / restaurar están restringidas a is_owner y viven en
 * OrderApiController.
 */
class TrashController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::onlyDeleted()
            ->with(['customer', 'status'])
            ->with(['deletions' => function ($builder) {
                $builder
                    ->whereNull('restored_at')
                    ->with('deletedBy:id,name')
                    ->latest('id');
            }])
            ->withSum('details as total_gallons', 'gallons')
            ->withSum('details as total_sale', DB::raw('gallons * sale_price'))
            ->latest('id');

        $filter = $request->only(['q']);
        if ($q = trim((string) ($filter['q'] ?? ''))) {
            $query->where(function ($builder) use ($q) {
                if (ctype_digit($q)) {
                    $builder->orWhere('id', (int) $q);
                }

                // Código operativo del pedido (ADR-020). Un pedido en papelera
                // conserva su código (el índice único no mira `is_deleted`), así
                // que se puede localizar por él igual que por id.
                $builder->orWhere('code', 'like', "%{$q}%");

                $builder->orWhereHas('customer', fn ($customer) => $customer
                    ->where('name', 'like', "%{$q}%")
                    ->orWhere('tax_id', 'like', "%{$q}%"));
            });
        }

        return Inertia::render('Platform/Orders/Trash', [
            'orders' => $query->paginate(15)->withQueryString(),
            'filter' => $filter,
        ]);
    }

    public function show(int $order, OrderService $orders)
    {
        // Resolución manual (sin route-model binding): el scope global
        // excluiría a los eliminados. onlyDeleted() conserva el aislamiento
        // por tenant (otra organización → 404).
        $order = Order::onlyDeleted()
            ->with([
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
                'createdBy:id,name',
                'updatedBy:id,name',
            ])
            ->findOrFail((int) $order);

        // La ficha en papelera se lee igual que la activa (precios, márgenes,
        // depósitos y distribución por compartimentos se conservan:
        // ADR-011 §9/§12/§21); lo único que no se permite es escribir sobre ella.
        $orders->attachPricing($order);

        return Inertia::render('Platform/Orders/Show', [
            'order' => $order,
            'totals' => $orders->totals($order),
            'supplier_payables' => $orders->supplierPayables($order),
            'statuses' => $orders->statuses(),
            'trash' => [
                'deletion' => $order->currentDeletion(),
            ],
        ]);
    }
}