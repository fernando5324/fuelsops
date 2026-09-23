<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\LogicalDelete;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, Auditable, LogicalDelete;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'first_name',
        'last_name',
        'email',
        'password',
        'is_owner',
        'is_active',
        'created_by',
        'updated_by',
    ];

    /**
     * Model attributes with default values.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'remember_token' => '',
        'is_active' => 1,
        'is_owner' => 1,
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'tenant_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_owner' => 'boolean',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * La organización a la que pertenece el usuario.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Filtro explícito por organización (la autenticación es global).
     */
    public function scopeForTenant(Builder $query, ?int $tenantId = null): Builder
    {
        return $query->where('tenant_id', $tenantId ?? TenantContext::id());
    }
}