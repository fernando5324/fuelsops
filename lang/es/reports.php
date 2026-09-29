<?php

return [
    // ─── Reporte "Avance de ventas" (ADR-017) ─────────────────────────────────

    'title' => 'Avance de ventas',
    'description' => 'Resumen de ventas y márgenes por período',

    // Filtros
    'filter_month' => 'Mes',
    'filter_month_placeholder' => 'Mes con pedidos',
    'filter_range' => 'Rango de fechas',
    'filter_range_placeholder' => ['from' => 'Desde', 'to' => 'Hasta'],
    'filter_apply' => 'Filtrar',
    'filter_reset' => 'Limpiar',
    'filter_applied' => 'Período: :from — :to',
    'filter_days' => ':count día(s) con pedidos',

    // Nombres de mes para el selector. El backend solo manda el `YYYY-MM`; la
    // etiqueta se arma aquí para que los meses traducidos vivan en el archivo
    // i18n y no en PHP.
    'month_names' => [
        '1' => 'enero',
        '2' => 'febrero',
        '3' => 'marzo',
        '4' => 'abril',
        '5' => 'mayo',
        '6' => 'junio',
        '7' => 'julio',
        '8' => 'agosto',
        '9' => 'septiembre',
        '10' => 'octubre',
        '11' => 'noviembre',
        '12' => 'diciembre',
    ],
    'month_names_short' => [
        '1' => 'ene',
        '2' => 'feb',
        '3' => 'mar',
        '4' => 'abr',
        '5' => 'may',
        '6' => 'jun',
        '7' => 'jul',
        '8' => 'ago',
        '9' => 'set',
        '10' => 'oct',
        '11' => 'nov',
        '12' => 'dic',
    ],

    // Cards de resumen (ADR-017 §6)
    'total_gallons' => 'Total galones',
    'total_purchases' => 'Compras',
    'total_sales' => 'Ventas',
    'total_margin' => 'Margen',
    'unit_gallons' => 'gal',
    'cards_hint' => 'Del :orders pedido(s) del período',
    'margin_formula' => 'Suma de galones × margen de cada relación planta+producto (ADR-013)',

    // Gráfico de evolución (ADR-017 §7)
    'evolution_title' => 'Evolución de ventas y margen',
    'evolution_desc' => 'Compras y ventas en el eje izquierdo, margen en el derecho',
    'series_purchases' => 'Compras',
    'series_sales' => 'Ventas',
    'series_margin' => 'Margen',
    'axis_amount' => 'S/',
    'axis_gallons' => 'Galones',

    // Gráfico de galones por producto (ADR-017 §8/§9/§10)
    'pie_title' => 'Galones por producto',
    'pie_desc' => 'Use la leyenda para ocultar o mostrar un producto',
    'pie_tooltip_product' => 'Producto',
    'pie_tooltip_gallons' => 'Galones',
    'pie_tooltip_share' => 'Participación',
    'pie_hint' => 'Ocultar un producto no cambia los datos del reporte, solo la vista.',

    // Tabla "Resumen por día" (ADR-017 §11/§12)
    'daily_title' => 'Resumen por día',
    'daily_desc' => 'Solo los días con pedidos',
    'col_date' => 'Fecha',
    'col_gallons' => 'Total galones',
    'col_purchases' => 'Compras S/.',
    'col_sales' => 'Ventas S/.',
    'col_margin' => 'Margen S/.',
    'col_margin_per_gallon' => 'Margen S/. por galón',
    'total_row' => 'Total período',

    // Estados (ADR-017 §17)
    'empty_period' => 'Sin información para el período seleccionado',
    'empty_period_hint' => 'Pruebe con otro mes o amplíe el rango de fechas.',
    'no_data' => 'Sin datos',

    // Avisos de datos incompletos
    'missing_price' => ':count línea(s) del período no tienen precio de compra en la matriz de precios, por lo que no aportan a "Compras".',
    'missing_margin' => ':count línea(s) del período no tienen relación planta+producto en la matriz, por lo que no aportan al "Margen".',

    // Errores de filtro
    'invalid_month' => 'El mes seleccionado no es válido.',
    'invalid_date' => 'La fecha no es válida.',
    'invalid_range' => 'La fecha "Desde" no puede ser posterior a la fecha "Hasta".',
];
