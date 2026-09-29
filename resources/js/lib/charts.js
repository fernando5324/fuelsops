import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
    GridComponent,
    LegendComponent,
    TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

/**
 * Registro tree-shaken de Apache ECharts (ADR-017 §2/§21.7).
 *
 * Se importa desde `echarts/core` y se registran SOLO los tipos de gráfico y
 * componentes que usa el reporte "Avance de ventas": línea y barra para la
 * evolución, torta para la distribución por producto, más grid, leyenda y
 * tooltip. Traer el bundle completo de ECharts añadiría cerca de 1 MB al panel;
 * con este registro el costo es una fracción de eso.
 *
 * Para agregar un gráfico nuevo hay que registrar aquí su tipo y el componente
 * que necesite: ECharts ignora en silencio lo que no está registrado y el
 * gráfico sale en blanco sin ningún error en consola.
 */
echarts.use([
    BarChart,
    LineChart,
    PieChart,
    GridComponent,
    LegendComponent,
    TooltipComponent,
    CanvasRenderer,
]);

export default echarts;
