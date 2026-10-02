import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import esES from 'antd/locale/es_ES';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import ProcessingProvider from '@/Components/ProcessingProvider';
import ProcessingOverlay from '@/Components/ProcessingOverlay';
import { FALLBACK_BRAND, brandThemeTokens, cssColor } from '@/lib/brand';

dayjs.locale('es');

// Nombre interno del producto (config/brand.php). El título del navegador lo
// reemplaza por el nombre del CLIENTE (tenants.name): cada cliente ve el suyo.
let product = FALLBACK_BRAND.product;

createInertiaApp({
    title: (title) => (title ? `${title} - ${product}` : product),
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const brand = props.initialPage?.props?.brand || FALLBACK_BRAND;
        const colors = { ...FALLBACK_BRAND.colors, ...(brand.colors || {}) };

        product = brand.client || brand.product || product;

        const root = createRoot(el);

        root.render(
            <ConfigProvider
                locale={esES}
                theme={{
                    token: {
                        ...brandThemeTokens(colors),
                        borderRadius: 8,
                        fontFamily:
                            "'Figtree', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                    },
                    components: {
                        Card: { headerBg: colors.surface },
                    },
                }}
            >
                <AntApp>
                    <ProcessingProvider>
                        <App {...props} />
                        <ProcessingOverlay />
                    </ProcessingProvider>
                </AntApp>
            </ConfigProvider>,
        );
    },
    progress: {
        // Se lee la variable del `<style>` que imprime el servidor, porque esta
        // opción se evalúa antes de montar React.
        color: cssColor('--color-primary') || FALLBACK_BRAND.colors.primary,
    },
});
