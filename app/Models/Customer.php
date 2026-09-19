<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\LogicalDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use Auditable, LogicalDelete;

    protected $fillable = [
        'tax_id',
        'name',
        'preferred_wholesaler_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function preferredWholesaler(): BelongsTo
    {
        return $this->belongsTo(Wholesaler::class, 'preferred_wholesaler_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'customer_id');
    }
}