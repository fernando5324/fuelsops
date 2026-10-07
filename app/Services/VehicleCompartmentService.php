<?php

namespace App\Services;

use App\Models\Vehicle;
use App\Models\VehicleCompartment;
use Illuminate\Support\Facades\DB;

/**
 * Plantilla de compartimentos de una cisterna (`vehicle_compartments`,
 * ADR-023).
 *
 * La plantilla la crea y reconcilia el motor de pedidos en cada alta/edición
 * ("última realidad gana", `OrderService::reconcileVehicleCompartments`).
 * Este servicio expone la MISMA lógica para la edición manual desde el panel:
 * reemplazar el set completo respetando la numeración, sin duplicar criterios
 * (el número de cada cámara sale de su posición 1..N en el payload).
 */
class VehicleCompartmentService
{
    /**
     * Lista los compartimentos de la cisterna para el editor del panel.
     *
     * @return array<int, array{id: int, compartment_number: int, scop: string|null, volume: string, is_active: bool}>
     */
    public function forVehicle(Vehicle $vehicle): array
    {
        return $vehicle->compartments()
            ->orderBy('compartment_number')
            ->get(['id', 'compartment_number', 'scop', 'volume', 'is_active'])
            ->map(function (VehicleCompartment $compartment) {
                return [
                    'id' => $compartment->id,
                    'compartment_number' => (int) $compartment->compartment_number,
                    'scop' => $compartment->scop,
                    'volume' => (string) $compartment->volume,
                    'is_active' => (bool) $compartment->is_active,
                ];
            })
            ->all();
    }

    /**
     * Reemplaza el set de compartimentos de la cisterna (transacción):
     *
     * - da de baja lógica los que ya no están en el payload;
     * - actualiza SCOP/volumen de los que coinciden por numeración;
     * - crea los que falten.
     *
     * Un set vacío deja la cisterna sin cámaras declaradas (el motor de
     * pedidos no la toca hasta que un pedido vuelva a declarar distribución).
     *
     * @param array<int, array{scop?: string|null, volume: float|int|string}> $rows
     */
    public function save(Vehicle $vehicle, array $rows): void
    {
        $declared = [];
        $number = 0;

        foreach ($rows as $row) {
            $number++;

            $declared[$number] = [
                'scop' => trim((string) ($row['scop'] ?? '')),
                'volume' => $row['volume'],
            ];
        }

        DB::transaction(function () use ($vehicle, $declared) {
            $current = VehicleCompartment::where('vehicle_id', $vehicle->id)
                ->orderBy('compartment_number')
                ->get();

            foreach ($current as $template) {
                $n = (int) $template->compartment_number;

                if (! array_key_exists($n, $declared)) {
                    $template->delete();

                    continue;
                }

                $changes = [];

                if ($template->scop !== $declared[$n]['scop']) {
                    $changes['scop'] = $declared[$n]['scop'];
                }

                // bccomp a 2 decimales porque la columna es DECIMAL(12,2) y el
                // formulario puede mandar "2" donde la plantilla tiene "2.00".
                if (bccomp((string) $template->volume, (string) $declared[$n]['volume'], 2) !== 0) {
                    $changes['volume'] = $declared[$n]['volume'];
                }

                if ($changes !== []) {
                    $template->update($changes);
                }
            }

            foreach ($declared as $n => $data) {
                if ($current->contains('compartment_number', $n)) {
                    continue;
                }

                VehicleCompartment::create([
                    'tenant_id' => $vehicle->tenant_id,
                    'vehicle_id' => $vehicle->id,
                    'compartment_number' => $n,
                    'scop' => $data['scop'] ?: null,
                    'volume' => $data['volume'],
                    'is_active' => 1,
                    'created_by' => auth()->id() ?? (int) config('platform.system_user_id', 999999),
                ]);
            }
        });
    }
}