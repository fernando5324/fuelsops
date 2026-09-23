import React from 'react';

/**
 * Encabezado de página del panel (ADR-006).
 *
 * Título dentro de la página, a la misma altura de las acciones (p. ej. el
 * botón "Nuevo"). El layout ya no pinta título en el Header superior.
 */
export default function PageHeader({ title, description, extra }) {
    return (
        <div className="ui-page-head">
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