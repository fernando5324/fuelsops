<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\LogicalDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Order extends Model
{
    use Auditable, BelongsToTenant, LogicalDelete;

    protected $fillable = [
        'tenant_id',
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

    /**
     * Depósitos del cliente registrados manualmente desde los vouchers
     * adjuntos (ADR-013). Se listan del más reciente al más antiguo y el total
     * se calcula en pantalla.
     */
    public function deposits(): HasMany
    {
        return $this->hasMany(OrderDeposit::class, 'order_id')
            ->orderByDesc('deposit_date')
            ->orderByDesc('id');
    }

    /**
     * Distribución por compartimentos de la cisterna (ADR-015). Se ordena por
     * su numeración 1..N; la cantidad de compartimentos es la cantidad de
     * filas (no se persiste en orders).
     */
    public function compartments(): HasMany
    {
        return $this->hasMany(OrderCompartment::class, 'order_id')
            ->orderBy('compartment_number')
            ->orderBy('id');
    }

    public function files(): MorphMany
    {
        return $this->morphMany(MediaFile::class, 'model');
    }

    public function deletions(): HasMany
    {
        return $this->hasMany(OrderDeletion::class, 'order_id')
            ->orderByDesc('id');
    }

    /**
     * Eliminación activa (sin restaurar) del pedido, si existe. Un pedido
     * activo SIEMPRE tiene una (restored_at IS NULL); al restaurar debe
     * resolverse y cerrarse aquí.
     */
    public function currentDeletion(): ?OrderDeletion
    {
        return $this->deletions()
            ->whereNull('restored_at')
            ->with('deletedBy:id,name')
            ->first();
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