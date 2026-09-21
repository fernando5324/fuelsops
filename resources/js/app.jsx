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

dayjs.locale('es');

const appName = import.meta.env.VITE_APP_NAME || 'Sertoco';

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
                        colorPrimary: '#1B3A6B',
                        colorInfo: '#1B3A6B',
                        colorLink: '#1B3A6B',
                        colorTextHeading: '#0F172A',
                        colorBgLayout: '#F8FAFC',
                        colorText: '#0F172A',
                        colorTextSecondary: '#64748B',
                        colorBorder: '#CBD5E1',
                        colorBorderSecondary: '#E2E8F0',
                        colorFillAlter: '#F1F5F9',
                        colorSuccess: '#10B981',
                        colorError: '#EF4444',
                        borderRadius: 8,
                        fontFamily:
                            "'Figtree', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                    },
                    components: {
                        Card: { headerBg: '#FFFFFF' },
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
        color: '#1B3A6B',
    },
});
