<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Detras de un proxy (Railway, Render, Fly.io, Nginx de
        // balancing, ...) el proxy cierra TLS y reenvia todo por
        // HTTP. Sin esto Laravel cree que la peticion es HTTP plano:
        //  - $request->ip() devuelve siempre la IP del proxy, asi que
        //    los throttle:30,1 de los lookups publicos se consumen
        //    entre todos los usuarios (429 global).
        //  - las cookies de sesion no se marcan seguras y las URL
        //    generadas usan http:// en vez de https://.
        // Se resuelve con los headers X-Forwarded-* (Railway y el
        // resto los envian). Se puede restringir con
        // TRUSTED_PROXIES=10.0.0.1,10.0.0.2 si se conoce el rango
        // del proxy; '*' es lo habitual en PaaS.
        $middleware->trustProxies(at: env('TRUSTED_PROXIES', '*'));
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
