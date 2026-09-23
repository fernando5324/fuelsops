<?php

namespace App\Http\Controllers\Platform\Wholesalers;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\Concerns\HasCrudActions;
use App\Models\Wholesaler;
use Illuminate\Database\Eloquent\Model;

class WholesalerApiController extends Controller
{
    use HasCrudActions;

    protected string $model = Wholesaler::class;

    protected function rules(?Model $entity = null): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}