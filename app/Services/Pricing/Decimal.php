<?php

namespace App\Services\Pricing;

/**
 * Operaciones decimales exactas para el módulo de precios (ADR-010 §30).
 *
 * Los cálculos monetarios jamás deben usar float/double. Este helper envuelve
 * la extensión bcmath y expone un redondeo half-away-from-zero compatible con
 * la función REDONDEAR() del Excel (para valores positivos equivale al
 * redondeo half-up estándar).
 */
final class Decimal
{
    public const SCALE = 12;

    /** Escala interna de las operaciones en cadena. */
    public static int $scale = self::SCALE;

    public static function round(string $value, int $scale = 4): string
    {
        $negative = bccomp($value, '0', self::SCALE) < 0;

        $magnitude = $negative ? bcsub('0', $value, self::SCALE) : $value;
        $half = '0.' . str_repeat('0', $scale) . '5';

        $rounded = bcdiv(bcadd($magnitude, $half, self::SCALE), '1', $scale);

        return $negative ? bcsub('0', $rounded, $scale) : $rounded;
    }
}