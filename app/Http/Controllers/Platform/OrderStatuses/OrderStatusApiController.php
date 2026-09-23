<?php

namespace App\Http\Controllers\Platform\OrderStatuses;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\Concerns\HasCrudActions;
use App\Models\OrderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class OrderStatusApiController extends Controller
{
    use HasCrudActions;

    protected string $model = OrderStatus::class;

    protected function rules(?Model $entity = null): array
    {
        return [
            'code' => ['required', 'string', 'max:50', Rule::unique('order_statuses', 'code')->ignore($entity?->id)],
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:20'],
            'is_default' => ['nullable', 'boolean'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    protected function prepareForCreate(array $data): array
    {
        $data['is_default'] = (bool) ($data['is_default'] ?? false);

        return $data;
    }

    protected function prepareForUpdate(Model $entity, array $data): array
    {
        $data['is_default'] = (bool) ($data['is_default'] ?? false);

        return $data;
    }
}