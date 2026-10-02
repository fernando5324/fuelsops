# Diseño UX/UI — Exportación a PDF del reporte "Avance de ventas"

> Documento de diseño de la funcionalidad descrita en `ADR-018.md`
> ("Exportación PDF del reporte Avance de ventas utilizando Browsershot").
> Complementa a `ADR-017.md`, que define la página web del reporte.

## 1. Objetivo

Permitir que el usuario descargue el reporte "Avance de ventas" de un período
determinado en PDF, listo para imprimir o para compartir, **sin que los números
del archivo puedan diferir de los que muestra la pantalla**.

El PDF no es una segunda versión del reporte: es la misma información del mismo
cálculo, recibida por otra capa de presentación. Esa es la razón de que el
servicio de agregación (`SalesReportService`, de ADR-017) sea el único que
consulta la base y las dos salidas lo consuman.

## 2. Dónde vive la acción

El botón "Exportar PDF" está en el encabezado de la página "Avance de ventas",
junto a las acciones de período (mes y rango), para que la descarga se pida
siempre con el filtro que se está viendo:

```
┌──────────────────────────────────────────────────────────────┐
│ Avance de ventas                    [Exportar PDF] [Aplicar] │
│ [Seleccionar mes ▾] [Rango: … – …]          [Limpiar]       │
└──────────────────────────────────────────────────────────────┘
```

Decisiones de interacción:

* **Usa los filtros vigentes** (§27.2). El botón no abre un diálogo propio con
  fechas: el período que se exporta es el que se está viendo, sin pasos
  intermedios ni posibilidad de exportar algo distinto de lo que se lee.
* **Deshabilitado mientras se está aplicando un filtro**, igual que los demás
  controles, para no exportar un período que la pantalla todavía no muestra.
* **Muestra un estado de carga** durante la generación (Chromium tarda varios
  segundos), porque si no el usuario vuelve a hacer clic y duplica el trabajo.

## 3. Por qué descarga por `fetch` y no con un `<a href>`

La opción obvia sería un enlace que apunte a la ruta de exportación. Se descartó
por el manejo de errores (§21):

| | `<a href>` | `fetch` + blob |
|---|---|---|
| PDF correcto | descarga | descarga |
| Chromium caído | el navegador navega a la página de error y el usuario pierde el contexto | llega el `catch` y se muestra un aviso |
| Filtro inválido | el servidor redirige y el usuario aterriza en otra página | se muestra el mensaje del backend |

Con un enlace, un fallo de generación deja al usuario en una página de error sin
saber qué pasó ni poder reintentar. El Service (`resources/js/Services/SalesReports.js`)
devuelve `{ blob, fileName }` y la página dispara el `<a download>`; el nombre lo
calcula el backend, así que el archivo que se guarda en disco coincide con el
`Content-Disposition` del servidor.

## 4. Estructura del documento impreso

El PDF es A4 vertical. El orden de lectura va de lo general a lo detallado, y cada
sección lleva su título para que se pueda citar en una reunión sin explicar la
hoja:

```
┌────────────────────────────────────────────┐
│ [logo]  Sertoco                            │
│         Avance de ventas                   │
│         Período: 01/09/2026 — 30/09/2026   │
│         4 pedido(s) en el período         │
│         Generado el 01/10/2026 a las 02:22 │
├────────────────────────────────────────────┤
│ ┌────────┬────────┬────────┬────────┐       │
│ │Total   │Compras │ Ventas │ Margen │       │
│ │galones │S/.     │ S/.    │ S/.    │       │
│ │4,757.00│67,401.60│90,732.40│390.00 │       │
│ │gal     │        │        │·0.08/gal│      │
│ └────────┴────────┴────────┴────────┘       │
├────────────────────────────────────────────┤
│ EVOLUCIÓN DIARIA                            │
│ [gráfico de líneas: ventas, compras, margen]│
├────────────────────────────────────────────┤
│ GALONES POR PRODUCTO                       │
│ [torta]                                     │
├────────────────────────────────────────────┤
│ RESUMEN POR DÍA                             │
│ Fecha | Galones | Compras | Ventas | …      │
│ …                                        │
│ TOTAL PERÍODO | 4,757.00 | … | S/ 390.00   │
│ ┌────────────────────────────────────────┐ │
│ │ Suma de galones × margen de cada      │ │
│ │ relación planta+producto (ADR-013)    │ │
│ └────────────────────────────────────────┘ │
│              Sertoco · Avance de ventas    │
│              Página 1 de 2                  │
└────────────────────────────────────────────┘
```

### 4.1 Los cuatro indicadores

`table-layout: fixed` con cuatro celdas iguales y borde superior de 3 px: la
primera y la tercera en azul marino (`#1B3A6B`, los datos), la segunda neutra
(compras, que es referencia) y la cuarta con borde naranja (`#F47920`, el margen,
que es lo que interesa ver de un vistazo).

### 4.2 El guion largo como dato ausente

Cuando un precio o un margen **no existe**, el PDF imprime `—`, nunca
`S/ 0.00`. Un cero afirma que alguien ganó cero; un guion dice que no hay dato.
Es la misma regla que usa la web (`ADR-013`, `ADR-017`).

### 4.3 La fórmula del margen, impresa

Al pie de la tabla va una nota con la fórmula real del margen:

