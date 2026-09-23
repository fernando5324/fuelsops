import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useEffect, useState } from 'react';
import { Button, Space, Divider, Dropdown, Modal, Input } from 'antd';
import {
    BoldOutlined,
    ItalicOutlined,
    UnderlineOutlined,
    OrderedListOutlined,
    UnorderedListOutlined,
    LinkOutlined,
    UndoOutlined,
    RedoOutlined,
    AlignLeftOutlined,
    AlignCenterOutlined,
    AlignRightOutlined,
    CodeOutlined,
    PictureOutlined,
    CheckSquareOutlined,
    LineOutlined,
    StrikethroughOutlined,
    ClearOutlined,
    BgColorsOutlined,
    FontColorsOutlined,
    DownOutlined,
} from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';

/**
 * Editor de texto enriquecido basado en Tiptap.
 *
 * Expone la máxima cantidad de funcionalidades de edición gratuitas del
 * ecosistema Tiptap:
 *   - StarterKit: bold, italic, strike, code, headings (2, 3), bullet/ordered
 *     lists, blockquote, code-block, horizontal rule, history (undo/redo).
 *   - Underline, Link, Placeholder.
 *   - Image (por URL, responsiva), TextAlign (izq/centro/der/justificado),
 *     TextStyle + Color, Highlight (resaltado), Subscript, Superscript,
 *     TaskList + TaskItem.
 */
