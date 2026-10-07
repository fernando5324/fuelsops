<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Guardado de la página de Configuración → Empresa (ADR-026).
 *
 * Una sola petición (multipart) con los datos de `tenants` (identidad), de
 * `tenant_settings` (descripción, dirección, horario, redes) y el logo, tal
 * como exige el ADR: la imagen se previsualiza en el form y se guarda junto
 * con el resto al pulsar Guardar.
 *
 * El permiso vive en `authorize()`: un usuario que no sea dueño recibe 403
 * ANTES de cualquier validación (la petición se resuelve al inyectarse en el
 * controlador, antes de su cuerpo).
 */
class UpdateCompanySettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) auth()->user()?->is_owner;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'legal_name' => ['nullable', 'string', 'max:200'],
            'tax_id' => ['nullable', 'string', 'digits:11'],
            'email' => ['nullable', 'email', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'website' => ['nullable', 'url', 'max:255'],
            'organization_description' => ['nullable', 'string', 'max:500'],
            'address' => ['nullable', 'string', 'max:1000'],
            'business_hours' => ['nullable', 'string', 'max:200'],
            'social_links' => ['sometimes', 'array'],
            'social_links.*' => ['string', 'url', 'max:300'],
            'logo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
            'remove_logo' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Nombres de campo en español para los mensajes de validación.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nombre comercial',
            'legal_name' => 'razón social',
            'tax_id' => 'RUC',
            'email' => 'correo',
            'phone' => 'teléfono',
            'website' => 'sitio web',
            'organization_description' => 'descripción',
            'address' => 'dirección',
            'business_hours' => 'horario de atención',
            'social_links' => 'redes sociales',
            'logo' => 'logo',
        ];
    }
}
