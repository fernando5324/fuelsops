<?php

namespace App\Http\Controllers\Platform\Plants;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\Concerns\HasCrudActions;
use App\Models\Plant;
use Illuminate\Database\Eloquent\Model;

class PlantApiController extends Controller
{
    use HasCrudActions;

    protected string $model = Plant::class;

    protected function rules(?Model $entity = null): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}