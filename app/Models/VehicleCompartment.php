<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\LogicalDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Plantilla de cámaras de una cisterna (ADR-023).
 *
 * Es MAESTRA del vehículo, no del pedido: describe cómo es la cisterna (cuántas
 * cámaras tiene y qué volumen —Volumen Gas— maneja cada una). Lo que se cargó en
 * cada cámara un día dado vive en `order_compartments` (ADR-015).
 *
 * De esta tabla sale el autocompletado del formulario público: al escribir la
 * placa de una cisterna ya registrada se dibujan sus compartimentos con el
 * volumen precargado y el usuario lo ajusta si la carga es distinta. La crea el
 * primer pedido que declara la distribución de esa cisterna y la reconcilia cada
 * alta o edición posterior con lo que el usuario declaró (última realidad gana).
 *
 * `scop` es opcional a propósito (una cámara puede llevar cualquier producto):
 * cuando viene informado sirve para enlazar sola la fila con la línea del
 * detalle que coincide.
 *
 * Sin índice único en (vehicle_id, compartment_number): la reconciliación da de
 * baja las filas que sobran y el scope global de `LogicalDelete` escondería la
 * dada de baja, así que un índice único haría chocar el INSERT (mismo gotcha que
 * `order_compartments` y `plant_products`).
 */
class VehicleCompartment extends Model
{
    use Auditable, BelongsToTenant, LogicalDelete;

    protected $fillable = [
        'tenant_id',
        'vehicle_id',
        'compartment_number',
        'scop',
        'volume',
        'is_active',
    ];

    protected $casts = [
        'compartment_number' => 'integer',
        'volume' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }
}