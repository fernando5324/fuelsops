<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\LogicalDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Driver extends Model
{
    use Auditable, LogicalDelete;

    protected $fillable = [
        'license_number',
        'name',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'driver_id');
    }
}