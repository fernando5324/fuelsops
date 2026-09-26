import { Descriptions, Space, Tag, Typography } from 'antd';
import useTranslations from '@/hooks/useTranslations';
import formatMoney from '@/lib/money';

const { Text } = Typography;

/**
 * Desglose del cálculo de precios con la FÓRMULA de cada paso (ADR-012).
 *
 * Muestra la cadena completa del motor (ADR-010 §16):
 *   P redondeado → Q sin IGV → S subtotal → T con IGV → U con percepción → V final
 *
 * Cada paso muestra su resultado y, debajo, la operación que lo produjo, para
 * que el usuario entienda de dónde sale el precio sin volver al Excel. Los
 * factores (IGV, margen, percepción) salen del propio resultado del motor
 * (`igv_rate`, `margin`, `perception_rate`), de modo que la fórmula cuadra
 * exactamente con el valor mostrado.
 *
 * Es un componente de presentación sin lógica de UI: lo reutilizan el modal de
 * "Ver cálculo" por fila, el drawer de "Ver cálculos", el preview en vivo del
 * modal de edición y el drawer de historial (a partir del snapshot).
 */
export default function CalculationBreakdown({ calc, wholesalerName, showHeader = true, compact = false }) {
    const { t } = useTranslations();

    if (!calc) {
        return <Text type="secondary">{t('pricing.no_calc_row')}</Text>;
    }

    const money = (value) => formatMoney(value, { digits: 4 });

    /**
     * El motor entrega strings decimales de 4 dígitos (bcmath), así que la
     * fórmula se arma con ese mismo literal y no con un formato de moneda
     * (evita que el separador de miles local se cuele en la operación).
     */
    const plain = (value) => {
        if (value === null || value === undefined || value === '') {
            return '—';
        }
        return typeof value === 'number' ? value.toFixed(4) : String(value);
    };

    // Factores del motor como decimales planos (1.1800, 1.0100, 0.1300).
    // El margen es un MONTO absoluto (S = Q + margen), no una tasa; IGV y
    // percepción sí son tasas (S × 1.18).
    const igv = Number(calc.igv_rate ?? 0);
    const perception = Number(calc.perception_rate ?? 0);
    const margin = Number(calc.margin ?? 0);
    const onePlusIgv = (1 + igv).toFixed(4);
    const onePlusPerception = (1 + perception).toFixed(4);
    const marginAmount = plain(calc.margin);

    const winner =
        wholesalerName ??
        calc.winner_wholesaler_id ??
        calc.wholesaler_id ??
        null;

    const steps = [
        {
            key: 'p',
            label: t('pricing.step_rounded'),
            value: calc.rounded_price ?? calc.best_price,
            formula: t('pricing.formula_rounded', {
                value: plain(calc.best_price),
                result: plain(calc.rounded_price ?? calc.best_price),
            }),
        },
        {
            key: 'q',
            label: t('pricing.step_purchase'),
            value: calc.purchase_price,
            formula: t('pricing.formula_purchase', {
                value: plain(calc.rounded_price ?? calc.best_price),
                divisor: onePlusIgv,
                result: plain(calc.purchase_price),
            }),
        },
        {
            key: 's',
            label: t('pricing.step_sale'),
            value: calc.sale_price,
            formula: t('pricing.formula_sale', {
                value: plain(calc.purchase_price),
                margin: marginAmount,
                result: plain(calc.sale_price),
            }),
        },
        {
            key: 't',
            label: t('pricing.step_sale_igv'),
            value: calc.sale_price_with_igv,
            formula: t('pricing.formula_sale_igv', {
                value: plain(calc.sale_price),
                factor: onePlusIgv,
                result: plain(calc.sale_price_with_igv),
            }),
        },
        {
            key: 'u',
            label: t('pricing.step_sale_perception'),
            value: calc.sale_price_with_perception,
            formula: t('pricing.formula_sale_perception', {
                value: plain(calc.sale_price_with_igv),
                factor: onePlusPerception,
                result: plain(calc.sale_price_with_perception),
            }),
        },
        {
            key: 'v',
            label: t('pricing.step_final'),
            value: calc.final_price,
            formula: t('pricing.formula_final', {
                value: plain(calc.sale_price_with_perception),
                result: plain(calc.final_price),
            }),
            bold: true,
        },
    ];

    return (
        <div className="ui-calc-breakdown">
            {showHeader ? (
                <Space direction="vertical" size={2} style={{ marginBottom: compact ? 8 : 12, width: '100%' }}>
                    <Space wrap>
                        <Tag color="green">{t('pricing.min_price')}</Tag>
                        <Text strong>{money(calc.best_price)}</Text>
                    </Space>
                    <Space wrap>
                        <Tag>{t('pricing.winner_wholesaler')}</Tag>
                        <Text>{winner ?? '—'}</Text>
                    </Space>
                </Space>
            ) : null}

            <Descriptions column={1} size="small" bordered>
                {steps.map((step) => (
                    <Descriptions.Item key={step.key} label={step.label}>
                        <div>
                            <Text strong={step.bold || false}>{money(step.value)}</Text>
                            <Text
                                type="secondary"
                                style={{ display: 'block', fontSize: 12, fontFamily: 'monospace' }}
                            >
                                {step.formula}
                            </Text>
                        </div>
                    </Descriptions.Item>
                ))}
            </Descriptions>

            {!compact && margin > 0 ? (
                <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                    {t('pricing.calc_factors', {
                        igv: (igv * 100).toFixed(2),
                        margin: marginAmount,
                        perception: (perception * 100).toFixed(2),
                    })}
                </Text>
            ) : null}
        </div>
    );
}
