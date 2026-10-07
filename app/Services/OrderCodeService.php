<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderCodeCounter;
use App\Models\Tenant;
use App\Models\TenantSetting;
use RuntimeException;

/**
 * Generación del código operativo del pedido (ADR-020, con el formato de
 * tenant_settings según ADR-021).
 *
 * El código pertenece a la organización y es único dentro de ella
 * (`uq_orders_tenant_code`); el `id` interno sigue siendo la clave técnica.
 *
 * La numeración NO se deduce del código anterior (el código es editable y
 * admite formatos heredados, ADR-020 §12): se lleva en
 * `order_code_counters.last_number`, que se incrementa con `lockForUpdate()`
 * dentro de la transacción que crea el pedido. `tenant_settings` aporta solo el
 * prefijo, el número inicial y el relleno.
 */
class OrderCodeService
{
    /**
     * Configuración de la organización, creándola con los valores por defecto
     * de la plataforma si todavía no existe (ADR-021).
     */
    public function settings(?int $tenantId = null): TenantSetting
    {
        $tenantId = $this->tenantId($tenantId);

        $settings = TenantSetting::withDeleted()
            ->where('tenant_id', $tenantId)
            ->first();

        if ($settings) {
            return $settings;
        }

        $defaults = config('platform.order_code');

        return TenantSetting::create([
            'tenant_id' => $tenantId,
            'organization_name' => (string) (Tenant::find($tenantId)?->name ?? 'Pedidos'),
            'default_language' => 'es',
            'timezone' => config('app.timezone'),
            'order_code_prefix' => $defaults['prefix'],
            'order_code_start' => $defaults['start'],
            'order_code_padding' => $defaults['padding'],
        ]);
    }

    /**
     * Siguiente código de la organización. Debe invocarse DENTRO de la
     * transacción que inserta el pedido: bloquea la fila del contador para que
     * dos pedidos simultáneos no obtengan el mismo número.
     */
    public function next(?int $tenantId = null): string
    {
        $tenantId = $this->tenantId($tenantId);
        $settings = $this->settings($tenantId);

        $prefix = trim((string) $settings->order_code_prefix);
        $prefix = $prefix === '' ? (string) config('platform.order_code.prefix') : $prefix;
        $padding = max(0, (int) $settings->order_code_padding);
        $start = max(1, (int) $settings->order_code_start);

        $this->ensureCounterExists($tenantId, $start);

        // Serializa a los pedidos concurrentes de esta organización.
        $counter = OrderCodeCounter::where('tenant_id', $tenantId)->lockForUpdate()->firstOrFail();

        $number = (int) $counter->last_number;
        $code = '';

        // El contador manda, pero se evita entregar un código ya usado (p. ej.
        // si alguien editó un código a mano con un número mayor). El índice
        // único es la red de seguridad final.
        for ($attempt = 0; $attempt < 100; $attempt++) {
            $number++;
            $code = $this->format($prefix, $padding, $number);

            $exists = Order::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('code', $code)
                ->exists();

            if (! $exists) {
                break;
            }
        }

        if ($code === '' || $exists) {
            throw new RuntimeException(__('order.code_exhausted'));
        }

        $counter->forceFill(['last_number' => $number])->save();

        return $code;
    }

    /**
     * Arma el código: PREFIJO + número rellenado (PED-000001).
     */
    public function format(string $prefix, int $padding, int $number): string
    {
        $code = $prefix . '-' . str_pad((string) $number, $padding, '0', STR_PAD_LEFT);

        if (mb_strlen($code) > (int) config('platform.order_code.max_length', 50)) {
            throw new RuntimeException(__('order.code_too_long'));
        }

        return $code;
    }

    /**
     * Crea la fila del contador si falta. El arranque usa el CANTIDAD de
     * pedidos con código de la organización (nunca `MAX(code)`, ADR-020 §13):
     * un tenant que ya traía pedidos mantiene su numeración y no repite
     * códigos. El número inicial del tenant solo aplica cuando no hay ninguno.
     */
    private function ensureCounterExists(int $tenantId, int $start): void
    {
        if (OrderCodeCounter::where('tenant_id', $tenantId)->exists()) {
            return;
        }

        $existing = Order::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->whereNotNull('code')
            ->count();

        OrderCodeCounter::create([
            'tenant_id' => $tenantId,
            'last_number' => max($start - 1, $existing),
        ]);
    }

    private function tenantId(?int $tenantId): int
    {
        $tenantId ??= TenantContext::id();

        if (! $tenantId) {
            throw new RuntimeException(__('order.tenant_required'));
        }

        return (int) $tenantId;
    }
}