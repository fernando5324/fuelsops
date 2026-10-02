<!DOCTYPE html>
{{--
    Reporte "Avance de ventas" en PDF (ADR-018 §8).

    Esta es la PRIMERA vista Blade propia del proyecto: `app.blade.php` es el
    cascarón de Inertia y no sirve aquí. Es HTML y CSS de impresión, sin Ant
    Design ni React (ADR-018 §8): el PDF se genera desde esta vista, no desde la
    pantalla del panel.

    Todo va inlineado porque `Browsershot::html()` abre el documento con
    `file://`: no hay servidor al que pedir un `src`, así que el runtime de
    gráficos entra como <script> literal y el logo como data URI. De ahí que el
    servicio les pase `$chartsRuntime` y `$logo` ya resueltos.

    Los datos los pasó `SalesReportService` y no se recalcula nada aquí: es la
    misma fuente que alimenta la página web (ADR-018 §4/§19).
--}}
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <title>{{ $tenantName }} — {{ __('reports.pdf_brand') }}</title>
    <style>
        {{-- Pila de fuentes del SISTEMA, no la de Bunny Fonts que usa
             app.blade.php: una fuente descargada por CDN haría la impresión
             dependiente de la red y no determinista. --}}
        {{-- Paleta del cliente resuelta por `SalesReportPdfService` desde
             config/brand.php + tenants.details (ADR-019): aquí no se declara
             ningún hexadecimal. --}}
        :root {
            --navy: {{ $colors['primary'] }};
            --accent: {{ $colors['accent'] }};
            --ink: {{ $colors['ink'] }};
            --muted: {{ $colors['muted'] }};
            --line: {{ $colors['border'] }};
            --line-soft: {{ $colors['border_soft'] }};
            --soft: {{ $colors['fill_soft'] }};
        }

        @page {
            size: A4 portrait;
            margin: 0;
        }

        * { box-sizing: border-box; }

        html, body {
            margin: 0;
            padding: 0;
            color: var(--ink);
            /* Arial/Segoe UI antes que Figtree: Chromium no trae Figtree en este
               entorno y una fuente faltante cambia el ancho de las columnas. */
            font-family: "Segoe UI", Arial, Helvetica, sans-serif;
            font-size: 11px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .page { padding: 14mm 12mm 0; }

        h1, h2 { margin: 0; }

        /* ── Encabezado del reporte (ADR-018 §11) ─────────────────────────── */
        .head { border-bottom: 2px solid var(--navy); padding-bottom: 10px; }

        .head-row { display: flex; align-items: center; gap: 10px; }

        .head img.logo { height: 38px; width: auto; }

        .head-text h1 {
            font-size: 17px;
            letter-spacing: 0.06em;
            color: var(--navy);
        }

        .head-text p { margin: 2px 0 0; font-size: 10px; color: var(--muted); }

        .head-meta {
            margin-top: 10px;
            display: flex;
            gap: 18px;
            font-size: 10px;
            color: var(--muted);
        }

        .head-meta strong { color: var(--ink); font-weight: 600; }

        /* ── Cards de indicadores (ADR-018 §12) ───────────────────────────── */
        .cards {
            display: table;
            width: 100%;
            table-layout: fixed;
            margin-top: 14px;
        }

        .card-cell { display: table-cell; width: 25%; padding: 0 5px; }

        .card {
            border: 1px solid var(--line);
            border-top: 3px solid var(--navy);
            background: #fff;
            padding: 9px 10px;
        }

        .card.accent { border-top-color: var(--accent); }

        .card-label {
            font-size: 8.5px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--muted);
        }

        .card-value {
            margin-top: 5px;
            font-size: 15px;
            font-weight: 700;
            white-space: nowrap;
        }

        .card-value.navy { color: var(--navy); }
        .card-value.accent { color: var(--accent); }
        .card-value.dash { color: var(--muted); }

        /* ── Secciones (ADR-018 §10) ───────────────────────────────────────── */
        .section { margin-top: 16px; }

        .section-title {
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--navy);
            border-bottom: 1px solid var(--line);
            padding-bottom: 5px;
        }

        .section-desc { margin: 5px 0 0; font-size: 9.5px; color: var(--muted); }

        /* Los gráficos se dimensionan en px desde el JS con la MISMA constante
             para ambos: `height` explícito evita que el div quede a 0 antes de que
             ECharts mida el contenedor. */
        .chart { width: 100%; }
        #pdf-chart-evolution { height: 260px; }
        #pdf-chart-products { height: 280px; }

        /* ADR-018 §15: sin estado vacío inventado. Solo el borde. */
        .chart-empty {
            height: 120px;
            border: 1px dashed var(--line);
            background: var(--soft);
            color: var(--muted);
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* ── Tabla "Resumen por día" (ADR-018 §16) ────────────────────────── */
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }

        thead { display: table-header-group; }  /* §16/§27.18: se repite en cada página */

        tfoot { display: table-row-group; }     /* los totales SOLO al final, no repetidos */

        th {
            background: var(--soft);
            border-bottom: 1px solid var(--line);
            padding: 7px 6px;
            text-align: right;
            font-size: 8.5px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: var(--muted);
            white-space: nowrap;
        }

        th:first-child, td:first-child { text-align: left; }

        td {
            border-bottom: 1px solid var(--line-soft);
            padding: 6px;
            text-align: right;
            white-space: nowrap;
        }

        /* §16: una fila no se parte entre dos páginas. */
        tr { break-inside: avoid; page-break-inside: avoid; }

        tbody tr.total td {
            border-top: 2px solid var(--navy);
            border-bottom: 2px solid var(--navy);
            background: var(--soft);
            font-weight: 700;
        }

        .dash { color: var(--muted); }

        .note {
            margin-top: 14px;
            padding: 8px 10px;
            background: var(--soft);
            border-left: 3px solid var(--accent);
            font-size: 9px;
            color: var(--muted);
        }

        .empty {
            margin-top: 8px;
            border: 1px dashed var(--line);
            background: var(--soft);
            padding: 18px;
            text-align: center;
            color: var(--muted);
        }

        .empty strong { display: block; color: var(--ink); font-size: 11px; margin-bottom: 3px; }
    </style>
