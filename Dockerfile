# ============================================================
# Sertoco
# Laravel 12 + React + Inertia
# PHP 8.3 + Apache
# ============================================================

# ------------------------------------------------------------
# Stage 1: Build frontend
# ------------------------------------------------------------
FROM node:24-bookworm-slim AS frontend

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


# ------------------------------------------------------------
# Stage 2: Laravel application
# ------------------------------------------------------------
FROM php:8.3-apache

WORKDIR /var/www/html


# ------------------------------------------------------------
# System dependencies
# ------------------------------------------------------------
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    libicu-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libwebp-dev \
    libonig-dev \
    libxml2-dev \
    && rm -rf /var/lib/apt/lists/*


# ------------------------------------------------------------
# PHP extensions
# ------------------------------------------------------------
RUN docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
        --with-webp \
    && docker-php-ext-install -j$(nproc) \
        bcmath \
        exif \
        gd \
        intl \
        mbstring \
        opcache \
        pdo_mysql \
        xml \
        zip


# ------------------------------------------------------------
# Apache
# ------------------------------------------------------------
RUN a2enmod rewrite

COPY docker/apache/000-default.conf \
     /etc/apache2/sites-available/000-default.conf


# ------------------------------------------------------------
# Composer
# ------------------------------------------------------------
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer


# ------------------------------------------------------------
# PHP dependencies
# ------------------------------------------------------------
COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts


# ------------------------------------------------------------
# Application
# ------------------------------------------------------------
COPY . .


# ------------------------------------------------------------
# Frontend assets
# ------------------------------------------------------------
COPY --from=frontend /app/public/build ./public/build


# ------------------------------------------------------------
# Laravel permissions
# ------------------------------------------------------------
RUN mkdir -p \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data \
        storage \
        bootstrap/cache \
    && chmod -R 775 \
        storage \
        bootstrap/cache


# ------------------------------------------------------------
# Laravel package discovery
# ------------------------------------------------------------
RUN php artisan package:discover --ansi


# ------------------------------------------------------------
# Clear Laravel caches
# ------------------------------------------------------------
RUN php artisan config:clear \
    && php artisan route:clear \
    && php artisan view:clear


# ------------------------------------------------------------
# Port
# ------------------------------------------------------------
EXPOSE 80


# ------------------------------------------------------------
# Start Apache
# ------------------------------------------------------------
CMD ["apache2-foreground"]