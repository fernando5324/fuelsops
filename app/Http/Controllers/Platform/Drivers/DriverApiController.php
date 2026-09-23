<?php

namespace App\Http\Controllers\Platform\Drivers;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\Concerns\HasCrudActions;
use App\Models\Driver;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class DriverApiController extends Controller
{
    use HasCrudActions;

    protected string $model = Driver::class;

    protected function logicalDelete(): bool
    {
        return true;
    }

    protected function rules(?Model $entity = null): array
    {
        return [
            'license_number' => ['required', 'string', 'max:50', Rule::unique('drivers', 'license_number')->ignore($entity?->id)],
            'name' => ['required', 'string', 'max:200'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}