</head>
<body>
    <div class="page">
        {{-- Encabezado (ADR-018 §11) --}}
        <header class="head">
            <div class="head-row">
                {{-- Data URI: el logo viaja dentro del HTML, no por HTTP. --}}
                <img class="logo" src="{{ $logo }}" alt="{{ $tenantName }}">
                <div class="head-text">
                    <h1>{{ $tenantName }}</h1>
                    <p>{{ __('reports.pdf_brand') }}</p>
                </div>
            </div>
            <div class="head-meta">
                <span>{{ __('reports.filter_applied', [
                    'from' => \Illuminate\Support\Carbon::parse($period['from'])->format('d/m/Y'),
                    'to' => \Illuminate\Support\Carbon::parse($period['to'])->format('d/m/Y'),
                ]) }}</span>
                <span>{{ __('reports.orders_count', ['count' => $summary['orders_count'] ?? 0]) }}</span>
                <span>{{ __('reports.pdf_generated_at', [
                    'date' => now()->format('d/m/Y'),
                    'time' => now()->format('H:i'),
                ]) }}</span>
            </div>
        </header>

        {{-- Indicadores (ADR-018 §12). Cuatro tarjetas con los MISMOS valores
             del summary que la web muestra. --}}
        <section class="cards">
            @php
                // `—` donde no hay dato. Nunca "S/ 0.00": un guion largo dice la
                // verdad sobre un precio o margen que no existe (ADR-013/ADR-017).
                $dash = '—';
                // El símbolo de moneda viene de `$format` (config/brand.php),
                // no de un literal 'S/' repetido en la vista.
                $symbol = $format['symbol'] ?? 'S/';
                $money = fn ($value) => $value === null
                    ? $dash
                    : $symbol . ' ' . number_format((float) $value, 2, '.', ',');
            @endphp

            <div class="card-cell">
                <div class="card">
                    <div class="card-label">{{ __('reports.total_gallons') }}</div>
                    <div class="card-value navy">
                        {{ number_format((float) ($summary['total_gallons'] ?? 0), 2, '.', ',') }}
                        <span style="font-size:9px;color:var(--muted);font-weight:400">{{ __('reports.unit_gallons') }}</span>
                    </div>
                </div>
            </div>
            <div class="card-cell">
                <div class="card">
                    <div class="card-label">{{ __('reports.total_purchases') }}</div>
                    <div class="card-value {{ ($summary['total_purchases'] ?? null) === null ? 'dash' : '' }}">{{ $money($summary['total_purchases'] ?? null) }}</div>
                </div>
            </div>
            <div class="card-cell">
                <div class="card">
                    <div class="card-label">{{ __('reports.total_sales') }}</div>
                    <div class="card-value navy">{{ $money($summary['total_sales'] ?? null) }}</div>
                </div>
            </div>
            <div class="card-cell">
                <div class="card accent">
                    <div class="card-label">
                        {{ __('reports.total_margin') }}
                        @if (($summary['margin_per_gallon'] ?? null) !== null)
                            · {{ $symbol }} {{ number_format((float) $summary['margin_per_gallon'], 2, '.', ',') }}/{{ __('reports.unit_gallons') }}
                        @endif
                    </div>
                    <div class="card-value accent {{ ($summary['total_margin'] ?? null) === null ? 'dash' : '' }}">{{ $money($summary['total_margin'] ?? null) }}</div>
                </div>
            </div>
        </section>

        {{-- Gráfico de evolución (ADR-018 §13) --}}
        <section class="section">
            <h2 class="section-title">{{ __('reports.evolution_title') }}</h2>
            <p class="section-desc">{{ __('reports.evolution_desc') }}</p>
            @if ($hasData)
                <div id="pdf-chart-evolution" class="chart"></div>
            @else
                <div class="chart-empty">{{ __('reports.empty_period') }}</div>
            @endif
        </section>

        {{-- Torta de galones por producto (ADR-018 §15) --}}
        <section class="section">
            <h2 class="section-title">{{ __('reports.pie_title') }}</h2>
            <p class="section-desc">{{ __('reports.pie_desc') }}</p>
            @if (count($products) > 0)
                <div id="pdf-chart-products" class="chart"></div>
            @else
                <div class="chart-empty">{{ __('reports.empty_period') }}</div>
            @endif
        </section>

        {{-- Tabla "Resumen por día" (ADR-018 §16/§17) --}}
        <section class="section">
            <h2 class="section-title">{{ __('reports.daily_title') }}</h2>
            <p class="section-desc">{{ $hasData ? __('reports.daily_desc') : '' }}</p>

            @if ($hasData)
                <table>
                    <thead>
                        <tr>
                            <th>{{ __('reports.col_date') }}</th>
                            <th>{{ __('reports.col_gallons') }}</th>
                            <th>{{ __('reports.col_purchases') }}</th>
                            <th>{{ __('reports.col_sales') }}</th>
                            <th>{{ __('reports.col_margin') }}</th>
                            <th>{{ __('reports.col_margin_per_gallon') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($daily as $row)
                            <tr>
                                <td>{{ \Illuminate\Support\Carbon::parse($row['date'])->format('d/m/Y') }}</td>
                                <td>{{ number_format((float) $row['total_gallons'], 2, '.', ',') }}</td>
                                <td class="{{ ($row['purchases'] ?? null) === null ? 'dash' : '' }}">{{ $money($row['purchases'] ?? null) }}</td>
                                <td>{{ $money($row['sales'] ?? null) }}</td>
                                <td class="{{ ($row['margin'] ?? null) === null ? 'dash' : '' }}">{{ $money($row['margin'] ?? null) }}</td>
                                <td class="{{ ($row['margin_per_gallon'] ?? null) === null ? 'dash' : '' }}">{{ ($row['margin_per_gallon'] ?? null) === null ? $dash : $symbol . ' ' . number_format((float) $row['margin_per_gallon'], 2, '.', ',') }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                    {{-- §17: los totales van en `tfoot` con `display: table-row-group`
                         para que NO se repitan en cada página repetida del encabezado. --}}
                    <tfoot>
                        <tr class="total">
                            <td>{{ __('reports.total_row') }}</td>
                            <td>{{ number_format((float) ($summary['total_gallons'] ?? 0), 2, '.', ',') }}</td>
                            <td class="{{ ($summary['total_purchases'] ?? null) === null ? 'dash' : '' }}">{{ $money($summary['total_purchases'] ?? null) }}</td>
                            <td>{{ $money($summary['total_sales'] ?? null) }}</td>
                            <td class="{{ ($summary['total_margin'] ?? null) === null ? 'dash' : '' }}">{{ $money($summary['total_margin'] ?? null) }}</td>
                            <td class="{{ ($summary['margin_per_gallon'] ?? null) === null ? 'dash' : '' }}">{{ ($summary['margin_per_gallon'] ?? null) === null ? $dash : $symbol . ' ' . number_format((float) $summary['margin_per_gallon'], 2, '.', ',') }}</td>
                        </tr>
                    </tfoot>
                </table>
            @else
                <div class="empty">
                    <strong>{{ __('reports.empty_period') }}</strong>
                    {{ __('reports.empty_period_hint') }}
                </div>
            @endif

            {{-- La fórmula del margen va impresa en el PDF. Es el dato que más se
                 malinterpreta en una reunión: el margen NO es "ventas menos
                 compras", es la suma de galones × margen de cada relación
                 planta+producto (ADR-013). --}}
            <div class="note">{{ __('reports.margin_formula') }}</div>
        </section>
    </div>

    {{--
        Runtime de ECharts, inlineado (ADR-018 §14).

        Primero se define `__pdfChartsReady = false` y al final se invoca el render:
        Browsershot espera esa bandera con `waitForFunction`, de modo que el PDF
        solo se pagina cuando los gráficos están pintados de verdad. Los datos
        viajan en un `<script type="application/json">` para no interpolarlos en
        una cadena JS (nombres de producto con comillas o saltos de línea
        romperían el script).
    --}}
    <script>window.__pdfChartsReady = false;</script>
    <script id="pdf-report-data" type="application/json">{!! json_encode([
        'daily' => array_values($daily),
        'products' => array_values($products),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) !!}</script>
    <script id="pdf-report-labels" type="application/json">{!! json_encode($labels, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) !!}</script>
    <script>{!! $chartsRuntime !!}</script>
    <script>
        (function () {
            var read = function (id) {
                var node = document.getElementById(id);

                return node ? JSON.parse(node.textContent) : { daily: [], products: [] };
            };

            window.__renderSalesReportCharts(read('pdf-report-data'), read('pdf-report-labels'));
        })();
    </script>
</body>
</html>