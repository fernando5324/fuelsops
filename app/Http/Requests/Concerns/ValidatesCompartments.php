<?php

namespace App\Http\Requests\Concerns;

/**
 * Validación compartida de la distribución por compartimentos (ADR-015).
 *
 * La usan `PublicOrderStoreRequest` (formulario público) y `UpdateOrderRequest`
 * (edición del pedido en el panel) porque el campo "Cantidad de compartimentos"
 * y su tabla son obligatorios en ambos casos.
 *
 * Dos reglas de negocio que el backend tiene que garantizar, porque el frontend
 * solo las sugiere en pantalla:
 *
 *  1. La cantidad declarada de compartimentos debe coincidir con la cantidad de
 *     filas enviadas. La cantidad NO se persiste: es el COUNT de la tabla, así
 *     que si se aceptara un desajuste, la fila nueva quedaría mintiendo sobre
 *     cuántos compartimentos tiene el pedido.
 *  2. El producto y el SCOP de cada compartimento deben existir como una línea
 *     del detalle del mismo pedido ("No se puede agregar otro que no esté en
 *     este listado"). Un envío manipulado no puede meter un producto ajeno.
 */
trait ValidatesCompartments
{
    /**
     * Reglas de los campos de la distribución por compartimentos.
     *
     * @return array<string, array<int, mixed>>
     */
    protected function compartmentRules(): array
    {
        return [
            'compartment_count' => ['required', 'integer', 'min:1', 'max:50'],
            'compartments' => ['required', 'array', 'min:1'],
            'compartments.*.product_id' => ['required', 'integer'],
            'compartments.*.scop' => ['required', 'string', 'max:50'],
            'compartments.*.volume' => ['required', 'numeric', 'gt:0', 'decimal:0,2'],
        ];
    }

    /**
     * Nombres amigables para los mensajes de validación de los compartimentos.
     *
     * @return array<string, string>
     */
    protected function compartmentAttributes(): array
    {
        return [
            'compartment_count' => __('order.compartment_count'),
            'compartments' => __('order.section_compartments'),
            'compartments.*.product_id' => __('order.product'),
            'compartments.*.scop' => __('order.scop'),
            'compartments.*.volume' => __('order.volume_gal'),
        ];
    }

    /**
     * Reglas de negocio que no se pueden expresar con una regla simple.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $rows = $this->input('compartments');
            $count = $this->input('compartment_count');

            if (! is_array($rows) || ! is_numeric($count)) {
                return;
            }

            if ((int) $count !== count($rows)) {
                $validator->errors()->add('compartment_count', __('order.compartment_count_mismatch'));

                return;
            }

            // El producto y el SCOP de cada compartimento deben ser una línea
            // del detalle que se está guardando en este mismo pedido.
            $detailLines = [];

            foreach ((array) $this->input('details', []) as $detail) {
                if (! is_array($detail) || ! isset($detail['product_id'], $detail['scop'])) {
                    continue;
                }

                $detailLines[$detail['product_id'].'|'.trim((string) $detail['scop'])] = true;
            }

            foreach ($rows as $index => $row) {
                if (! is_array($row) || ! isset($row['product_id'], $row['scop'])) {
                    continue;
                }

                $key = $row['product_id'].'|'.trim((string) $row['scop']);

                if (! isset($detailLines[$key])) {
                    $validator->errors()->add(
                        "compartments.{$index}.product_id",
                        __('order.compartment_not_in_detail')
                    );
                }
            }
        });
    }
}
