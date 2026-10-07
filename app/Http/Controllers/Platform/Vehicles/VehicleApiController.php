<?php

namespace App\Http\Controllers\Platform\Vehicles;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveVehicleCompartmentsRequest;
use App\Models\Vehicle;
use App\Services\TenantContext;
use App\Services\VehicleCompartmentService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * APIs del módulo de vehículos (ADR-003): CRUD del catálogo y editor de
 * compartimentos por cisterna (ADR-023).
 *
 * Controlador autocontenido: store/update/destroy declarados explícitamente,
 * sin el trait HasCrudActions. El route-model binding implícito
 * (`Vehicle $vehicle`) ya aísla la organización y las bajas lógicas a través
 * de los global scopes de `BelongsToTenant`/`LogicalDelete`: un vehículo de
 * otra org o dado de baja responde 404.
 */
class VehicleApiController extends Controller
{
    /**
     * Una cisterna con sus dos placas (ADR-023). La unicidad es por
     * `license_plate` dentro de la organización (mismo índice que la BD), y se
     * consulta con Rule::unique (sin global scopes), así que también bloquea
     * una placa que quedo dada de baja: la placa de una cisterna no se recicla
     * porque los pedidos históricos la guardan.
     */
    protected function rules(?Model $entity = null): array
    {
        return [
            'license_plate' => [
                'required',
                'string',
                'max:20',
                Rule::unique('vehicles', 'license_plate')
                    ->ignore($entity?->id)
                    ->where(fn ($query) => $query->where('tenant_id', TenantContext::id())),
            ],
            'tractor_plate' => ['nullable', 'string', 'max:20'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules(null));

        try {
            Vehicle::create($data);
        } catch (QueryException $e) {
            return back()->withErrors(['duplicate' => __('catalogs.duplicate')]);
        }

        return back()->with('flash', ['success' => __('catalogs.created')]);
    }

    public function update(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $data = $request->validate($this->rules($vehicle));

        try {
            $vehicle->update($data);
        } catch (QueryException $e) {
            return back()->withErrors(['duplicate' => __('catalogs.duplicate')]);
        }

        return back()->with('flash', ['success' => __('catalogs.updated')]);
    }

    public function destroy(Request $request, Vehicle $vehicle): RedirectResponse
    {
        try {
            $vehicle->delete();
        } catch (QueryException $e) {
            return back()->withErrors(['duplicate' => __('catalogs.delete_blocked')]);
        }

        return back()->with('flash', ['success' => __('catalogs.deleted')]);
    }

    /**
     * Compartimentos de la cisterna (plantilla `vehicle_compartments`,
     * ADR-023) para el editor del panel. El binding por modelo ya aísla la
     * organización: una cisterna de otra org o dada de baja da 404.
     */
    public function compartments(Vehicle $vehicle, VehicleCompartmentService $service): JsonResponse
    {
        return response()->json(['compartments' => $service->forVehicle($vehicle)]);
    }

    /**
     * Reemplaza el set de compartimentos de la cisterna (baja lógica de los
     * que sobran, update por numeración y alta de los que falten) y devuelve
     * la lista reconciliada para mantener el editor sincronizado.
     */
    public function saveCompartments(
        Vehicle $vehicle,
        SaveVehicleCompartmentsRequest $request,
        VehicleCompartmentService $service
    ): JsonResponse {
        $service->save($vehicle, $request->validated('compartments') ?? []);

        return response()->json([
            'message' => __('catalogs.compartments_saved'),
            'compartments' => $service->forVehicle($vehicle),
        ]);
    }
}