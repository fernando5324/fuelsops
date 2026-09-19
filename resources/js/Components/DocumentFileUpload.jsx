import { Button, Space, Typography, Upload, App } from 'antd';
import { DeleteOutlined, DownloadOutlined, FilePdfOutlined, PaperClipOutlined, UploadOutlined } from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';

const { Text } = Typography;

/**
 * Upload de un Documento informativo (PDF, máx 10 MB) para un servicio
 * (ADR-076). Modelo: { file: File | null, removed: boolean, existingUrl, existingName }.
 *
 * No sube el archivo por separado: se adjunta al FormData del formulario que lo
 * monta (mismo patrón que ImageCoverUpload). El documento actual incluye un
 * enlace que abre el link directo del archivo en otra pestaña (no vista previa
 * dentro de la plataforma).
 */
export default function DocumentFileUpload({ value, onChange }) {
    const { t } = useTranslations();
    const { message } = App.useApp();
    const valueObj = value || {};

    const beforeUpload = (file) => {
        const isPdf = file.type === 'application/pdf';
        if (!isPdf) {
            message.error(t('services.informational_document_invalid'));
            return Upload.LIST_IGNORE;
        }
        if (file.size > 10 * 1024 * 1024) {
            message.error(t('services.informational_document_large'));
            return Upload.LIST_IGNORE;
        }
        onChange?.({ ...valueObj, file, removed: false });
        return false;
    };

    const handleRemove = () => {
        onChange?.({ ...valueObj, file: null, removed: !!valueObj.existingName });
    };

    // Tras "Quitar documento" se conserva existingName para saber que hubo
    // archivo previo (removed: true): la fila debe desaparecer de inmediato.
    const hasFile = valueObj?.file || (valueObj?.existingName && !valueObj?.removed);

    // Enlace de descarga del archivo actual: solo cuando existe uno persistido
    // y no hay un reemplazo pendiente de subir.
    const showDownload =
        !!valueObj?.existingName &&
        !!valueObj?.existingUrl &&
        !valueObj?.removed &&
        !valueObj?.file;

    return (
        <div>
            {hasFile && (
                <Space wrap style={{ marginBottom: 8, width: '100%' }}>
                    <FilePdfOutlined style={{ fontSize: 20, color: '#f5222d' }} />
                    {valueObj.file ? (
                        <Text>{valueObj.file.name}</Text>
                    ) : (
                        <Button
                            type="link"
                            style={{ padding: 0 }}
                            icon={<DownloadOutlined />}
                            href={valueObj.existingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {valueObj.existingName}
                        </Button>
                    )}
                    {showDownload && (
                        <Button
                            size="small"
                            type="text"
                            icon={<DownloadOutlined />}
                            href={valueObj.existingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {t('services.informational_document_download')}
                        </Button>
                    )}
                    <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={handleRemove}
                    >
                        {t('services.informational_document_remove')}
                    </Button>
                </Space>
            )}
            <Upload
                beforeUpload={beforeUpload}
                maxCount={1}
                showUploadList={false}
                accept=".pdf,application/pdf"
            >
                <Button icon={<UploadOutlined />}>
                    {t('services.informational_document_upload')}
                </Button>
            </Upload>
        </div>
    );
}