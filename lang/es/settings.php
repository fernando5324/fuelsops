<?php

/**
 * Páginas de Configuración → Empresa y Sistema (ADR-026).
 *
 * Este archivo se expone automáticamente como `t('settings.*')`
 * (HandleInertiaRequests comparte todos los grupos de lang/es/*).
 *
 * Las claves `social_*` las consume `Components/SocialLinksEditor.jsx` con
 * `namespace="settings"` (su namespace por defecto, `organizations`, no existe
 * en este proyecto).
 */
return [
    // ── Páginas ──────────────────────────────────────────────────────────────
    'company_title' => 'Configuración de empresa',
    'company_description' => 'Identidad y datos de la organización que se usan en el sistema y en los documentos.',
    'system_title' => 'Configuración del sistema',
    'system_description' => 'Preferencias generales y formato del código de pedido.',

    // ── Secciones ────────────────────────────────────────────────────────────
    'section_company_info' => 'Información de la empresa',
    'section_company_info_desc' => 'Nombre, documento de identidad y datos de contacto.',
    'section_logo' => 'Logo',
    'section_logo_desc' => 'Imagen que se muestra en el panel, en las páginas públicas y en los reportes.',
    'section_social' => 'Redes sociales',
    'section_preferences' => 'Preferencias',
    'section_preferences_desc' => 'Idioma y zona horaria predeterminados de la organización.',
    'section_orders' => 'Pedidos',
    'section_orders_desc' => 'Formato del código operativo del pedido.',

    // ── Campos: empresa ──────────────────────────────────────────────────────
    'field_name' => 'Nombre comercial',
    'field_name_hint' => 'Es el nombre que se muestra en el título del navegador y en el menú.',
    'field_legal_name' => 'Razón social',
    'field_tax_id' => 'RUC',
    'field_tax_id_hint' => '11 dígitos.',
    'field_email' => 'Correo',
    'field_phone' => 'Teléfono',
    'field_website' => 'Sitio web',
    'field_website_hint' => 'Incluye https://',
    'invalid_email' => 'Ingresa un correo válido.',
    'field_description' => 'Descripción',
    'field_description_hint' => 'Descripción de la organización para los documentos.',
    'field_address' => 'Dirección',
    'field_business_hours' => 'Horario de atención',
    'field_business_hours_hint' => 'Ej.: Lun a Vie 8:00 a 18:00.',

    // ── Logo ─────────────────────────────────────────────────────────────────
    'logo_upload' => 'Subir logo',
    'logo_replace' => 'Reemplazar',
    'logo_remove' => 'Quitar',
    'logo_view' => 'Ver',
    'logo_alt' => 'Logo de la empresa',
    'logo_hint' => 'La imagen se previsualiza aquí y se guardará al pulsar Guardar.',
    'logo_error_type' => 'Formato no permitido (solo JPG, PNG o WebP).',
    'logo_error_size' => 'La imagen supera el tamaño máximo de 10 MB.',

    // ── Campos: sistema ──────────────────────────────────────────────────────
    'field_language' => 'Idioma',
    'field_timezone' => 'Zona horaria',
    'field_prefix' => 'Prefijo',
    'field_prefix_hint' => 'Se guarda en mayúsculas. Aplica a los pedidos nuevos.',
    'field_start' => 'Número inicial',
    'field_padding' => 'Cantidad de dígitos',
    'preview' => 'Vista previa',

    // ── Acciones ─────────────────────────────────────────────────────────────
    'save_company' => 'Guardar cambios',
    'save_system' => 'Guardar cambios',
    'company_saved' => 'Configuración de empresa actualizada.',
    'system_saved' => 'Configuración del sistema actualizada.',

    // ── SocialLinksEditor (namespace="settings") ─────────────────────────────
    'social_hint' => 'Agrega los enlaces a tus redes sociales (opcionales).',
    'social_placeholder' => 'https://...',
    'social_linkedin' => 'LinkedIn',
    'social_facebook' => 'Facebook',
    'social_instagram' => 'Instagram',
    'social_tiktok' => 'TikTok',
    'social_youtube' => 'YouTube',
    'social_github' => 'GitHub',
    'social_twitter' => 'X (Twitter)',
];
