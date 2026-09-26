import React from 'react';
import { Head } from '@inertiajs/react';

/**
 * Encabezado de página del panel (ADR-006).
 *
 * Título dentro de la página, a la misma altura de las acciones (p. ej. el
 * botón "Nuevo"). El layout ya no pinta título en el Header superior.
 *
 * `headTitle` (opcional) es el título para la pestaña del navegador
 * (document.title); por defecto usa `title`.
 */
export default function PageHeader({ title, description, extra, headTitle }) {
    return (
        <div className="ui-page-head">
            <Head title={headTitle ?? title} />
            <div className="ui-page-head-main">
                <h2 className="ui-page-title">{title}</h2>
                {description ? (
                    <p className="ui-page-subtitle">{description}</p>
                ) : null}
            </div>
            {extra ? <div className="ui-page-head-extra">{extra}</div> : null}
        </div>
    );
}