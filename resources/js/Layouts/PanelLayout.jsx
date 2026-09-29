import React, { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Layout, Menu, Dropdown, Space, Avatar, theme } from 'antd';
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
    TagsOutlined,
    TagOutlined,
    MoneyCollectOutlined,
    BarChartOutlined,
} from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';
import logo from '../../images/logo.png';

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
        8: TagsOutlined,
    };

    const Icon = icons[index] || AppstoreOutlined;

    return <Icon />;
}

export default function PanelLayout({ children }) {
    const { auth, tenant } = usePage().props;
    const user = auth?.user;
    const { t } = useTranslations();
    const path = window.location.pathname;
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

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
    }

    const [openKeys, setOpenKeys] = useState(['catalogos', path.startsWith('/pedidos') ? 'pedidos' : null, path.startsWith('/precios') ? 'precios' : null, path.startsWith('/reportes') ? 'reportes' : null].filter(Boolean));

    useEffect(() => {
        setOpenKeys((prev) => {
            const next = new Set(prev);
            if (path.startsWith('/pedidos')) next.add('pedidos');
            if (path.startsWith('/precios')) next.add('precios');
            if (path.startsWith('/reportes')) next.add('reportes');
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

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider breakpoint="lg" collapsedWidth="64">
                <div
                    style={{
                        height: 48,
                        margin: 16,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 18,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <TagOutlined />
                    {tenant?.name}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    openKeys={openKeys}
                    onOpenChange={setOpenKeys}
                    items={items}
                />
            </Sider>
            <Layout>
                <Header
                    style={{
                        background: colorBgContainer,
                        paddingInline: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                    }}
                >
                    <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
                        <Space style={{ cursor: 'pointer' }}>
                            <Avatar icon={<UserOutlined />} />
                            <span>{user?.name}</span>
                        </Space>
                    </Dropdown>
                </Header>
                <Content style={{ margin: 24 }}>
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
        </Layout>
    );
}