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
 *    que es un mensaje distinto de "no hay datos".
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

        if (!chart || !option) {
            return;
        }

        chart.setOption(option, true);
    }, [option]);

    if (!option) {
        return (
            <div className="ui-chart ui-chart--empty" style={{ height }} role="img" aria-label={ariaLabel}>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
            </div>
        );
    }

    return (
        <div className="ui-chart" style={{ position: 'relative', height }}>
            <div
                ref={containerRef}
                className="ui-chart__canvas"
                style={{ width: '100%', height: '100%' }}
                role="img"
                aria-label={ariaLabel}
            />
            {loading ? (
                <div className="ui-chart__loading">
                    <Spin />
                </div>
            ) : null}
        </div>
    );
}
