<?php

namespace App\Http\Controllers\Platform\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCompanySettingsRequest;
use App\Http\Requests\UpdateSystemSettingsRequest;
use App\Models\MediaFile;
use App\Models\Tenant;
use App\Services\BrandService;
use App\Services\MediaService;
use App\Services\OrderCodeService;
use App\Services\TenantContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Páginas de Configuración → Empresa y Sistema (ADR-026).
 *
 * Dos vistas (rutas en español, ADR-003) y dos endpoints de guardado en la API
 * del panel (inglés). Controlador autocontenido, sin traits Concerns.
 *
 * Permisos: solo el dueño de la organización (`is_owner`) ve y guarda la
 * configuración — 403 para el resto. En los endpoints PUT la comprobación
 * vive también en el FormRequest (`authorize()`), para que corra antes de la
 * validación.
 *
 * Todo el guardado de la empresa (identidad en `tenants` + configuración en
 * `tenant_settings` + logo) ocurre en UNA petición, como exige el ADR: la
 * imagen solo se previsualiza en el formulario y se persiste al guardar.
 */
class SettingsController extends Controller
{
    public function __construct(private readonly OrderCodeService $orderCode)
    {
    }

    // ── Vistas ──────────────────────────────────────────────────────────────

    public function company(BrandService $brand): Response
    {
        $this->authorizeOwner();

        $tenant = $this->tenant();
        $settings = $this->orderCode->settings($tenant->id);

        return Inertia::render('Platform/Settings/Company', [
            'company' => [
                // Identidad: tenants (ADR-026 "página de empresa").
                'name' => $tenant->name,
                'legal_name' => $tenant->legal_name,
                'tax_id' => $tenant->tax_id,
                'email' => $tenant->email,
                'phone' => $tenant->phone,
                'website' => $tenant->website,
                // Datos para documentos: tenant_settings.
                'organization_description' => $settings->organization_description,
                'address' => $settings->address,
                'business_hours' => $this->hoursText($settings->business_hours),
                'social_links' => is_array($settings->social_links) ? $settings->social_links : [],
                // Logo: se previsualiza el actual; el nuevo solo llega al servidor en el guardado.
                'has_logo' => (bool) $tenant->logo_media_file_id,
                'logo_url' => $brand->logoUrl(),
            ],
        ]);
    }

    public function system(): Response
    {
        $this->authorizeOwner();

        $settings = $this->orderCode->settings($this->tenant()->id);

        return Inertia::render('Platform/Settings/System', [
            'settings' => [
                'default_language' => $settings->default_language,
                'timezone' => $settings->timezone,
                'order_code_prefix' => $settings->order_code_prefix,
                'order_code_start' => (int) $settings->order_code_start,
                'order_code_padding' => (int) $settings->order_code_padding,
            ],
            'timezones' => \DateTimeZone::listIdentifiers(),
        ]);
    }

    // ── Guardado ────────────────────────────────────────────────────────────

    /**
     * Una sola transacción: identidad + configuración + logo. Si el logo nuevo
     * no llega a persistirse (fallo de transacción) se borra el archivo recién
     * subido para no dejar huérfanos en disco.
     */
    public function updateCompany(UpdateCompanySettingsRequest $request): RedirectResponse
    {
        $this->authorizeOwner();

        $tenant = $this->tenant();
        $settings = $this->orderCode->settings($tenant->id);
        $data = $request->validated();
        $media = app(MediaService::class);
        $newMedia = null;

        try {
            DB::transaction(function () use ($tenant, $settings, $data, $request, $media, &$newMedia) {
                $tenant->fill([
                    'name' => $data['name'],
                    'legal_name' => $data['legal_name'] ?? null,
                    'tax_id' => $data['tax_id'] ?? null,
                    'email' => $data['email'] ?? null,
                    'phone' => $data['phone'] ?? null,
                    'website' => $data['website'] ?? null,
                ]);

                $settings->fill([
                    'organization_description' => $data['organization_description'] ?? null,
                    'address' => $data['address'] ?? null,
                    'business_hours' => ($data['business_hours'] ?? '') !== '' ? $data['business_hours'] : null,
                    'social_links' => ! empty($data['social_links']) ? $data['social_links'] : null,
                ]);
                // Espejo del nombre comercial mostrado por la plataforma.
                $settings->organization_name = $data['name'];

                $previousLogoId = $tenant->logo_media_file_id;

                if ($request->hasFile('logo')) {
                    $newMedia = $media->storeFor($tenant, $request->file('logo'), [
                        'directory' => 'tenants/' . $tenant->id,
                    ]);
                    $tenant->logo_media_file_id = $newMedia->id;
                } elseif ($request->boolean('remove_logo')) {
                    $tenant->logo_media_file_id = null;
                }

                $tenant->save();
                $settings->save();

                // El logo anterior se destruye (físico + baja lógica) solo si
                // fue reemplazado o quitado.
                if ($previousLogoId && $previousLogoId !== $tenant->logo_media_file_id) {
                    $old = MediaFile::find($previousLogoId);

                    if ($old) {
                        $media->destroy($old);
                    }
                }
            });
        } catch (Throwable $e) {
            if ($newMedia) {
                try {
                    $media->destroy($newMedia);
                } catch (Throwable) {
                    // El error original es el que importa.
                }
            }

            throw $e;
        }

        return back()->with('flash', ['success' => __('settings.company_saved')]);
    }

    public function updateSystem(UpdateSystemSettingsRequest $request): RedirectResponse
    {
        $this->authorizeOwner();

        $settings = $this->orderCode->settings($this->tenant()->id);

        $settings->fill($request->validated())->save();

        return back()->with('flash', ['success' => __('settings.system_saved')]);
    }

    // ── Interno ─────────────────────────────────────────────────────────────

    private function authorizeOwner(): void
    {
        abort_unless((bool) auth()->user()?->is_owner, 403);
    }

    private function tenant(): Tenant
    {
        return Tenant::findOrFail(TenantContext::id());
    }

    /**
     * `business_hours` es JSON con cast `array`, pero guarda el horario como
     * texto libre (string JSON). Se normaliza a string para el formulario.
     */
    private function hoursText(mixed $value): string
    {
        if (is_array($value)) {
            return (string) json_encode($value, JSON_UNESCAPED_UNICODE);
        }

        return (string) ($value ?? '');
    }
}
