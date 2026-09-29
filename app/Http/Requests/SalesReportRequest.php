<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

/**
 * Validación de los filtros del reporte "Avance de ventas" (ADR-017).
 *
 * El período se pide de dos formas excluyentes (ADR-017 §5):
 *  - `month` (YYYY-MM): un mes completo.
 *  - `date_from` / `date_to` (Y-m-d): un rango explícito.
 *
 * Si viene un rango, el mes se ignora; si no viene nada, el período por defecto
 * es el mes actual en la zona horaria de la aplicación (America/Lima). El
 * servicio NUNCA recibe un período abierto: `period()` siempre devuelve un
 * rango cerrado, así que la consulta no necesita un caso "sin filtro".
 */
class SalesReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        // El reporte es de solo lectura y no expone datos de otra organización
        // (el aislamiento multi-tenant viene de los global scopes de los
        // modelos, igual que el resto del panel). No hay nada que autorizar más
        // allá de haber iniciado sesión, que ya exige el grupo `auth`.
        return true;
    }

    public function rules(): array
    {
        return [
            'month' => ['nullable', 'string', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
        ];
    }

    public function messages(): array
    {
        return [
            'month.regex' => __('reports.invalid_month'),
            'date_from.date_format' => __('reports.invalid_date'),
            'date_to.date_format' => __('reports.invalid_date'),
            'date_to.after_or_equal' => __('reports.invalid_range'),
        ];
    }

    /**
     * El mes realmente aplicado, o null si el período vino de un rango o del
     * mes actual. Si se envían ambos, el rango manda y el mes se descarta, para
     * que el front nunca muestre un mes seleccionado junto a un rango que no
     * le corresponde.
     */
    public function month(): ?string
    {
        $from = $this->query('date_from');
        $to = $this->query('date_to');

        if (is_string($from) && $from !== '' && is_string($to) && $to !== '') {
            return null;
        }

        $month = $this->query('month');

        return is_string($month) && $month !== '' ? $month : null;
    }

    /**
     * Período a consultar, ya cerrado.
     *
     * @return array{from: string, to: string}
     */
    public function period(): array
    {
        $from = $this->query('date_from');
        $to = $this->query('date_to');

        if (is_string($from) && $from !== '' && is_string($to) && $to !== '') {
            return ['from' => $from, 'to' => $to];
        }

        $month = $this->query('month');

        if (is_string($month) && preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $month, $matches) === 1) {
            $start = Carbon::createFromFormat('Y-m-d', "{$matches[1]}-{$matches[2]}-01")->startOfDay();

            return [
                'from' => $start->toDateString(),
                'to' => $start->copy()->endOfMonth()->toDateString(),
            ];
        }

        return [
            'from' => now()->startOfMonth()->toDateString(),
            'to' => now()->endOfMonth()->toDateString(),
        ];
    }
}
