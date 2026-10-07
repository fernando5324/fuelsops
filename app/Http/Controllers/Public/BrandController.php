<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\MediaFile;
use App\Models\Tenant;
use App\Services\TenantContext;
use Illuminate\Support\Facades\Storage;

/**
 * Logo de la organización servido EN LÍNEA (ADR-026).
 *
 * Es la única ruta que pinta el logo del tenant en un `<img>`: la ruta
 * `media.download` sirve con `Content-Disposition: attachment` y el navegador
 * no la muestra como imagen. Es pública (sin sesión) porque el header público
 * y las páginas sin login también pintan `brand.logo`.
 *
 * No recibe el id del archivo como parámetro (evita exponer media arbitrarias
 * por id adivinable): sirve SOLO el logo del tenant activo —el del usuario
 * autenticado o el de `platform.default_tenant_id` en flujo público—.
 * `?v={media_id}` es solo para invalidar la caché del navegador al reemplazarlo.
 */
class BrandController extends Controller
{
    public function logo()
    {
        $tenantId = TenantContext::id();
        $tenant = $tenantId ? Tenant::find($tenantId) : null;
        $media = $tenant?->logo_media_file_id ? MediaFile::find($tenant->logo_media_file_id) : null;

        // Sin logo propio (o archivo dado de baja/ilegible): se sirve el de la
        // plataforma, que es accesible directamente como asset estático.
        if (! $media || ! str_starts_with((string) $media->mime_type, 'image/')) {
            return redirect()->away(asset((string) config('brand.logo', 'images/logo.png')));
        }

        abort_unless(Storage::disk($media->disk)->exists($media->path()), 404);

        return response()->file(Storage::disk($media->disk)->path($media->path()), [
            'Content-Type' => $media->mime_type,
            'Content-Disposition' => 'inline; filename="logo.'.($media->extension ?: 'png').'"',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
