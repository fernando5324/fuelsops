<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\LogicalDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Configuración operativa y de presentación de una organización (ADR-021).
 *
 * Relación 1:1 con `tenants`: ese conserva la identidad de la entidad (nombre,
 * RUC, correo, teléfono, logo) y esta tabla su configuración. De sus campos se
 * usan los del código de pedido (`order_code_prefix`, `order_code_start`,
 * `order_code_padding`, ADR-020) y los que gestionan las páginas de
 * Configuración (ADR-026): descripción, dirección, horario, redes sociales,
 * idioma y zona horaria.
 *
 * `business_hours` y `social_links` son JSON: `business_hours` guarda el
 * horario como TEXTO libre (la cadena se envuelve como string JSON válido).
 *
 * NO usa `BelongsToTenant`: la fila ES la configuración de su organización, no
 * un registro de negocio sujeto al scope global (además el scope se basaría en
 * la misma columna que la identifica).
 *
 * `is_deleted` se mantiene por convención del proyecto, pero conceptualmente la
 * configuración no se elimina: se actualiza. El `UNIQUE (tenant_id)` impide
 * tener más de una fila por organización.
 */
class TenantSetting extends Model
{
    use Auditable, LogicalDelete;

    protected $fillable = [
        'tenant_id',
        'organization_name',
        'n_document',
        'organization_description',
        'default_language',
        'timezone',
        'address',
        'business_hours',
        'social_links',
        'branding',
        'order_code_prefix',
        'order_code_start',
        'order_code_padding',
    ];

    protected $casts = [
        'business_hours' => 'array',
        'social_links' => 'array',
        'branding' => 'array',
        'order_code_start' => 'integer',
        'order_code_padding' => 'integer',
        'is_deleted' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}