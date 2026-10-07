<?php

namespace App\Http\Controllers\Platform\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Página Inertia genérica de gestión de catálogos (ADR-064).
 *
 * Cada módulo compone este trait y declara en su controlador el modelo, el
 * recurso, los campos visibles/editables y los campos de búsqueda.
 *
 * "Catálogo" es solo el nombre lógico con el que se agrupan ciertos módulos
 * en la UI: NO existe aquí agrupación física por catálogo. El frontend
 * renderiza una tabla + formulario genérico con estas definiciones
 * (Pages/Platform/Shared/Index.jsx). Los módulos con página propia
 * sobreescriben el hook `pageComponent()`.
 *
 * Las URL web de las vistas son segmentos en español (ADR-003), por eso
 * `pageUrl()` casi nunca coincide con `$resource` (inglés, interno).
 */
trait HasIndexPage
{
    /**
     * Cada módulo declara en su controlador:
     *
     * @var class-string $model
     * @var string $resource Recurso interno del módulo en inglés: alimenta
     *                       `config.resource` para que el frontend resuelva el
     *                       Service (p. ej. catalogServices['advisors']) y entra
     *                       en las rutas de las APIs inglesas (`/api/{resource}`).
     *                       Es SOLO un identificador interno: NO es el segmento
     *                       de URL web (que es español, ADR-003, vía `pageUrl()`).
     * @var string $titleKey Clave de traducción del título (lang/es/menus.php).
     * @var string[] $searchable Columnas de texto incluidas en la búsqueda.
     * @var array<int, array{key:string,label:string,type:string,options?:string}> $filters Filtros de listado (ADR-069).
     * @var array<int, array{key:string,label:string,type:string,required?:bool,options?:string,create_only?:bool}> $fields Definición de campos de tabla/formulario.
     */
    public function index(Request $request): Response
    {
        $query = ($this->model)::query();

        $this->applyQueryScope($query);

        $q = trim((string) $request->query('q', ''));

        if ($q !== '' && $this->searchable !== []) {
            $query->where(function ($builder) use ($q) {
                foreach ($this->searchable as $field) {
                    $builder->orWhere($field, 'like', "%{$q}%");
                }
            });
        }

        $filter = ['q' => $q];

        foreach ($this->filters as $field) {
            $key = data_get($field, 'key');
            if ($key === null || $key === '') {
                continue;
            }
            $value = $request->query($key);

            if ($value !== null && $value !== '') {
                $query->where($key, $value);
                $filter[$key] = $value;
            }
        }

        $rows = $query->latest('id')->paginate(15)->withQueryString();

        return Inertia::render($this->pageComponent(), [
            'config' => [
                'resource' => $this->resource,
                'url' => $this->pageUrl(),
                'title' => isset($this->titleKey) ? __($this->titleKey) : ($this->resource ?? ''),
                'fields' => $this->fields ?? [],
                'filters' => $this->filters ?? [],
                'options' => $this->options(),
                'showAudit' => $this->showAudit(),
            ],
            'rows' => $rows,
            'filter' => $filter,
        ]);
    }

    /**
     * Componente Inertia que renderiza el índice del módulo.
     *
     * Por defecto usa la página genérica compartida por los catálogos; los
     * módulos con página propia (p. ej. Asesores) lo sobreescriben para
     * apuntar a su componente dedicado (ADR-009 §36).
     */
    protected function pageComponent(): string
    {
        return 'Platform/Shared/Index';
    }

    /**
     * Ruta base de la página del módulo (segmento web en español, ADR-003).
     *
     * El default `/catalogos/{$this->resource}` solo es válido cuando el
     * recurso interno coincide con el segmento español (p. ej. `estados`).
     * Los módulos cuyo segmento español difiere (asesores, clientes,
     * conductores, plantas, productos, vehículos, mayoristas) o que viven
     * fuera de `catalogos/` (p. ej. usuarios) lo sobreescriben.
     */
    protected function pageUrl(): string
    {
        return '/catalogos/' . $this->resource;
    }

    /** Muestra columnas de auditoría al final de la tabla. */
    protected function showAudit(): bool
    {
        return true;
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

    /**
     * Restricción adicional por módulo (p. ej. usuarios por organización).
     * Los catálogos con trait BelongsToTenant ya quedan aislados por su
     * global scope; aquí solo se usa para entidades sin scope global (User).
     */
    protected function applyQueryScope(Builder $query): void
    {
    }
}