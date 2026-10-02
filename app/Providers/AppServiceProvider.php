<?php

namespace App\Providers;

use App\Services\BrandService;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;


class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Singleton: el tenant activo se consulta UNA vez por petición, aunque
        // lo pidan la prop `tenant`/`brand` de Inertia, el `<style>` del blade
        // y el `ConfigProvider` del front (ADR-019).
        $this->app->singleton(BrandService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
        Schema::defaultStringLength(191);
    }
}
