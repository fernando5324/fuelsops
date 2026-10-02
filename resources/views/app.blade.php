<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Paleta del cliente (ADR-019): la resuelve App\Services\BrandService
             con prioridad tenants.details > config/brand.php y se imprime en el
             servidor, de modo que el primer paint ya sale con los colores finales
             (sin parpadeo) y app.css no lleva valores hexadecimales. --}}
        <style>
            :root {
                @foreach (app(\App\Services\BrandService::class)->cssVariables() as $variable => $value)
                    {{ $variable }}: {{ $value }};
                @endforeach
            }
        </style>

        {{-- El título lleva el nombre del CLIENTE (tenants.name), no el nombre
             interno del producto, para que cada cliente vea el suyo. --}}
        <title inertia>{{ $page['props']['tenant']['name'] ?? config('brand.name', 'fuels-ops') }}</title>

        {{-- Favicon personalizado (ADR-019): usa el logo del cliente y saldrá impreso
             desde el primer paint sin parpadeo.
        <link rel="icon" href="{{ asset($page['props']['tenant']['favicon_url'] ?? config('brand.favicon')) }}"> --}}

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <link rel="icon" type="image/png" href="favicon.ico">

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body>
        @inertia
    </body>
</html>
