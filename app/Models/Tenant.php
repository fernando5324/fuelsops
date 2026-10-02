<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\LogicalDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Organización (tenant) que aísla la información del sistema.
 *
 * Cada usuario pertenece a una única organización y toda la información de
 * negocio se enruta por `tenant_id`.
 *
 * `details` (JSON) es la customization del cliente (ADR-019): paleta y formato
 * que sobrescriben los valores por defecto de `config/brand.php`. NULL = se
 * usan los del archivo. Lo resuelve `App\Services\BrandService`.
 *
 * `name` es el nombre del cliente y es lo que muestra la plataforma (encabezado
 * del menú y título del navegador); el nombre interno del producto es
 * `config('brand.name')`.
 */
class Tenant extends Model
{
    use Auditable, LogicalDelete;

    protected $fillable = [
        'account_id',
        'name',
        'slug',
        'legal_name',
        'tax_id',
        'email',
        'phone',
        'website',
        'logo_media_file_id',
        'details',
        'status',
    ];

    protected $casts = [
        'details' => 'array',
        'is_deleted' => 'boolean',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'tenant_id');
    }
}