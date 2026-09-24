import { Button, Space } from 'antd';
import {
    DownloadOutlined,
    EyeOutlined,
    FileImageOutlined,
    FilePdfOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import SectionCard from '@/Components/SectionCard';
import Media from '@/Services/Media';
import useTranslations from '@/hooks/useTranslations';
import formatFileSize from '@/lib/files';

function fileIcon(file) {
    const ext = (file?.extension || '').toLowerCase();
    const type = (file?.mime_type || '').toLowerCase();

    if (ext === 'pdf' || type.includes('pdf')) {
        return <FilePdfOutlined />;
    }
    if (type.startsWith('image/')) {
        return <FileImageOutlined />;
    }
    return <FileTextOutlined />;
}

export default function OrderDocuments({ files = [], compact = false }) {
    const { t } = useTranslations();

    return (
        <SectionCard title={t('order.documents')}>
            {files.length === 0 ? (
                <p className="ui-empty-note">{t('order.no_documents')}</p>
            ) : (
                <div className="ui-order-docs">
                    {files.map((f) => (
                        <div className="ui-order-doc" key={f.id}>
                            <span className="ui-order-doc-icon">{fileIcon(f)}</span>
                            <div className="ui-order-doc-main">
                                <div className="ui-order-doc-name">
                                    {f.original_name || f.file_name}
                                </div>
                                <div className="ui-order-doc-meta">
                                    {f.extension?.toUpperCase()}
                                    {f.file_size ? ` · ${formatFileSize(f.file_size)}` : ''}
                                </div>
                            </div>
                            {compact ? (
                                <a
                                    className="ui-icon-link"
                                    href={Media.routes.download(f.id)}
                                    aria-label={t('common.download')}
                                >
                                    <DownloadOutlined />
                                </a>
                            ) : (
                                <Space>
                                    <Button
                                        type="link"
                                        icon={<EyeOutlined />}
                                        href={Media.routes.download(f.id)}
                                        target="_blank"
                                    >
                                        {t('order.open_document')}
                                    </Button>
                                    <Button
                                        type="link"
                                        icon={<DownloadOutlined />}
                                        href={Media.routes.download(f.id)}
                                    >
                                        {t('common.download')}
                                    </Button>
                                </Space>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </SectionCard>
    );
}