export default function TiptapEditor({ value, onChange, placeholder }) {
    const { t } = useTranslations();
    const [linkModal, setLinkModal] = useState(false);
    const [linkValue, setLinkValue] = useState('');
    const [isNewLink, setIsNewLink] = useState(false);
    const [imageModal, setImageModal] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [imageAlt, setImageAlt] = useState('');
    const [imageWidth, setImageWidth] = useState('100%');

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                link: false,
                underline: false,
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: {
                    rel: 'noopener noreferrer',
                    target: '_blank',
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
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
            Subscript,
            Superscript,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
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

    const isHeading2 = () => editor.isActive('heading', { level: 2 });
    const isHeading3 = () => editor.isActive('heading', { level: 3 });
    const isBullet = () => editor.isActive('bulletList');
    const isOrdered = () => editor.isActive('orderedList');
    const isTask = () => editor.isActive('taskList');
    const isQuote = () => editor.isActive('blockquote');
    const isCodeBlock = () => editor.isActive('codeBlock');
    const isCode = () => editor.isActive('code');
    const isAlign = (align) => editor.isActive({ textAlign: align });

    const toggleButton = ({ label, active, onClick, icon, text }) => (
        <Button
            type={active ? 'primary' : 'text'}
            size="small"
            title={label}
            aria-label={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            icon={icon}
        >
            {text}
        </Button>
    );

    const openLinkModal = () => {
        const previousUrl = editor.getAttributes('link').href || '';
        setIsNewLink(!previousUrl);
        setLinkValue(previousUrl);
        setLinkModal(true);
    };

    const applyLink = () => {
        const url = linkValue.trim();

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
            editor
                .chain()
                .focus()
                .extendMarkRange('link')
                .setLink({ href: url })
                .run();
        }
        setLinkModal(false);
    };

    const openImageModal = () => {
        setImageUrl('');
        setImageAlt('');
        setImageWidth('100%');
        setImageModal(true);
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
                style: `max-width:100%;height:auto;width:${imageWidth};`,
            })
            .run();

        setImageModal(false);
    };

    const setColor = (color) => {
        editor.chain().focus().setColor(color).run();
    };

    const resetColor = () => {
        editor.chain().focus().unsetColor().run();
    };

    const setHighlight = (color) => {
        editor.chain().focus().toggleHighlight({ color }).run();
    };

    const resetHighlight = () => {
        editor.chain().focus().unsetHighlight().run();
    };

    const clearFormatting = () => {
        editor.chain().focus().unsetAllMarks().clearNodes().run();
    };

    const colorMenu = {
        items: [
            {
                key: 'reset',
                label: t('tiptap.color_reset'),
                onClick: resetColor,
            },
            { type: 'divider' },
            ...[
                '#000000',
                '#595959',
                '#ffffff',
                '#1677ff',
                '#eb2f96',
                '#fa541c',
                '#faad14',
                '#52c41a',
                '#13c2c2',
                '#722ed1',
            ].map((c) => ({
                key: c,
                label: (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span
                            style={{
                                display: 'inline-block',
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                background: c,
                                border: '1px solid #d9d9d9',
                            }}
                        />
                        {c}
                    </span>
                ),
                onClick: () => setColor(c),
            })),
        ],
    };

    const highlightMenu = {
        items: [
            {
                key: 'reset',
                label: t('tiptap.highlight_reset'),
                onClick: resetHighlight,
            },
            { type: 'divider' },
            ...[
                '#ffe58f',
                '#ffccc7',
                '#d3f261',
                '#b7eb8f',
                '#87e8de',
                '#d1adc9',
            ].map((c) => ({
                key: c,
                label: (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span
                            style={{
                                display: 'inline-block',
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                background: c,
                                border: '1px solid #d9d9d9',
                            }}
                        />
                        {c}
                    </span>
                ),
                onClick: () => setHighlight(c),
            })),
        ],
    };

    const alignMenu = {
        items: [
            {
                key: 'left',
                label: t('tiptap.align_left'),
                icon: <AlignLeftOutlined />,
                onClick: () => editor.chain().focus().setTextAlign('left').run(),
            },
            {
                key: 'center',
                label: t('tiptap.align_center'),
                icon: <AlignCenterOutlined />,
                onClick: () => editor.chain().focus().setTextAlign('center').run(),
            },
            {
                key: 'right',
                label: t('tiptap.align_right'),
                icon: <AlignRightOutlined />,
                onClick: () => editor.chain().focus().setTextAlign('right').run(),
            },
        ],
    };

    const buttonProps = {
        onMouseDown: (e) => e.preventDefault(),
    };

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
                    label: t('tiptap.underline'),
                    active: editor.isActive('underline'),
                    onClick: () => editor.chain().focus().toggleUnderline().run(),
                    icon: <UnderlineOutlined />,
                })}
                {toggleButton({
                    label: t('tiptap.strike'),
                    active: editor.isActive('strike'),
                    onClick: () => editor.chain().focus().toggleStrike().run(),
                    icon: <StrikethroughOutlined />,
                })}
                {toggleButton({
                    label: t('tiptap.code'),
                    active: isCode(),
                    onClick: () => editor.chain().focus().toggleCode().run(),
                    icon: <CodeOutlined />,
                })}
                {toggleButton({
                    label: t('tiptap.subscript'),
                    active: editor.isActive('subscript'),
                    onClick: () => editor.chain().focus().toggleSubscript().run(),
                    text: 'x₂',
                })}
                {toggleButton({
                    label: t('tiptap.superscript'),
                    active: editor.isActive('superscript'),
                    onClick: () => editor.chain().focus().toggleSuperscript().run(),
                    text: 'x²',
                })}

                <Divider type="vertical" />

                <Dropdown menu={colorMenu} trigger={['click']}>
                    <Button
                        type="text"
                        size="small"
                        title={t('tiptap.text_color')}
                        icon={<FontColorsOutlined />}
                        {...buttonProps}
                    />
                </Dropdown>
                <Dropdown menu={highlightMenu} trigger={['click']}>
                    <Button
                        type="text"
                        size="small"
                        title={t('tiptap.text_highlight')}
                        icon={<BgColorsOutlined />}
                        {...buttonProps}
                    />
                </Dropdown>

                <Divider type="vertical" />

                {toggleButton({
                    label: t('tiptap.heading2'),
                    active: isHeading2(),
                    onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                })}
                {toggleButton({
                    label: t('tiptap.heading3'),
                    active: isHeading3(),
                    onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
                })}
                <Dropdown menu={alignMenu} trigger={['click']}>
                    <Button type="text" size="small" icon={<AlignLeftOutlined />} {...buttonProps}>
                        <DownOutlined style={{ fontSize: 10 }} />
                    </Button>
                </Dropdown>

                <Divider type="vertical" />

                {toggleButton({
                    label: t('tiptap.bullet_list'),
                    active: isBullet(),
                    onClick: () => editor.chain().focus().toggleBulletList().run(),
                    icon: <UnorderedListOutlined />,
                })}
                {toggleButton({
                    label: t('tiptap.ordered_list'),
                    active: isOrdered(),
                    onClick: () => editor.chain().focus().toggleOrderedList().run(),
                    icon: <OrderedListOutlined />,
                })}
                {toggleButton({
                    label: t('tiptap.task_list'),
                    active: isTask(),
                    onClick: () => editor.chain().focus().toggleTaskList().run(),
                    icon: <CheckSquareOutlined />,
                })}
                {toggleButton({
                    label: t('tiptap.blockquote'),
                    active: isQuote(),
                    onClick: () => editor.chain().focus().toggleBlockquote().run(),
                })}
                {toggleButton({
                    label: t('tiptap.code_block'),
                    active: isCodeBlock(),
                    onClick: () => editor.chain().focus().toggleCodeBlock().run(),
                })}
                {toggleButton({
                    label: t('tiptap.horizontal_rule'),
                    active: false,
                    onClick: () => editor.chain().focus().setHorizontalRule().run(),
                    icon: <LineOutlined />,
                })}

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
                    onClick: openImageModal,
                    icon: <PictureOutlined />,
                })}
                <Button
                    type="text"
                    size="small"
                    title={t('tiptap.clear_formatting')}
                    icon={<ClearOutlined />}
                    onClick={clearFormatting}
                />
            </Space>

            <EditorContent editor={editor} className="tiptap-editor-content" />

            <Modal
                open={linkModal}
                title={isNewLink ? t('tiptap.link_add') : t('tiptap.link_edit')}
                okText={t('tiptap.link_apply')}
                cancelText={t('tiptap.link_cancel')}
                onOk={applyLink}
                onCancel={() => setLinkModal(false)}
                destroyOnHidden
            >
                <Input
                    placeholder="https://..."
                    value={linkValue}
                    onChange={(e) => setLinkValue(e.target.value)}
                    onPressEnter={applyLink}
                    autoFocus
                />
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
                    <Input
                        addonBefore={t('tiptap.image_width')}
                        addonAfter="%"
                        value={imageWidth.replace('%', '')}
                        onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '');
                            const n = v === '' ? 100 : Math.min(100, Number(v));
                            setImageWidth(`${n}%`);
                        }}
                        style={{ width: 200 }}
                    />
                </Space>
            </Modal>
        </div>
    );
}
