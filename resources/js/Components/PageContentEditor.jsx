import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { useEffect, useState } from 'react';
import { Button, Space, Divider, Modal, Input, Select, Radio, Segmented } from 'antd';
import {
    BoldOutlined,
    ItalicOutlined,
    StrikethroughOutlined,
    OrderedListOutlined,
    UnorderedListOutlined,
    LinkOutlined,
    UndoOutlined,
    RedoOutlined,
    PictureOutlined,
    LineOutlined,
    TableOutlined,
} from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';

/**
 * Editor de contenido de Páginas (ADR-071).
 *
 * Es el editor restringido del documento de cada página: el administrador
 * organiza el CONTENIDO del documento (texto, título/subtítulo, listas, citas,
 * separadores, enlaces externos/internos, imágenes y tablas sencillas), pero
 * NO decide la presentación visual (la plantilla la define; ADR-059).
 *
 * Comparado con el editor de Artículos, se excluyen las decisiones de diseño:
 * alineación, color, resaltado, sub/superíndice, listas de tareas y código.
 */
export default function PageContentEditor({ value, onChange, placeholder, pageOptions = [] }) {
    const { t } = useTranslations();

    const [linkModal, setLinkModal] = useState(false);
    const [linkMode, setLinkMode] = useState('external');
    const [linkUrl, setLinkUrl] = useState('');
    const [linkPage, setLinkPage] = useState(undefined);
    const [imageModal, setImageModal] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [imageAlt, setImageAlt] = useState('');

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // Código y bloques de código fuera del catálogo de contenido (ADR-071).
                code: false,
                codeBlock: false,
                heading: {
                    levels: [2, 3, 4],
                },
            }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: {
                    rel: 'noopener',
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            Image.configure({
                inline: false,
                allowBase64: false,
                HTMLAttributes: {
                    class: 'tiptap-image',
                },
            }),
            Table.configure({
                resizable: false,
                HTMLAttributes: {
                    class: 'tiptap-table',
                },
            }),
            TableRow,
            TableCell,
            TableHeader,
        ],
        content: value || '',
        onUpdate: ({ editor }) => {
            onChange(editor.getJSON());
        },
    });

    // Sincroniza el editor cuando el valor cambia externamente (edición/reinicio).
    useEffect(() => {
        if (!editor) {
            return;
        }

        const current = JSON.stringify(editor.getJSON());

        if (JSON.stringify(value || '') !== current) {
            editor.commands.setContent(value || '');
        }
    }, [value, editor]);

    if (!editor) {
        return null;
    }

    const toggleButton = ({ label, active, onClick, icon }) => (
        <Button
            type={active ? 'primary' : 'text'}
            size="small"
            title={label}
            aria-label={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            icon={icon}
        />
    );

    const openLinkModal = () => {
        const previousUrl = editor.getAttributes('link').href || '';
        setLinkMode('external');
        setLinkUrl(previousUrl);
        setLinkPage(undefined);

        if (previousUrl.startsWith('/') && previousUrl.length > 1) {
            const target = pageOptions.find((o) => o.slug === previousUrl.slice(1));
            if (target) {
                setLinkMode('internal');
                setLinkPage(target.id);
            }
        }

        setLinkModal(true);
    };

    const applyLink = () => {
        let href = '';

        if (linkMode === 'internal' && linkPage) {
            const target = pageOptions.find((o) => o.id === linkPage);
            href = `/${target.slug}`;
        } else {
            href = linkUrl.trim();
        }

        if (href === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
            editor
                .chain()
                .focus()
                .extendMarkRange('link')
                .setLink({ href })
                .run();
        }
        setLinkModal(false);
    };

    const applyImage = () => {
        const src = imageUrl.trim();
        if (!src) {
            return;
        }

        editor
            .chain()
            .focus()
            .setImage({
                src,
                alt: imageAlt.trim() || undefined,
                title: imageAlt.trim() || undefined,
            })
            .run();

        setImageModal(false);
    };

    const insertTable = () => {
        editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
    };

    const tableActive = editor.isActive('table');

    return (
        <div className="tiptap-editor">
            <Space
                wrap
                style={{
                    border: '1px solid #d9d9d9',
                    borderBottom: 'none',
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    padding: '4px 8px',
                    background: '#fafafa',
                    width: '100%',
                    rowGap: 4,
                }}
            >
                <Button
                    type="text"
                    size="small"
                    title={t('tiptap.undo')}
                    aria-label={t('tiptap.undo')}
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    icon={<UndoOutlined />}
                />
                <Button
                    type="text"
                    size="small"
                    title={t('tiptap.redo')}
                    aria-label={t('tiptap.redo')}
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    icon={<RedoOutlined />}
                />

                <Divider type="vertical" />

                {toggleButton({
                    label: t('tiptap.bold'),
                    active: editor.isActive('bold'),
                    onClick: () => editor.chain().focus().toggleBold().run(),
                    icon: <BoldOutlined />,
                })}
                {toggleButton({
                    label: t('tiptap.italic'),
                    active: editor.isActive('italic'),
                    onClick: () => editor.chain().focus().toggleItalic().run(),
                    icon: <ItalicOutlined />,
                })}
                {toggleButton({
                    label: t('tiptap.strike'),
                    active: editor.isActive('strike'),
                    onClick: () => editor.chain().focus().toggleStrike().run(),
                    icon: <StrikethroughOutlined />,
                })}

                <Divider type="vertical" />

                {toggleButton({
                    label: t('tiptap.heading2'),
                    active: editor.isActive('heading', { level: 2 }),
                    onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                })}
                {toggleButton({
                    label: t('tiptap.heading3'),
                    active: editor.isActive('heading', { level: 3 }),
                    onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
                })}
                {toggleButton({
                    label: t('tiptap.heading4'),
                    active: editor.isActive('heading', { level: 4 }),
                    onClick: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
                })}

                <Divider type="vertical" />

                {toggleButton({
                    label: t('tiptap.bullet_list'),
                    active: editor.isActive('bulletList'),
                    onClick: () => editor.chain().focus().toggleBulletList().run(),
                    icon: <UnorderedListOutlined />,
                })}
                {toggleButton({
                    label: t('tiptap.ordered_list'),
                    active: editor.isActive('orderedList'),
                    onClick: () => editor.chain().focus().toggleOrderedList().run(),
                    icon: <OrderedListOutlined />,
                })}
                {toggleButton({
                    label: t('tiptap.blockquote'),
                    active: editor.isActive('blockquote'),
                    onClick: () => editor.chain().focus().toggleBlockquote().run(),
                })}
                {toggleButton({
                    label: t('tiptap.horizontal_rule'),
                    active: false,
                    onClick: () => editor.chain().focus().setHorizontalRule().run(),
                    icon: <LineOutlined />,
                })}

                <Divider type="vertical" />

                {toggleButton({
                    label: t('tiptap.table_insert'),
                    active: tableActive,
                    onClick: insertTable,
                    icon: <TableOutlined />,
                })}
                <Button
                    type="text"
                    size="small"
                    title={t('tiptap.table_add_row')}
                    aria-label={t('tiptap.table_add_row')}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                    disabled={!tableActive}
                >
                    +
                </Button>
                <Button
                    type="text"
                    size="small"
                    title={t('tiptap.table_add_column')}
                    aria-label={t('tiptap.table_add_column')}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor.chain().focus().addColumnAfter().run()}
                    disabled={!tableActive}
                >
                    +
                </Button>
                <Button
                    type="text"
                    size="small"
                    title={t('tiptap.table_delete_row')}
                    aria-label={t('tiptap.table_delete_row')}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor.chain().focus().deleteRow().run()}
                    disabled={!tableActive}
                >
                    −
                </Button>
                <Button
                    type="text"
                    size="small"
                    title={t('tiptap.table_delete_column')}
                    aria-label={t('tiptap.table_delete_column')}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor.chain().focus().deleteColumn().run()}
                    disabled={!tableActive}
                >
                    −
                </Button>
                <Button
                    type="text"
                    size="small"
                    title={t('tiptap.table_delete')}
                    aria-label={t('tiptap.table_delete')}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor.chain().focus().deleteTable().run()}
                    disabled={!tableActive}
                >
                    ✕
                </Button>

                <Divider type="vertical" />

                {toggleButton({
                    label: t('tiptap.link'),
                    active: editor.isActive('link'),
                    onClick: openLinkModal,
                    icon: <LinkOutlined />,
                })}
                {toggleButton({
                    label: t('tiptap.image'),
                    active: editor.isActive('image'),
                    onClick: () => {
                        setImageUrl('');
                        setImageAlt('');
                        setImageModal(true);
                    },
                    icon: <PictureOutlined />,
                })}
            </Space>

            <EditorContent editor={editor} className="tiptap-editor-content" />

            <Modal
                open={linkModal}
                title={t('tiptap.link')}
                okText={t('tiptap.link_apply')}
                cancelText={t('tiptap.link_cancel')}
                onOk={applyLink}
                onCancel={() => setLinkModal(false)}
                destroyOnHidden
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Segmented
                        block
                        value={linkMode}
                        onChange={setLinkMode}
                        options={[
                            { value: 'external', label: t('tiptap.link_external') },
                            { value: 'internal', label: t('tiptap.link_internal') },
                        ]}
                    />

                    {linkMode === 'external' ? (
                        <Input
                            placeholder="https://..."
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            onPressEnter={applyLink}
                            autoFocus
                        />
                    ) : (
                        <>
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder={t('tiptap.link_internal_placeholder')}
                                style={{ width: '100%' }}
                                value={linkPage}
                                onChange={setLinkPage}
                                options={pageOptions.map((option) => ({
                                    value: option.id,
                                    label: option.title || `/${option.slug}`,
                                }))}
                                autoFocus
                            />
                            <Input
                                disabled
                                readOnly
                                placeholder={t('tiptap.link_internal_hint')}
                            />
                        </>
                    )}
                </Space>
            </Modal>

            <Modal
                open={imageModal}
                title={t('tiptap.image_add')}
                okText={t('tiptap.image_apply')}
                cancelText={t('tiptap.image_cancel')}
                onOk={applyImage}
                onCancel={() => setImageModal(false)}
                destroyOnHidden
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Input
                        placeholder="https://..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        onPressEnter={applyImage}
                        autoFocus
                    />
                    <Input
                        placeholder={t('tiptap.image_alt')}
                        value={imageAlt}
                        onChange={(e) => setImageAlt(e.target.value)}
                        allowClear
                    />
                </Space>
            </Modal>
        </div>
    );
}