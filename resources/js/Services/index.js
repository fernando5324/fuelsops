import Advisors from './Advisors';
import Wholesalers from './Wholesalers';
import Plants from './Plants';
import Products from './Products';
import Customers from './Customers';
import Drivers from './Drivers';
import Vehicles from './Vehicles';
import OrderStatuses from './OrderStatuses';
import Users from './Users';

/**
 * Registro de Services por módulo (ADR-009).
 *
 * La página genérica resuelve aquí el Service de cada recurso a partir de
 * `config.resource`; cada módulo conserva su propio archivo y sus rutas
 * (objeto `routes` usado por Inertia + operaciones axios).
 *
 * Los módulos con página dedicada (p. ej. Asesores → Platform/Advisors/Index)
 * NO se registran aquí: su página importa su Service directamente.
 */
export const catalogServices = {
    wholesalers: Wholesalers,
    plants: Plants,
    products: Products,
    customers: Customers,
    drivers: Drivers,
    estados: OrderStatuses,
    users: Users,
};

export { default as Orders } from './Orders';
export { default as Media } from './Media';
export { default as Advisors } from './Advisors';
export { default as Wholesalers } from './Wholesalers';
export { default as Plants } from './Plants';
export { default as Products } from './Products';
export { default as Customers } from './Customers';
export { default as Drivers } from './Drivers';
export { default as Vehicles } from './Vehicles';
export { default as OrderStatuses } from './OrderStatuses';
export { default as Users } from './Users';