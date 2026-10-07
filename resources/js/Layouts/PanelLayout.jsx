import React, { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Layout, Menu, Dropdown, Space, Avatar, theme, Button, Drawer, Grid } from 'antd';
import {
    DashboardOutlined,
    FileTextOutlined,
    TeamOutlined,
    UserOutlined,
    LogoutOutlined,
    IdcardOutlined,
    ShopOutlined,
    AppstoreOutlined,
    EnvironmentOutlined,
    ProductOutlined,
    TruckOutlined,
    CarOutlined,
    HomeOutlined,
    MoneyCollectOutlined,
    BarChartOutlined,
    SettingOutlined,
    MenuOutlined,
} from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';
import { useBrand } from '@/lib/brand';

const { Sider, Header, Content } = Layout;

function iconFor(index) {
    const icons = {
        0: HomeOutlined,
        1: EnvironmentOutlined,
        2: ShopOutlined,
        3: ProductOutlined,
        4: TeamOutlined,
        5: IdcardOutlined,
        6: TruckOutlined,
        7: CarOutlined,
    };

    const Icon = icons[index] || AppstoreOutlined;

    return <Icon />;
}

export default function PanelLayout({ children }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const brand = useBrand();
    const { t } = useTranslations();
    const path = window.location.pathname;
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const screens = Grid.useBreakpoint();
    const isMobile = screens.lg === false;
    const [drawerOpen, setDrawerOpen] = useState(false);

    const catalogLinks = [
        { key: 'asesores', label: <Link href="/catalogos/asesores">{t('menus.advisors')}</Link>, icon: iconFor(0) },
        { key: 'mayoristas', label: <Link href="/catalogos/mayoristas">{t('menus.wholesalers')}</Link>, icon: iconFor(1) },
        { key: 'plantas', label: <Link href="/catalogos/plantas">{t('menus.plants')}</Link>, icon: iconFor(2) },
        { key: 'productos', label: <Link href="/catalogos/productos">{t('menus.products')}</Link>, icon: iconFor(3) },
        { key: 'clientes', label: <Link href="/catalogos/clientes">{t('menus.customers')}</Link>, icon: iconFor(4) },
        { key: 'conductores', label: <Link href="/catalogos/conductores">{t('menus.drivers')}</Link>, icon: iconFor(5) },
        { key: 'vehiculos', label: <Link href="/catalogos/vehiculos">{t('menus.vehicles')}</Link>, icon: iconFor(6) },
        { key: 'estados', label: <Link href="/catalogos/estados">{t('menus.order_statuses')}</Link>, icon: iconFor(7) },
    ];

    const items = [
        { key: 'dashboard', icon: <DashboardOutlined />, label: <Link href="/panel">{t('menus.dashboard')}</Link> },
        {
            key: 'pedidos',
            icon: <FileTextOutlined />,
            label: t('menus.orders'),
            children: [
                { key: 'pedidos-list', label: <Link href="/pedidos">{t('menus.orders')}</Link> },
                { key: 'papelera', label: <Link href="/pedidos/papelera">{t('menus.trash')}</Link> },
            ],
        },
        {
            key: 'catalogos',
            icon: <AppstoreOutlined />,
            label: t('menus.catalogs'),
            children: catalogLinks,
        },
        { key: 'usuarios', icon: <TeamOutlined />, label: <Link href="/usuarios">{t('menus.users')}</Link> },
        {
            key: 'precios',
            icon: <MoneyCollectOutlined />,
            label: t('menus.pricing'),
            children: [
                { key: 'precios-admin', label: <Link href="/precios">{t('menus.pricing')}</Link> },
                { key: 'precios-import', label: <Link href="/precios/importar">{t('menus.pricing_import')}</Link> },
            ],
        },
        {
            key: 'reportes',
            icon: <BarChartOutlined />,
            label: t('menus.reports'),
            children: [
                {
                    key: 'reportes-ventas',
                    label: <Link href="/reportes/avance-ventas">{t('menus.sales_report')}</Link>,
                },
            ],
        },
        // Configuración (ADR-026): solo el dueño de la organización ve y
        // edita la configuración (el backend responde 403 al resto).
        ...(user?.is_owner
            ? [
                  {
                      key: 'configuracion',
                      icon: <SettingOutlined />,
                      label: t('menus.settings'),
                      children: [
                          {
                              key: 'config-compania',
                              label: <Link href="/configuracion/compania">{t('menus.company')}</Link>,
                          },
                          {
                              key: 'config-sistema',
                              label: <Link href="/configuracion/sistema">{t('menus.system')}</Link>,
                          },
                      ],
                  },
              ]
            : []),
    ];

    let selectedKey = 'dashboard';
    if (path.startsWith('/pedidos/papelera')) {
        selectedKey = 'papelera';
    } else if (path.startsWith('/pedidos')) {
        selectedKey = 'pedidos';
    } else if (path.startsWith('/catalogos')) {
        selectedKey = 'catalogos';
    } else if (path.startsWith('/usuarios')) {
        selectedKey = 'usuarios';
    } else if (path.startsWith('/precios/importar')) {
        selectedKey = 'precios-import';
    } else if (path.startsWith('/precios')) {
        selectedKey = 'precios-admin';
    } else if (path.startsWith('/reportes')) {
        selectedKey = 'reportes-ventas';
    } else if (path.startsWith('/configuracion/sistema')) {
        selectedKey = 'config-sistema';
    } else if (path.startsWith('/configuracion')) {
        selectedKey = 'config-compania';
    }

    const [openKeys, setOpenKeys] = useState(['catalogos', path.startsWith('/pedidos') ? 'pedidos' : null, path.startsWith('/precios') ? 'precios' : null, path.startsWith('/reportes') ? 'reportes' : null, path.startsWith('/configuracion') ? 'configuracion' : null].filter(Boolean));

    useEffect(() => {
        setOpenKeys((prev) => {
            const next = new Set(prev);
            if (path.startsWith('/pedidos')) next.add('pedidos');
            if (path.startsWith('/precios')) next.add('precios');
            if (path.startsWith('/reportes')) next.add('reportes');
            if (path.startsWith('/configuracion')) next.add('configuracion');
            return [...next];
        });
    }, [path]);

    const userMenu = {
        items: [
            {
                key: 'profile',
                icon: <UserOutlined />,
                label: <Link href="/profile">{t('menus.profile')}</Link>,
            },
            {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: t('auth.logout'),
                onClick: () => {
                    router.post('/logout');
                },
            },
        ],
    };

    // El mismo menú vive en el Sider (escritorio) y en el Drawer (móvil):
    // compartir las props mantiene selección y submenús abiertos sincronizados.
    const menuProps = {
        theme: 'dark',
        mode: 'inline',
        selectedKeys: [selectedKey],
        openKeys,
        onOpenChange: setOpenKeys,
        items,
    };

    // Marca del cliente en chip blanco sobre el sidebar oscuro (ver .ui-sidebar-brand).
    const brandBlock = (
        <div className="ui-sidebar-brand">
            <img src={brand.logo} alt={brand.client} />
        </div>
    );

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {!isMobile && (
                <Sider breakpoint="lg" collapsedWidth="64">
                    {brandBlock}
                    <Menu {...menuProps} />
                </Sider>
            )}
            <Layout>
                <Header
                    style={{
                        background: colorBgContainer,
                        paddingInline: isMobile ? 12 : 24,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    {isMobile && (
                        <Button
                            type="text"
                            icon={<MenuOutlined />}
                            aria-label={t('menus.open_menu')}
                            onClick={() => setDrawerOpen(true)}
                            style={{ fontSize: 18 }}
                        />
                    )}
                    <span style={{ flex: 1 }} />
                    <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
                        <Space style={{ cursor: 'pointer' }}>
                            <Avatar icon={<UserOutlined />} />
                            <span>{user?.name}</span>
                        </Space>
                    </Dropdown>
                </Header>
                <Content className="ui-main-content">
                    <div
                        className="ui-panel-content"
                        style={{
                            padding: 24,
                            background: colorBgContainer,
                            borderRadius: borderRadiusLG,
                            minHeight: 'calc(100vh - 120px)',
                        }}
                    >
                        {children}
                    </div>
                </Content>
            </Layout>

            {isMobile && (
                <Drawer
                    className="ui-menu-drawer"
                    placement="left"
                    size={280}
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    closable={false}
                >
                    {brandBlock}
                    <Menu {...menuProps} onClick={() => setDrawerOpen(false)} />
                </Drawer>
            )}
        </Layout>
    );
}