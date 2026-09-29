# ============================================================
# Sertoco - Laravel 12 + React + Inertia
# PHP 8.3 + Apache
#
# Imagen portable para Railway, Render, Fly.io, Cloud Run o
# cualquier servicio que inyecte la variable PORT.
#
# Reparto de responsabilidades:
#   - build:  todo lo que no depende del entorno del PaaS
#             (extensiones de PHP, vendor, assets de Vite, permisos)
#   - docker/entrypoint.sh: lo que SI depende del entorno
#             (puerto, espera a la BD, esquema, cachés de Laravel)
# ============================================================


# ------------------------------------------------------------
# Stage 1: Build frontend assets
# ------------------------------------------------------------
FROM node:24-bookworm-slim AS frontend

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


# ------------------------------------------------------------
# Stage 2: PHP / Apache application
# ------------------------------------------------------------
FROM php:8.3-apache

WORKDIR /var/www/html

# ------------------------------------------------------------
# Sistema + extensiones PHP
# ------------------------------------------------------------
# Se compila TODO en una sola capa y se purgan las librerias -dev al
# final, para que no queden en la imagen final.
#
# Solo se instalan las que la imagen base NO trae (php:8.3-apache ya
# incluye mbstring, opcache, posix, xml/dom, fileinfo, curl, sodium):
#   bcmath    motor de precios (calculos con bcmath, nunca float)
#   gd        miniaturas de imagenes
#   exif      dimensiones/orientacion de las fotos de los adjuntos
#   intl      normalizacion de texto
#   pdo_mysql MySQL
#   zip       lectura de los .xlsx de la importacion de precios
#   pcntl     queue:work cuando se levante como servicio aparte
# y sus dependencias de compilacion (libzip, libicu, libpng, jpeg,
# freetype, webp).
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        git \
        unzip \
        libzip-dev \
        libicu-dev \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        libwebp-dev \
    ; \
    docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
        --with-webp \
    ; \
    docker-php-ext-install -j"$(nproc)" \
        bcmath \
        exif \
        gd \
        intl \
        pcntl \
        pdo_mysql \
        zip \
    ; \
    apt-get purge -y --auto-remove --no-install-recommends \
        libzip-dev \
        libicu-dev \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        libwebp-dev \
    ; \
    rm -rf /var/lib/apt/lists/*; \
    docker-php-ext-cleanup


# ------------------------------------------------------------
# Apache
# ------------------------------------------------------------
# rewrite  -> public/.htaccess (front controller de Laravel)
# headers -> cabeceras de seguridad del VirtualHost
RUN set -eux; \
    a2enmod rewrite headers


# El puerto se resuelve con ${APACHE_PORT} (ports.conf y
# 000-default.conf). 80 es el default para docker run/compose; el
# entrypoint lo reemplaza por $PORT cuando el PaaS lo inyecta.
ENV APACHE_PORT=80
ENV APACHE_SERVER_NAME=localhost

# Values por defecto de produccion. docker compose / cualquier PaaS
# puede sobrescribirlos; lo importante es no enviar debug a produccion
# por descuido.
ENV APP_ENV=production \
    APP_DEBUG=false


COPY docker/apache/ports.conf /etc/apache2/ports.conf
COPY docker/apache/000-default.conf /etc/apache2/sites-available/000-default.conf


# ------------------------------------------------------------
# Configuracion de PHP
# ------------------------------------------------------------
# Sin php.ini, PHP corre con defaults inseguros para produccion
# (display_errors=On, upload_max_filesize=2M, memory_limit=128M).
COPY docker/php/99-sertoco-production.ini /usr/local/etc/php/conf.d/99-sertoco-production.ini


# ------------------------------------------------------------
# Composer
# ------------------------------------------------------------
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_NO_INTERACTION=1


# ------------------------------------------------------------
# Dependencias de Composer
# ------------------------------------------------------------
# Va antes del COPY del codigo para que la capa solo se rehaga
# cuando cambie composer.lock.
COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts


# ------------------------------------------------------------
# Aplicacion
# ------------------------------------------------------------
COPY . .


# ------------------------------------------------------------
# Assets compilados por Vite
# ------------------------------------------------------------
COPY --from=frontend /app/public/build ./public/build


# ------------------------------------------------------------
# Permisos de Laravel
# ------------------------------------------------------------
RUN set -eux; \
    mkdir -p \
        storage/app/private \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    ; \
    chown -R www-data:www-data storage bootstrap/cache; \
    chmod -R 775 storage bootstrap/cache


# ------------------------------------------------------------
# Descubrimiento de paquetes
# ------------------------------------------------------------
# Se puede hacer en build: no lee el entorno (APP_KEY, DB_*).
# El autoload ya viene optimizado de composer install.
RUN php artisan package:discover --ansi


# ------------------------------------------------------------
# Entrypoint
# ------------------------------------------------------------
COPY docker/entrypoint.sh /usr/local/bin/sertoco-entrypoint

RUN chmod +x /usr/local/bin/sertoco-entrypoint


# ------------------------------------------------------------
# Puerto
# ------------------------------------------------------------
# Documental: el puerto real lo fija $PORT (PaaS) o APACHE_PORT.
EXPOSE 80


# ------------------------------------------------------------
# Healthcheck
# ------------------------------------------------------------
# /up es la ruta de salud que Laravel 12 registra por defecto
# (bootstrap/app.php -> health: '/up').
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD php -r 'exit(@file_get_contents("http://127.0.0.1:".(getenv("APACHE_PORT") ?: 80)."/up") === false ? 1 : 0);'


# ------------------------------------------------------------
# Arranque
# ------------------------------------------------------------
# El entrypoint ajusta puerto/BD/caches y luego ejecuta el CMD, asi
# que un servicio de colas reutiliza la misma imagen con:
#   docker run ... php artisan queue:work --tries=3
ENTRYPOINT ["/usr/local/bin/sertoco-entrypoint"]
CMD ["apache2-foreground"]
