<?php

namespace App\Http\Controllers\Platform\Vehicles;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Página dedicada del módulo de vehículos (ADR-023).
 *
 * Controlador autocontenido: no compone los traits de Concerns (primera
 * migración hacia módulos que declaran su propio `index()`). La búsqueda
 * cubre las dos placas (el usuario recuerda cualquiera de las dos) y el
 * listado pagina server-side, igual que los catálogos.
 */
class VehicleController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Vehicle::query();

        $q = trim((string) $request->query('q', ''));

        if ($q !== '') {
            $query->where(function ($builder) use ($q) {
                $builder->where('license_plate', 'like', "%{$q}%")
                    ->orWhere('tractor_plate', 'like', "%{$q}%");
            });
        }

        $filter = ['q' => $q];

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->query('is_active'));
            $filter['is_active'] = $request->query('is_active');
        }

        $rows = $query->latest('id')->paginate(15)->withQueryString();

        return Inertia::render('Platform/Vehicles/Index', [
            'config' => [
                'resource' => 'vehicles',
                'url' => '/catalogos/vehiculos',
                'title' => __('menus.vehicles'),
                'fields' => [
                    ['key' => 'license_plate', 'label' => 'catalogs.license_plate', 'type' => 'text', 'required' => true],
                    ['key' => 'tractor_plate', 'label' => 'catalogs.tractor_plate', 'type' => 'text'],
                    ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean', 'required' => true],
                ],
                'filters' => [
                    ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean'],
                ],
                'options' => [],
                'showAudit' => true,
            ],
            'rows' => $rows,
            'filter' => $filter,
        ]);
    }
}