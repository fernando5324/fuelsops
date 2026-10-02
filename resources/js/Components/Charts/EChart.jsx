import { Empty, Spin } from 'antd';
import { useEffect, useRef } from 'react';
import echarts from '@/lib/charts';

/**
 * Contenedor de un gráfico Apache ECharts (ADR-017).
 *
 * Es un wrapper mínimo a propósito: no hay `echarts-for-react` en el proyecto
 * (ADR-017 §21.7 pide instalar solo la dependencia necesaria), y lo que hace
 * falta es poco — crear la instancia, aplicar la opción, redimensionar y
 * liberarla.
 *
 * Decisiones que importan:
 *
 *  - `setOption(option, true)` (notMerge) cuando cambia la identidad del
 *    `option`. El `notMerge` descarta el estado interno de la leyenda, y eso
 *    exactamente es lo que se quiere: el `option` solo cambia cuando cambia el
 *    período del reporte, y al cambiar los datos la selección de productos
 *    debe volver al estado inicial. Si en cambio se actualizara con merge, al
 *    ocultar un producto en la leyenda y luego redibujar se quedaría
 *    desincronizado. Por eso el padre DEBE memoizar el `option` con `useMemo`:
 *    sin eso la leyenda se reinicia en cada render.
 *
 *  - `ResizeObserver` en lugar de un listener de `window.resize`: el gráfico
 *    también tiene que reaccionar cuando el contenedor cambia de tamaño sin que
 *    la ventana lo haga (columnas que colapsan, sidebar, drawer), que es el
 *    responsive real del panel (ADR-017 §19).
 *
 *  - `option == null` no dibuja un canvas vacío: muestra el estado vacío de
 *    antd (ADR-017 §17). Un gráfico con ceros se lee como "no pasaron cosas",
 *    que es un mensaje distinto de "no hay datos". El estado vacío es una CAPA
 *    superpuesta, no un árbol de render alternativo: ver el aviso de
 *    "el contenedor no se desmonta" abajo, que es la razón.
 *  - `chart.clear()` cuando no hay option, para que el estado vacío no quede
 *    encima de un gráfico del período anterior.
 *
 * ── El contenedor NO se puede condicionar a la existencia de datos ───────────
 *
 * El `echarts.init()` ocurre en un efecto de montaje con dependencias `[]`, y
 * solo si encuentra el contenedor. Si el render devolviera un árbol
 * alternativo cuando `option == null` (un `<div>` sin el `ref`), al entrar en
 * un período sin pedidos ese `ref` se perdería, el efecto de montaje correría
 * una única vez con `containerRef.current === null` y retornaría temprano: la
 * instancia nunca se crearía. Como el efecto no vuelve a correr, al filtrar
 * después a un período CON datos el `setOption` recibiría un `chartRef` nulo y
 * el gráfico quedaría en blanco para siempre — pareciendo un problema de datos
 * o de dimensiones, cuando en realidad nunca se inicializó nada.
 *
 * Por eso el `<div>` con el `ref` se renderiza siempre y el estado vacío va
 * encima. Beneficio adicional: `init()` siempre recibe un contenedor con tamaño
 * real, que es lo que evita el clásico canvas en 0×0 que no se repinta hasta el
 * siguiente `resize`.
 *
 * @param {object|null} option      Opción de ECharts, o null para el estado vacío.
 * @param {number} height           Alto en píxeles del área de dibujo.
 * @param {boolean} loading         Muestra un overlay de carga sobre el gráfico.
 * @param {string} emptyText        Texto del estado vacío.
 * @param {string} ariaLabel        Descripción accesible del gráfico.
 */
export default function EChart({ option, height = 320, loading = false, emptyText, ariaLabel }) {
    const containerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return undefined;
        }

        const chart = echarts.init(container, null, { renderer: 'canvas' });
        chartRef.current = chart;

        const observer = new ResizeObserver(() => chart.resize());
        observer.observe(container);

        return () => {
            observer.disconnect();
            chart.dispose();
            chartRef.current = null;
        };
    }, []);

    useEffect(() => {
        const chart = chartRef.current;

        if (!chart) {
            return;
        }

        if (!option) {
            // Sin datos se limpia el lienzo en vez de dejar el gráfico del
            // período anterior debajo del estado vacío.
            chart.clear();

            return;
        }

        chart.setOption(option, true);
    }, [option]);

    return (
        <div className="ui-chart" style={{ position: 'relative', height }}>
            <div
                ref={containerRef}
                className="ui-chart__canvas"
                style={{ width: '100%', height: '100%' }}
                role="img"
                aria-label={ariaLabel}
            />
            {!option && !loading ? (
                <div className="ui-chart__empty">
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
                </div>
            ) : null}
            {loading ? (
                <div className="ui-chart__loading">
                    <Spin />
                </div>
            ) : null}
        </div>
    );
}
