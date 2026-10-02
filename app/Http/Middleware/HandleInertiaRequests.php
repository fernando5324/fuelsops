<?php

namespace App\Http\Middleware;

use App\Services\BrandService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            // Cliente activo. `name` sale de `tenants.name` (la base de datos):
            // es lo que ve el usuario arriba del menú y en el título.
            'tenant' => fn () => app(BrandService::class)->tenantProp(),
            // Identidad + paleta + formato ya resueltos (config/brand.php
            // sobre tenants.details). El front los consume por `useBrand()`.
            'brand' => fn () => app(BrandService::class)->toArray(),
            'flash' => fn () => $request->session()->get('flash'),
            'locale' => fn () => app()->getLocale(),
            'translations' => fn () => collect(glob(lang_path(app()->getLocale()).'/*.php'))
                ->mapWithKeys(fn ($file) => [basename($file, '.php') => require $file])
                ->all(),
        ];
    }
}
