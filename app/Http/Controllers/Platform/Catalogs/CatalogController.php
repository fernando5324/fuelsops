<?php

namespace App\Http\Controllers\Platform\Catalogs;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Página Inertia genérica de gestión de catálogos (ADR-064).
 *
 * Cada módulo extiende esta clase y define: modelo, recurso (ruta),
 * campos visibles/editable y campos de búsqueda. El frontend renderiza una
 * tabla + formulario genérico con estas definiciones.
 */
abstract class CatalogController extends Controller
{
    /** @var class-string */
    protected string $model;

    /** Recurso en las rutas: catalogos.{resource}.* */
    protected string $resource;

    /** Clave de traducción del título (lang/es/menus.php) */
    protected string $titleKey;

    /** Columnas de texto incluidas en la búsqueda. */
    protected array $searchable = [];

    /**
     * Definición de campos para tabla/formulario:
     * [['key', 'label', 'type' => text|textarea|number|boolean|select|password,
     *   'required' => bool, 'options' => keyDeOptions, 'create_only' => bool]]
     */
    protected array $fields = [];

    /** Muestra columnas de auditoría al final de la tabla. */
    protected bool $showAudit = true;

    public function index(Request $request): Response
    {
        $query = ($this->model)::query();

        $q = trim((string) $request->query('q', ''));

        if ($q !== '' && $this->searchable !== []) {
            $query->where(function ($builder) use ($q) {
                foreach ($this->searchable as $field) {
                    $builder->orWhere($field, 'like', "%{$q}%");
                }
            });
        }

        $rows = $query->latest('id')->paginate(15)->withQueryString();

        return Inertia::render('Platform/Catalogs/Index', [
            'config' => [
                'resource' => $this->resource,
                'title' => __($this->titleKey),
                'fields' => $this->fields,
                'options' => $this->options(),
                'showAudit' => $this->showAudit,
            ],
            'rows' => $rows,
            'filter' => ['q' => $q],
        ]);
    }

    /**
     * Listas de opciones para los campos select.
     *
     * @return array<string, array<int, array{value: string|int, label: string}>>
     */
    protected function options(): array
    {
        return [];
    }
}