<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\LogicalDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderDetail extends Model
{
    use Auditable, BelongsToTenant, LogicalDelete;

    protected $fillable = [
        'tenant_id',
        'order_id',
        'scop',
        'plant_id',
        'wholesaler_id',
        'product_id',
        'gallons',
        'sale_price',
        'compartments',
    ];

    protected $casts = [
        'gallons' => 'decimal:2',
        'sale_price' => 'decimal:4',
        'compartments' => 'integer',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function plant(): BelongsTo
    {
        return $this->belongsTo(Plant::class, 'plant_id');
    }

    public function wholesaler(): BelongsTo
    {
        return $this->belongsTo(Wholesaler::class, 'wholesaler_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /** detail_total = gallons * sale_price (regla provisional, ADR-001) */
    public function getDetailTotalAttribute(): float
    {
        return round((float) $this->gallons * (float) $this->sale_price, 2);
    }
}