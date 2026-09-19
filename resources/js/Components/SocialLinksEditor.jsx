import { Input, Typography, Space } from 'antd';
import {
    LinkedinOutlined,
    FacebookOutlined,
    InstagramOutlined,
    TikTokOutlined,
    YoutubeOutlined,
    GithubOutlined,
    TwitterOutlined,
    LinkOutlined,
} from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';

/**
 * Catálogo base de plataformas sociales (compatible con Organizaciones).
 * Puede extenderse desde el consumidor vía la prop `platforms` (p. ej.
 * Responsables añade `website`).
 */
export const SOCIAL_PLATFORMS = [
    { key: 'linkedin', icon: <LinkedinOutlined /> },
    { key: 'facebook', icon: <FacebookOutlined /> },
    { key: 'instagram', icon: <InstagramOutlined /> },
    { key: 'tiktok', icon: <TikTokOutlined /> },
    { key: 'youtube', icon: <YoutubeOutlined /> },
    { key: 'github', icon: <GithubOutlined /> },
    { key: 'twitter', icon: <TwitterOutlined /> },
];

/**
 * Editor controlado de redes sociales opcionales. Guarda un objeto
 * `{ platform: url }` (solo las redes con URL). Controlado por AntD Form,
 * con name `['settings', 'social_links']`.
 *
 * value/onChange: { linkedin: 'https://...', facebook: 'https://...', ... }
 *
 * @param {object} props
 * @param {object} [props.value]
 * @param {Function} [props.onChange]
 * @param {Array}   [props.platforms]   Catálogo de plataformas (clave + icono).
 * @param {string}  [props.namespace]   Namespace de traducción para las claves
 *                                      `social_hint`, `social_placeholder` y
 *                                      `social_<platform>` (por defecto
 *                                      `organizations`).
 */
export default function SocialLinksEditor({
    value,
    onChange,
    platforms = SOCIAL_PLATFORMS,
    namespace = 'organizations',
}) {
    const { t } = useTranslations();
    const links = value || {};

    const updateLink = (platform, url) => {
        const next = { ...links };
        if (url && url.trim() !== '') {
            next[platform] = url.trim();
        } else {
            delete next[platform];
        }
        onChange?.(next);
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }} size={2}>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                {t(`${namespace}.social_hint`)}
            </Typography.Paragraph>
            {platforms.map(({ key, icon }) => (
                <div
                    key={key}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}
                >
                    <span
                        style={{
                            width: 28,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            color: 'rgba(0,0,0,0.65)',
                        }}
                    >
                        {icon}
                    </span>
                    <span className="social-label">
                        <Typography.Text>{t(`${namespace}.social_${key}`)}</Typography.Text>
                    </span>
                    <Input
                        allowClear
                        type="url"
                        value={links[key] || ''}
                        onChange={(e) => updateLink(key, e.target.value)}
                        placeholder={t(`${namespace}.social_placeholder`)}
                        style={{ flex: 1 }}
                    />
                </div>
            ))}
        </Space>
    );
}