> Suma de galones × margen de cada relación planta+producto (ADR-013)

Es deliberada: el margen es el dato que más se malinterpreta en una reunión, y
muchos asumen que es "ventas menos compras". Imprimir la fórmula evita tener que
explicarla cada vez y deja el archivo autoexplicativo aunque se comparta suelto.

### 4.4 Tipografía y paginación

* Pila del **sistema** (`Segoe UI`, Arial), no la de Bunny Fonts que usa la
  aplicación: una fuente descargada por CDN haría la impresión dependiente de la
  red y no determinista.
* `-webkit-print-color-adjust: exact` para que los fondos de las tablas y el pie
  de página se impriman.
* `thead { display: table-header-group; }` repite el encabezado de columnas si la
  tabla pasa de página, y `tfoot { display: table-row-group; }` evita que los
  totales se repitan en cada página.
* `tr { break-inside: avoid; }` para que una fila no se parta a la mitad.
* El pie con la marca y "Página X de Y" lo dibuja Chromium en el margen
  inferior (`footerTemplate`), no el HTML, y por eso lleva estilos en línea.

## 5. Estado sin datos

Un período sin pedidos produce un PDF **válido y completo**, no un error:

* Las cuatro cards muestran `0` en galones y `—` en los importes sin dato.
* Cada gráfico se sustituye por un recuadro punteado con "Sin información para
  el período seleccionado".
* La tabla se sustituye por el mismo mensaje con una pista.
* El pie y el encabezado se siguen imprimiendo: el archivo se lee solo.

Es la alternativa a inventar un gráfico en cero, que se lee como "no pasaron
cosas", que es un mensaje distinto de "no hay datos".

## 6. Errores

| Situación | Qué ve el usuario |
|---|---|
| Período inválido (mes `2026-13`, rango invertido) | Mensaje del backend en la página: "El mes seleccionado no es válido." |
| Chromium no disponible o falla | Aviso de error; el detalle técnico queda solo en el log |
| Sin sesión | Redirección a `/login` |

Ningún error produce un archivo. En particular, una respuesta que **no** sea
`application/pdf` se detecta antes de guardarla: sin esa comprobación, un 422 o un
500 que llegan como `blob` se descargarían como un archivo llamado
`avance-ventas.pdf` lleno de texto de error, que es el peor resultado posible
porque parece un PDF y no abre.

El detalle técnico va a `storage/logs/laravel.log` con el período, la
organización, el usuario y el archivo:línea del fallo.

## 7. Accesibilidad y detalle menor

* El botón lleva `icon={<FilePdfOutlined />}`. No necesita `aria-label` propio:
  su texto ("Exportar PDF") ya es la etiqueta accesible, y duplicarla en un
  `aria-label` haría que un lector de pantalla leyera el nombre dos veces.
* El botón se deshabilita durante la generación para impedir descargas duplicadas.
* El archivo lleva el período en el nombre
  (`sertoco_avance_ventas_2026-09-01_2026-09-30.pdf`), que es lo que hace único
  al archivo: el reporte se puede volver a pedir las veces que haga falta y los
  PDF no se pisan entre sí.
* El PDF no lleva el nombre de quien lo descargó. Se documenta como decisión
  consciente: el archivo se comparte por correo y el nombre del usuario en un
  documento impreso se lee como dato personal innecesario. El `generated_by`
  queda en el log del servidor, que es donde se consulta si hace falta.

## 8. Verificación

Implementación y criterios de aceptación: `ADR-018.md` §28, donde está el
detalle de los 25 criterios y de los tres fallos reales que aparecieron al
verificar contra el host virtual.

## 9. Los gráficos de la página web (no del PDF)

El PDF usa `resources/js/lib/reportCharts.js` directamente sobre un canvas; esta
sección es sobre los dos gráficos de la pantalla, que comparten
`resources/js/Components/Charts/EChart.jsx` con el resto del panel.

`EChart.jsx` monta **siempre** su contenedor `.ui-chart__canvas` y, cuando no
hay `option`, llama `chart.clear()` en lugar de dejar el dibujo anterior. La
versión anterior hacía render condicional (`if (!option) return <div/>`), y eso
rompía el flujo de filtro: el `useEffect` de inicialización (`useEffect(..., [])`)
corre una sola vez, veía `containerRef.current === null` mientras no había datos
y se iba, así que **`echarts.init()` nunca se llamaba**; al filtrar a un período
con datos el `option` llegaba pero no existía instancia y ambos gráficos quedaban
en blanco, sin ningún error en consola. En sentido inverso, la instancia quedaba
con el frame viejo dibujado **debajo** del `Empty`.

El estado vacío se comunica con un overlay `.ui-chart__empty` (position
absolute) que cubre el `Empty` o el `loading` sin desmontar el contenedor ni la
instancia, de modo que volver a tener datos solo requiere un `setOption` sobre la
misma instancia.

Verificación: `sales_report_web_test.mjs` (34/34) recorre el ciclo completo
**sin recargar** —período vacío → septiembre → vacío → septiembre— comprobando
que los dos gráficos se pintan en cada vuelta, que el `Empty` aparece y
desaparece, que no queda un gráfico residual bajo el `Empty` y que la descarga
del PDF y el filtro inválido siguen funcionando.