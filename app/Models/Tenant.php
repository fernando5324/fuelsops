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
 * negocio se enruta por `tenant_id`. La organización principal es "Sertoco".
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
        'status',
    ];

    protected $casts = [
        'is_deleted' => 'boolean',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'tenant_id');
    }
}