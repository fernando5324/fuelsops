<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderStatusHistory extends Model
{
    use Auditable;

    protected $table = 'order_status_history';

    protected $fillable = [
        'order_id',
        'status_id',
        'previous_status_id',
        'notes',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function status(): BelongsTo
    {
        return $this->belongsTo(OrderStatus::class, 'status_id');
    }

    public function previousStatus(): BelongsTo
    {
        return $this->belongsTo(OrderStatus::class, 'previous_status_id');
    }
}