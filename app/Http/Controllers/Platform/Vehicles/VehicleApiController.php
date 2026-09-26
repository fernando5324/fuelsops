<?php

namespace App\Http\Controllers\Platform\Vehicles;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\Concerns\HasCrudActions;
use App\Models\Vehicle;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class VehicleApiController extends Controller
{
    use HasCrudActions;

    protected string $model = Vehicle::class;

    protected function logicalDelete(): bool
    {
        return true;
    }

    protected function rules(?Model $entity = null): array
    {
        $type = request('type') ?? $entity?->type;

        return [
            'license_plate' => [
                'required',
                'string',
                'max:20',
                Rule::unique('vehicles', 'license_plate')
                    ->ignore($entity?->id)
                    ->where(fn ($query) => $query
                        ->where('type', $type)
                        ->where('tenant_id', TenantContext::id())),
            ],
            'type' => ['required', Rule::in([Vehicle::TYPE_TANKER, Vehicle::TYPE_TRACTOR])],
            'is_active' => ['required', 'boolean'],
        ];
    }
}