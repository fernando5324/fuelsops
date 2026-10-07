<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\LogicalDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Cisterna (ADR-023).
 *
 * Una fila es una cisterna con sus DOS placas: `license_plate` (la cisterna) y
 * `tractor_plate` (el tracto que la mueve). Antes el tracto era una fila aparte
 * con `type = 'TRACTOR'`, lo que obligaba a que la misma placa existiera en dos
 * entidades; ahora el tracto es un dato al mismo nivel y puede coincidir con la
 * placa de la cisterna.
 *
 * `tractor_plate` es el dato vigente del parque (última realidad gana); el
 * histórico día por día vive en `orders.tractor_plate`.
 */
class Vehicle extends Model
{
    use Auditable, BelongsToTenant, LogicalDelete;

    protected $fillable = [
        'tenant_id',
        'license_plate',
        'tractor_plate',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'tanker_id');
    }

    /**
     * Distribuciones de ESTE pedido en ESTA cisterna (ADR-015 + ADR-023).
     */
    public function orderCompartments(): HasMany
    {
        return $this->hasMany(OrderCompartment::class, 'vehicle_id');
    }

    /**
     * Plantilla de cámaras de la cisterna (ADR-023): de dónde sale el
     * autocompletado del formulario público.
     */
    public function compartments(): HasMany
    {
        return $this->hasMany(VehicleCompartment::class, 'vehicle_id');
    }
}