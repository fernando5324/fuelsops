<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plant extends Model
{
    use Auditable;

    protected $fillable = ['name', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function orderDetails(): HasMany
    {
        return $this->hasMany(OrderDetail::class, 'plant_id');
    }
}