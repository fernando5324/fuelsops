<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\LogicalDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Order extends Model
{
    use Auditable, LogicalDelete;

    protected $fillable = [
        'order_date',
        'status_id',
        'advisor_id',
        'customer_id',
        'driver_id',
        'tanker_id',
        'tractor_id',
        'notes',
    ];

    protected $casts = [
        'order_date' => 'datetime',
    ];

    public function status(): BelongsTo
    {
        return $this->belongsTo(OrderStatus::class, 'status_id');
    }

    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Advisor::class, 'advisor_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'driver_id');
    }

    public function tanker(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'tanker_id');
    }

    public function tractor(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'tractor_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(OrderDetail::class, 'order_id');
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class, 'order_id')
            ->orderByDesc('id');
    }

    public function files(): MorphMany
    {
        return $this->morphMany(MediaFile::class, 'model');
    }

    public function getTotalGallonsAttribute(): float
    {
        return round($this->details->sum('gallons'), 2);
    }

    public function getTotalSaleAttribute(): float
    {
        return round($this->details->sum(fn ($detail) => $detail->gallons * $detail->sale_price), 2);
    }
}