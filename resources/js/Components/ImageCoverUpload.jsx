import { useEffect, useState } from 'react';
import { Upload, Button, Image, Space } from 'antd';
import {
    UploadOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const DEFAULT_LABELS = {
    upload: 'articles.cover_upload',
    replace: 'articles.cover_replace',
    remove: 'articles.cover_remove',
    view: 'articles.cover_view',
    previewAlt: 'articles.cover_preview_alt',
    savedOnSubmit: 'articles.cover_saved_on_submit',
    errorType: 'articles.cover_error_type',
    errorSize: 'articles.cover_error_size',
};

/**
 * Campo de subida de imagen (controlado por AntD Form). Reutilizable por
 * artículos (portada) y banners.
 *
 * - beforeUpload devuelve false: la imagen NO se sube al servidor al
 *   seleccionarla, solo se previsualiza en el cliente. La subida real ocurre
 *   cuando el usuario guarda el formulario completo (submit), donde el `File`
 *   seleccionado viaja en el payload (Inertia lo convierte a FormData).
 *
 * - value/onChange siguen el contrato de AntD Form:
 *     value = { file: File|null, previewUrl: string|null, removed: boolean }
 *   Al editar, `previewUrl` es la URL pública de la imagen existente y `file`
 *   es null hasta que el usuario elija una imagen nueva.
 *
 * - `allowRemove` (default true): si es false se oculta el botón "Quitar" y la
 *   imagen solo se puede reemplazar (p. ej. banners con media_file_id NOT NULL).
 *
 * - `labels`: overrides opcionales de los textos (claves de traducción o texto
 *   literal); por defecto usa las claves de artículos.
 */
export default function ImageCoverUpload({ value, onChange, allowRemove = true, labels }) {
    const { t } = useTranslations();
    const L = { ...DEFAULT_LABELS, ...(labels || {}) };
    const resolve = (key) => (key.startsWith('.') || key.includes(' ')) ? key : t(key);

    const [preview, setPreview] = useState(value?.previewUrl || value?.url || null);
    const [hasNew, setHasNew] = useState(false);
    const [error, setError] = useState(null);

    // Sincroniza la previsualización cuando el valor cambia externamente (edición).
    useEffect(() => {
        const src = value?.previewUrl || value?.url || null;
        if (src !== preview) {
            setPreview(src);
            setHasNew(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value?.previewUrl, value?.url]);

    const beforeUpload = async (file) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError(resolve(L.errorType));
            return Upload.LIST_IGNORE;
        }

        if (file.size > MAX_SIZE_BYTES) {
            setError(resolve(L.errorSize));
            return Upload.LIST_IGNORE;
        }

        setError(null);

        // Redimensiona/comprime la imagen en el cliente para que el archivo
        // viaje liviano en el FormData y no se dispare el descarte del body
        // por límites de tamaño del servidor (nginx client_max_body_size /
        // PHP post_max_size). Se mantiene coherente con ADR-067 (máx 2560px,
        // sin upscale). Devuelve siempre un JPEG; si el redimensionado no es
        // posible (formato no soportado por canvas), usa el archivo original.
        let out = file;
        try {
            const optimized = await compressImage(file);
            if (optimized) out = optimized;
        } catch {
            out = file;
        }

        const objectUrl = URL.createObjectURL(out);
        setPreview(objectUrl);
        setHasNew(true);
        onChange?.({ file: out, previewUrl: objectUrl, removed: false });
        return false;
    };

    // Lee la imagen, la escala proporcionalmente a máx 2560px de ancho (sin
    // upscale) y la exporta como JPEG con calidad 0.82 para reducir su peso.
    const compressImage = (file) =>
        new Promise((resolvePromise, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const MAX_WIDTH = 2560;
                const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
                const w = Math.round(img.naturalWidth * scale);
                const h = Math.round(img.naturalHeight * scale);

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                URL.revokeObjectURL(url);
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolvePromise(null);
                            return;
                        }
                        resolvePromise(
                            new File([blob], 'image.jpg', { type: 'image/jpeg' })
                        );
                    },
                    'image/jpeg',
                    0.82
                );
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('load failed'));
            };
            img.src = url;
        });

    const onRemove = () => {
        setPreview(null);
        setHasNew(false);
        setError(null);
        onChange?.({ file: null, previewUrl: null, removed: true });
    };

    return (
        <div>
            {preview && (
                <Space
                    direction="vertical"
                    size={8}
                    style={{ width: '100%', marginBottom: 12 }}
                >
                    <Image
                        src={preview}
                        alt={resolve(L.previewAlt)}
                        width="100%"
                        style={{
                            maxWidth: 480,
                            maxHeight: 260,
                            objectFit: 'cover',
                            borderRadius: 6,
                            border: '1px solid #d9d9d9',
                        }}
                    />
                    {hasNew && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                </Space>
            )}

            <Space wrap>
                <Upload
                    accept="image/jpeg,image/png,image/webp"
                    showUploadList={false}
                    beforeUpload={beforeUpload}
                >
                    <Button icon={<UploadOutlined />}>
                        {hasNew
                            ? resolve(L.replace)
                            : preview
                              ? resolve(L.replace)
                              : resolve(L.upload)}
                    </Button>
                </Upload>

                {allowRemove && preview && (
                    <Button danger icon={<DeleteOutlined />} onClick={onRemove}>
                        {resolve(L.remove)}
                    </Button>
                )}

                {preview && (
                    <Button
                        icon={<EyeOutlined />}
                        onClick={() => window.open(preview, '_blank')}
                    >
                        {resolve(L.view)}
                    </Button>
                )}
            </Space>

            {hasNew && (
                <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12, marginTop: 8 }}>
                    {resolve(L.savedOnSubmit)}
                </div>
            )}

            {error && (
                <div style={{ color: '#ff4d4f', fontSize: 13, marginTop: 8 }}>{error}</div>
            )}
        </div>
    );
}