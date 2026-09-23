<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\LogicalDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    use Auditable, BelongsToTenant, LogicalDelete;

    protected $fillable = [
        'tenant_id',
        'license_plate',
        'type',
        'is_active',
    ];

    protected $casts = [
        'type' => 'string',
        'is_active' => 'boolean',
    ];

    public const TYPE_TANKER = 'TANKER';

    public const TYPE_TRACTOR = 'TRACTOR';

    public function tankerOrders(): HasMany
    {
        return $this->hasMany(Order::class, 'tanker_id');
    }

    public function tractorOrders(): HasMany
    {
        return $this->hasMany(Order::class, 'tractor_id');
    }
}