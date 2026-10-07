<?php

namespace App\Services;

use App\Models\Tenant;

/**
 * Identidad visual y convenciones de formato de la plataforma (ADR-019).
 *
 * Resuelve la paleta y el formato de dos fuentes, por orden de prioridad:
 *
 *   1. `tenants.details` (JSON en la base de datos): customization del cliente.
 *   2. `config/brand.php`: valor por defecto de la plataforma.
 *
 * Un tenant con `details = NULL` se ve igual que el de arriba, así que la
 * columna es **aditiva**: se puede migrar cliente por cliente.
 *
 * Lo que se resuelve aquí NO incluye el nombre del cliente: ese siempre sale
 * de `tenants.name` (`clientName()`), que es lo que se ve en el panel. El
 * nombre interno del producto es `config('brand.name')` (`fuels-ops`).
 *
 * La instancia se registra como singleton (`AppServiceProvider`), de modo que
 * el tenant se consulta **una sola vez** por petición, aunque lo pidan la prop
 * de Inertia, el `<style>` del blade y el `ConfigProvider` del front.
 */
class BrandService
{
    /** Formato válido de un color de la paleta. */
    private const HEX = '/^#[0-9A-Fa-f]{6}$/';

    /**
     * Variables CSS derivadas de la paleta.
     *
     * `--color-border` conserva el valor suave (`border_soft`) que tenía antes
     * del refactor; el borde fuerte queda en `--color-border-strong`.
     * `--color-text` y `--color-fill-soft` estaban usándose en el CSS sin
     * estar definidas y ahora se resuelven como `ink` y `fill_soft`.
     *
     * @var list<array{0: string, 1: string}>
     */
    private const CSS_VARS = [
        ['--color-primary', 'primary'],
        ['--color-accent', 'accent'],
        ['--color-accent-hover', 'accent_hover'],
        ['--color-bg', 'bg'],
        ['--color-surface', 'surface'],
        ['--color-border', 'border_soft'],
        ['--color-border-strong', 'border'],
        ['--color-fill-soft', 'fill_soft'],
        ['--color-ink', 'ink'],
        ['--color-text', 'ink'],
        ['--color-muted', 'muted'],
        ['--color-success', 'success'],
        ['--color-danger', 'danger'],
    ];

    private ?Tenant $tenant = null;

    private bool $tenantLoaded = false;

    /** @var array<string, string>|null */
    private ?array $colors = null;

    /** @var array<string, string>|null */
    private ?array $format = null;

    // ── Tenant ──────────────────────────────────────────────────────────────

    /** Tenant activo (usuario autenticado o `platform.default_tenant_id`). */
    public function tenant(): ?Tenant
    {
        if (! $this->tenantLoaded) {
            $this->tenant = Tenant::find(TenantContext::id());
            $this->tenantLoaded = true;
        }

        return $this->tenant;
    }

    /**
     * Prop `tenant` de Inertia (`id`, `name`, `slug`).
     *
     * @return array<string, mixed>
     */
    public function tenantProp(): array
    {
        return [
            'id' => $this->tenant()?->id ?? TenantContext::id(),
            'name' => $this->clientName(),
            'slug' => $this->clientSlug(),
        ];
    }

    // ── Identidad ───────────────────────────────────────────────────────────

    /** Nombre interno del producto (`fuels-ops`), NO el que ve el usuario. */
    public function productName(): string
    {
        return (string) config('brand.name', 'fuels-ops');
    }

    /** Nombre corto del producto (`fuelsops`). */
    public function productShort(): string
    {
        return (string) config('brand.short', 'fuelsops');
    }

    /** Nombre del cliente: siempre el de la base de datos (`tenants.name`). */
    public function clientName(): string
    {
        return $this->tenant()?->name ?: $this->productName();
    }

    public function clientSlug(): string
    {
        return $this->tenant()?->slug
            ?: (string) config('platform.default_tenant_slug', 'fuelsops');
    }

