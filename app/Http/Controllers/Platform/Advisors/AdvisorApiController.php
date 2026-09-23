<?php

namespace App\Http\Controllers\Platform\Advisors;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\Concerns\HasCrudActions;
use App\Models\Advisor;
use Illuminate\Database\Eloquent\Model;

class AdvisorApiController extends Controller
{
    use HasCrudActions;

    protected string $model = Advisor::class;

    protected function rules(?Model $entity = null): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}