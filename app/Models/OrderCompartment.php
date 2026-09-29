<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\LogicalDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Distribución por compartimentos de un pedido (ADR-015).
 *
 * Una fila = un compartimento de la cisterna: qué producto carga, de qué línea
 * del detalle (`scop`) viene y cuántos galones ocupan. El producto y el SCOP
 * SIEMPRE provienen de una línea de `order_details` del mismo pedido (lo
 * garantiza la validación del request), por eso se guardan desnormalizados en
 * lugar de una FK a order_details: la edición del pedido en el panel da de baja
 * y recrea los detalles, y una FK quedaría apuntando a filas borradas
 * lógicamente.
 *
 * `compartment_number` es la numeración 1..N que ve el usuario. El número de
 * compartimentos no se persiste: es la cantidad de filas del pedido.
 *
 * Dato histórico del pedido: la papelera (ADR-011) no lo toca, por eso la FK a
 * orders es RESTRICT y el borrado es lógico (is_deleted).
 */
class OrderCompartment extends Model
{
    use Auditable, BelongsToTenant, LogicalDelete;

    protected $fillable = [
        'tenant_id',
        'order_id',
        'compartment_number',
        'product_id',
        'scop',
        'volume',
    ];

    protected $casts = [
        'compartment_number' => 'integer',
        'volume' => 'decimal:2',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
