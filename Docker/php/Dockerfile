FROM php:8.4-fpm AS base
WORKDIR /var/www/html
# Install System dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    unzip \
    libzip-dev \
    libicu-dev \
    libonig-dev \
    && docker-php-ext-install \
        pdo_mysql \
        mbstring \
        intl \
        zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

    # Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && node --version \
    && npm --version

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

FROM base AS build

COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts
# Copy application source code
COPY . .


# Laravel packages / Wayfinder
RUN php artisan package:discover --ansi

# Frontend dependencies
COPY package*.json ./

RUN npm ci

# Vite + Wayfinder
RUN npm run build

# Optimize Laravel
RUN composer dump-autoload --optimize

# --------------------------------------------------
# Development
# --------------------------------------------------
FROM base AS development
COPY . .

# composer install
RUN composer install \
    --no-interaction \
    --prefer-dist

# COPY package*.json ./

# RUN npm ci


RUN chown -R www-data:www-data \
    storage \
    bootstrap/cache

USER www-data

CMD ["php-fpm"]
# --------------------------------------------------
# Production
# --------------------------------------------------
FROM base AS production



COPY --from=build /var/www/html /var/www/html



USER www-data

CMD ["php-fpm"]

