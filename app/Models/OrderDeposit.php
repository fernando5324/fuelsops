<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\LogicalDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Depósito del cliente de un pedido (ADR-013).
 *
 * Se registra manualmente con los datos leídos del voucher adjunto: banco,
 * número de operación, fecha y monto. Un pedido tiene N depósitos y el total se
 * calcula en pantalla (SUM(amount)); no se almacena.
 *
 * Es un dato histórico del pedido: la papelera (ADR-011) no lo toca, por eso la
 * FK a orders es RESTRICT. El borrado de un depósito es lógico (is_deleted) y
 * lo puede hacer cualquier usuario del panel (no es una acción destructiva de
 * negocio, a diferencia de eliminar la relación de precios, que es del dueño).
 */
class OrderDeposit extends Model
{
    use Auditable, BelongsToTenant, LogicalDelete;

    protected $fillable = [
        'tenant_id',
        'order_id',
        'deposit_date',
        'bank',
        'operation_number',
        'amount',
    ];

    protected $casts = [
        'deposit_date' => 'date:Y-m-d',
        'amount' => 'decimal:4',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
