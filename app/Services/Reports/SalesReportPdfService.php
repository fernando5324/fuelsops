<?php

namespace App\Services\Reports;

use App\Services\BrandService;
use Illuminate\Support\Facades\Blade;
use RuntimeException;
use Spatie\Browsershot\Browsershot;
use Symfony\Component\HttpFoundation\Response;

/**
 * Genera el PDF del reporte "Avance de ventas" con Browsershot (ADR-018).
 *
 * Recibe el payload YA calculado por `SalesReportService` y no vuelve a
 * consultar nada: la fuente única de los números es ese servicio, compartido con
 * la página web (ADR-018 §4/§19/§25). Si este servicio calculara sus propios
 * totales, el PDF podría discrepar de lo que el usuario ve en pantalla.
 *
 * ── Por qué `html()` y no `url()` ────────────────────────────────────────────
 *
 * `Browsershot::url()` haría que Chromium recargara la aplicación por HTTP. Eso
 * tiene tres problemas en este proyecto:
 *
 *  1. `APP_URL` en desarrollo es `http://sertocoplatform`, que no resuelve, y
 *     dentro del contenedor una URL pública implicaría un viaje de ida y vuelta
 *     por la red (y un posible bloqueo si el proxy solo tiene un worker).
 *  2. La ruta tendría que ir firmada o con cookie, y `TenantContext` —que
 *     resuelve la organización activa a partir del usuario autenticado— no
 *     encontraría a nadie en la petición de Chromium, con lo que el PDF saldría
 *     con los datos del tenant por defecto en vez de los del usuario.
 *  3. Es una superficie HTTP extra que auditar.
 *
 * Con `html()` el HTML se arma en memoria con TODO inlineado (scripts, estilos y
 * logo como data URI), así que Chromium no hace ni una petición de red: mismo
 * resultado en desarrollo y en producción, sin depender de `APP_URL` y sin
 * exponer una ruta interna.
 */
class SalesReportPdfService
{
    /** Segundos máximos para todo el proceso (Chromium + PDF). */
    private const TIMEOUT = 60;

    /**
     * Milisegundos que Browsershot espera a `window.__pdfChartsReady`.
     *
     * Es un tope de seguridad, no una espera: si los gráficos no se pintan en ese
     * plazo es que algo se rompió y conviene fallar (ADR-018 §21 "no devolver un
     * PDF incompleto") en vez de imprimir una hoja en blanco.
     */
    private const CHARTS_TIMEOUT_MS = 30000;

    private const VIEW = 'reports.sales-pdf';

    /**
     * Datos inmutables durante el proceso: leer y decodificar 600 kB de bundle y
     * 70 kB de logo en cada reintento es trabajo tirado. En un request de PHP
     * dura lo mismo que un static de clase, así que no hace falta cachearlo más.
     */
    private static ?string $chartsRuntime = null;

    private static ?string $logoDataUri = null;