    /**
     * Prefijo de los archivos exportados: el slug del cliente por defecto.
     *
     * `sertoco_precios_2026-10-01.xlsx` hoy; `otro_cliente_...` mañana.
     */
    public function filePrefix(): string
    {
        $configured = config('brand.file_prefix');

        return (is_string($configured) && $configured !== '')
            ? $configured
            : $this->clientSlug();
    }

    /**
     * URL del logo.
     *
     * Si la organización tiene logo propio (`tenants.logo_media_file_id`,
     * ADR-026) se sirve desde la ruta pública `brand.logo` en línea (un `<img>`
     * la muestra; `media.download` sirve con `Content-Disposition: attachment`)
     * con el id como versión para invalidar la caché al reemplazarlo. Si no,
     * el logo de la plataforma (`config('brand.logo')`).
     */
    public function logoUrl(): string
    {
        $logoMediaId = $this->tenant()?->logo_media_file_id;

        if ($logoMediaId) {
            return route('brand.logo', ['v' => $logoMediaId]);
        }

        return asset((string) config('brand.logo', 'images/logo.png'));
    }

    // ── Paleta y formato ────────────────────────────────────────────────────

    /** @return array<string, string> */
    public function colors(): array
    {
        return $this->colors ??= $this->merge(
            (array) config('brand.colors', []),
            data_get($this->details(), 'colors'),
            self::HEX,
        );
    }

    public function color(string $key, ?string $fallback = null): string
    {
        return $this->colors()[$key]
            ?? (string) config("brand.colors.{$key}", $fallback ?? '#000000');
    }

    /** @return array<string, string> */
    public function format(): array
    {
        return $this->format ??= $this->merge(
            (array) config('brand.format', []),
            data_get($this->details(), 'format'),
            null,
        );
    }

    public function formatValue(string $key, ?string $fallback = null): string
    {
        return $this->format()[$key]
            ?? (string) config("brand.format.{$key}", $fallback ?? '');
    }

    /**
     * Variables CSS para el `<style>` del primer paint (`--color-*`).
     *
     * @return array<string, string>
     */
    public function cssVariables(): array
    {
        $vars = [];

        foreach (self::CSS_VARS as [$variable, $token]) {
            $vars[$variable] = $this->color($token);
        }

        return $vars;
    }

    /**
     * Prop `brand` de Inertia: identidad + paleta + formato ya resueltos.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'product' => $this->productName(),
            'short' => $this->productShort(),
            'client' => $this->clientName(),
            'slug' => $this->clientSlug(),
            'logo' => $this->logoUrl(),
            'colors' => $this->colors(),
            'format' => $this->format(),
        ];
    }

    // ── Interno ─────────────────────────────────────────────────────────────

    /**
     * Contenido de `tenants.details` (array vacío si es NULL o no es válido).
     *
     * @return array<string, mixed>
     */
    private function details(): array
    {
        $details = $this->tenant()?->details;

        if (is_array($details)) {
            return $details;
        }

        if (is_string($details) && $details !== '') {
            return (array) json_decode($details, true);
        }

        return [];
    }

    /**
     * Mezcla el override del tenant sobre los valores por defecto.
     *
     * Solo se aceptan claves que ya existen en los valores por defecto (para no
     * inventar tokens) y, si se pasa `$pattern`, valores que lo cumplan. Un
     * `details` mal escrito no puede romper el diseño de la plataforma.
     *
     * @param  array<string, mixed>  $defaults
     * @param  mixed  $override
     * @return array<string, string>
     */
    private function merge(array $defaults, mixed $override, ?string $pattern): array
    {
        $merged = [];

        foreach ($defaults as $key => $value) {
            $merged[$key] = (string) $value;
        }

        if (! is_array($override)) {
            return $merged;
        }

        foreach ($override as $key => $value) {
            $key = (string) $key;

            if (! is_string($value) || ! array_key_exists($key, $merged)) {
                continue;
            }

            if ($pattern !== null && ! preg_match($pattern, $value)) {
                continue;
            }

            // Solo los colores se normalizan a mayúsculas; los valores de
            // formato (locale, moneda, unidad…) se respetan tal cual.
            $merged[$key] = $pattern !== null ? strtoupper($value) : $value;
        }

        return $merged;
    }
}