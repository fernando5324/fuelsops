import { useEffect, useState } from 'react';
import { Upload, Button, Image, Space } from 'antd';
import {
    UploadOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    EyeOutlined,
} from '@ant-design/icons';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Campo genérico de subida de imagen (logo, favicon, etc.), controlado por
 * AntD Form. Reutiliza el mismo contrato y flujo que ImageCoverUpload pero
 * con textos parametrizables por props (no depende de traducciones de
 * artículos), de modo que pueda usarse en varios módulos.
 *
 * Contrato de value/onChange:
 *   value = { file: File|null, previewUrl: string|null, url: string|null }
 * - Al editar, `url`/`previewUrl` es la URL pública del archivo existente y
 *   `file` es null hasta que el usuario elija uno nuevo.
 * - `beforeUpload` devuelve false: no se sube al servidor al seleccionar, solo
 *   se previsualiza; la subida real ocurre en el submit del formulario.
 *
 * @param {object}   props
 * @param {object}   props.value
 * @param {Function} props.onChange
 * @param {string}   [props.uploadText]    Texto del botón para subir/nuevo.
 * @param {string}   [props.replaceText]   Texto del botón para reemplazar.
 * @param {string}   [props.removeText]    Texto del botón para quitar.
 * @param {string}   [props.viewText]      Texto del botón para abrir en otra pestaña.
 * @param {string}   [props.previewAlt]    Texto alternativo de la previsualización.
 * @param {string}   [props.saveOnSubmit]  Aviso de que la imagen se guarda al guardar.
 * @param {string}   [props.errorType]     Mensaje de error de formato.
 * @param {string}   [props.errorSize]     Mensaje de error de tamaño.
 * @param {number}   [props.maxWidth]      Ancho máximo para el preview (px).
 * @param {number}   [props.maxHeight]     Alto máximo para el preview (px).
 */
export default function MediaImageField({
    value,
    onChange,
    uploadText = 'Subir',
    replaceText = 'Reemplazar',
    removeText = 'Quitar',
    viewText = 'Ver',
    previewAlt = '',
    saveOnSubmit = '',
    errorType = 'Formato no permitido (solo JPG, PNG o WebP).',
    errorSize = 'La imagen supera el tamaño máximo de 10 MB.',
    maxWidth = 480,
    maxHeight = 260,
}) {
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
            setError(errorType);
            return Upload.LIST_IGNORE;
        }

        if (file.size > MAX_SIZE_BYTES) {
            setError(errorSize);
            return Upload.LIST_IGNORE;
        }

        setError(null);

        // Redimensiona/comprime la imagen en el cliente (máx 2560px, JPEG 0.82)
        // para que viaje liviana en el FormData. Coherente con ADR-067.
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

    const compressImage = (file) =>
        new Promise((resolve, reject) => {
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
                            resolve(null);
                            return;
                        }
                        resolve(new File([blob], 'image.jpg', { type: 'image/jpeg' }));
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
                        alt={previewAlt}
                        width="100%"
                        style={{
                            maxWidth,
                            maxHeight,
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
                        {hasNew || preview ? replaceText : uploadText}
                    </Button>
                </Upload>

                {preview && (
                    <Button danger icon={<DeleteOutlined />} onClick={onRemove}>
                        {removeText}
                    </Button>
                )}

                {preview && (
                    <Button
                        icon={<EyeOutlined />}
                        onClick={() => window.open(preview, '_blank')}
                    >
                        {viewText}
                    </Button>
                )}
            </Space>

            {hasNew && (
                <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12, marginTop: 8 }}>
                    {saveOnSubmit}
                </div>
            )}

            {error && (
                <div style={{ color: '#ff4d4f', fontSize: 13, marginTop: 8 }}>{error}</div>
            )}
        </div>
    );
}