    /**
     * @param  array  $report  payload de `SalesReportService::build()`.
     * @param  array  $period  `{from: Y-m-d, to: Y-m-d}` cerrado.
     * @param  string  $tenantName  marca de la organización (ADR-018 §11).
     */
    public function export(array $report, array $period, string $tenantName): Response
    {
        $pdf = $this->browser($this->html($report, $period, $tenantName))->pdf();

        return new Response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $this->contentDisposition($this->fileName($period)),
            'Content-Length' => (string) strlen($pdf),
        ]);
    }

    /**
     * Nombre del archivo (ADR-018 §20).
     *
     * Sigue la convención del export de precios (`{prefijo}_{asunto}_{fecha}`) y
     * además incluye el período, que es lo que hace único al archivo: el reporte
     * se puede volver a pedir las veces que haga falta y los PDF no se pisan.
     *
     * El prefijo es el del cliente (`BrandService::filePrefix()`, hoy
     * `sertoco`), de modo que cada organización recibe sus archivos con su
     * nombre y no se pisan entre sí.
     */
    public function fileName(array $period): string
    {
        return sprintf(
            '%s_avance_ventas_%s_%s.pdf',
            app(BrandService::class)->filePrefix(),
            $period['from'],
            $period['to'],
        );
    }

    /**
     * Renderiza la vista Blade a una cadena HTML lista para Chromium.
     *
     * Público para poder depurar y para las pruebas: permite inspeccionar el
     * HTML exacto que verá el navegador sin gastar un arranque de Chromium.
     */
    public function html(array $report, array $period, string $tenantName): string
    {
        return Blade::render(self::VIEW, [
            'report' => $report,
            'summary' => $report['summary'] ?? [],
            'daily' => $report['daily'] ?? [],
            'products' => $report['products'] ?? [],
            'period' => $period,
            'tenantName' => $tenantName,
            // Paleta y convenciones resueltas (ADR-019): la vista no declara
            // ningún hexadecimal, los recibe de BrandService.
            'colors' => app(BrandService::class)->colors(),
            'format' => app(BrandService::class)->format(),
            'logo' => $this->logoDataUri(),
            'chartsRuntime' => $this->chartsRuntime(),
            'labels' => $this->chartLabels(),
            'hasData' => (bool) ($report['daily'] ?? []),
        ]);
    }

    /**
     * Chromium con la configuración de impresión (ADR-018 §10).
     *
     * Sin argumentos de `landscape()`: A4 vertical (ADR-018 §10 "Preferentemente
     * vertical") alcanza para la tabla de 6 columnas.
     *
     * El `footerTemplate` es el mecanismo de Chromium para el pie y la
     * numeración: se imprime en el margen inferior de TODAS las páginas, así que
     * `marginBottom` deja sitio para que no se solape con la tabla.
     */
    private function browser(string $html): Browsershot
    {
        $chromePath = config('platform.browsershot.chrome_path');

        $browser = Browsershot::html($html)
            ->format('A4')
            ->margins(14, 12, 18, 12)
            ->setOption('printBackground', true)
            ->setOption('displayHeaderFooter', true)
            ->setOption('footerTemplate', $this->footerTemplate())
            ->setOption('marginBottom', 18)
            ->waitUntilNetworkIdle()
            // ADR-018 §14: se espera una CONDICIÓN (los gráficos pintados), no un
            // `delay` arbitrario. El timeout es solo el tope de seguridad.
            ->waitForFunction('window.__pdfChartsReady === true', null, self::CHARTS_TIMEOUT_MS)
            ->timeout(self::TIMEOUT);

        // `setNodeModulePath` es obligatorio: sin él el `NODE_PATH` que Browsershot
        // arma queda vacío y Chromium no encuentra el paquete `puppeteer`.
        $browser->setNodeModulePath(base_path('node_modules'));

        // ── Chromium en un servidor sin escritorio ──────────────────────────
        //
        // En desarrollo, Apache corre como servicio de Windows (`LocalSystem`,
        // sesión 0): Chromium no tiene perfil de usuario en esa sesión y aborta
        // con `Failed to launch the browser process: Code: 1002`. No es un
        // problema del reporte ni del HTML; es Chromium sin escritorio. Por eso
        // se le da un `user-data-dir` propio y escribible, dentro de `storage/`
        // para no ensuciar el directorio del proyecto.
        //
        // Browsershot ya añade `--no-sandbox`; el resto es headless estándar,
        // necesario también en contenedores sin GPU ni /dev/shm (ADR-018 §24).
        $browser->setUserDataDir($this->userDataDir())
            ->addChromiumArguments([
                'disable-gpu',
                'disable-dev-shm-usage',
                'no-first-run',
                'no-default-browser-check',
                'disable-extensions',
                'hide-scrollbars',
            ]);

        if (is_string($chromePath) && $chromePath !== '') {
            $browser->setChromePath($chromePath);
        }

        return $browser;
    }

    /**
     * Perfil de Chromium para la generación headless.
     *
     * Es un directorio que SOLO guarda el perfil que Chromium necesita para
     * arrancar: nada del reporte ni de la aplicación (el HTML viaja aparte). Se
     * crea si falta y se conserva entre ejecuciones, que es lo que hace el
     * arranque más rápido.
     */
    private function userDataDir(): string
    {
        $dir = storage_path('app/browsershot/profile');

        if (! is_dir($dir)) {
            // `mkdir` recursivo: el primer arranque tras un `optimize:clear` puede
            // no tener `app/` todavía.
            @mkdir($dir, 0777, true);
        }

        if (! is_dir($dir)) {
            throw new RuntimeException(
                "No se pudo crear el directorio de perfil de Chromium en {$dir}. "
                .'Verificá que storage/app/ sea escribible por el usuario del servidor web.'
            );
        }

        return $dir;
    }

    /**
     * Pie de página del PDF (ADR-018 §10, ADR-019 §colores).
     *
     * Chromium NO aplica hoja de estilo al pie: hay que escribir el HTML con
     * estilos en línea sí o sí. El tamaño en px es el que espera Chromium, no
     * el de la página (el margen está en pulgadas).
     *
     * El texto sale de `lang/es/reports.php` (las claves `pdf_source` y
     * `pdf_footer_page` estaban definidas y sin usar) y el color del texto
     * viene de la paleta del cliente, no de un hexadecimal en este archivo.
     */
    private function footerTemplate(): string
    {
        $brand = app(BrandService::class);

        $source = str_replace(
            [':client', ':report'],
            [$brand->clientName(), __('reports.title')],
            __('reports.pdf_source'),
        );

        return sprintf(
            '<div style="width:100%%;font-family:Helvetica,Arial,sans-serif;font-size:9px;color:%s;padding:0 12mm;display:flex;justify-content:space-between;">'
            .'<span>%s</span>'
            .'<span>%s <span class="pageNumber"></span> %s <span class="totalPages"></span></span>'
            .'</div>',
            $brand->color('muted'),
            e($source),
            e(__('reports.pdf_footer_page')),
            e(__('reports.pdf_footer_of')),
        );
    }

    /**
     * Textos que consumen los builders de gráficos compartidos.
     *
     * Los mismos valores que la web pasa con `t('reports.…')`: como el bundle del
     * PDF usa `lib/reportCharts.js` (la misma fuente), ambos lados dibujan las
     * mismas etiquetas (ADR-018 §19).
     *
     * @return array<string, string>
     */
    private function chartLabels(): array
    {
        return [
            'seriesSales' => __('reports.series_sales'),
            'seriesPurchases' => __('reports.series_purchases'),
            'seriesMargin' => __('reports.series_margin'),
            'axisAmount' => __('reports.axis_amount'),
            'pieTooltipGallons' => __('reports.pie_tooltip_gallons'),
            'pieTooltipShare' => __('reports.pie_tooltip_share'),
            'noData' => __('reports.no_data'),
        ];
    }

    /**
     * Bundle standalone de ECharts, inlineado en el HTML.
     *
     * Se lee del build de `vite.pdf.config.js`. Si el archivo no está (build
     * incompleto, `public/build` regenerado sin el segundo paso) es mejor fallar
     * con un mensaje claro que imprimir un PDF sin gráficos, que es exactamente
     * el "PDF incompleto" que ADR-018 §21 prohíbe.
     */
    private function chartsRuntime(): string
    {
        if (self::$chartsRuntime !== null) {
            return self::$chartsRuntime;
        }

        $path = public_path('build/pdf/sales-report.js');

        if (! is_file($path)) {
            throw new RuntimeException(
                'No se encontró el runtime de gráficos del PDF en public/build/pdf/sales-report.js. '
                .'Ejecutá `npm run build` (que encadena el build del PDF) antes de exportar.'
            );
        }

        $contents = file_get_contents($path);

        if ($contents === false) {
            throw new RuntimeException('No se pudo leer public/build/pdf/sales-report.js.');
        }

        return self::$chartsRuntime = $contents;
    }

    /**
     * Logo como data URI (ADR-018 §11: reutilizar el logo existente).
     *
     * Inlineado porque el HTML viaja en `file://`: una ruta a `/build/assets/…`
     * no resolvería. Además evita depender del hash que Vite asigna al archivo.
     */
    private function logoDataUri(): string
    {
        if (self::$logoDataUri !== null) {
            return self::$logoDataUri;
        }

        $path = resource_path('images/logo.png');

        if (! is_file($path)) {
            throw new RuntimeException('No se encontró el logo del sistema en resources/images/logo.png.');
        }

        $contents = file_get_contents($path);

        if ($contents === false) {
            throw new RuntimeException('No se pudo leer resources/images/logo.png.');
        }

        return self::$logoDataUri = 'data:image/png;base64,'.base64_encode($contents);
    }

    /**
     * `Content-Disposition` con nombre ASCII y campo `filename*` en UTF-8.
     *
     * El nombre solo lleva dígitos, guiones y guiones bajos, así que el par simple
     * basta; el extendido se manda igualmente por si algún día incluye el nombre
     * de la organización.
     */
    private function contentDisposition(string $fileName): string
    {
        return sprintf(
            'attachment; filename="%s"; filename*=UTF-8\'\'%s',
            $fileName,
            rawurlencode($fileName),
        );
    }
}