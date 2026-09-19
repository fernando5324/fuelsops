import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import esES from 'antd/locale/es_ES';
import ProcessingProvider from '@/Components/ProcessingProvider';
import ProcessingOverlay from '@/Components/ProcessingOverlay';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ConfigProvider
                locale={esES}
                theme={{
                    token: {
                        colorPrimary: '#1677ff',
                        borderRadius: 6,
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
        color: '#1677ff',
    },
});
