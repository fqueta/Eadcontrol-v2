# Stage 1: Build Frontend Assets
FROM node:20 as frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Install Composer Dependencies
FROM composer:2.7 as vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --ignore-platform-reqs \
    --no-interaction \
    --no-plugins \
    --no-scripts \
    --prefer-dist \
    --no-dev

# Stage 3: Final Production Image
FROM php:8.3-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libzip-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip opcache

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Configure Opcache (Crucial for Octane/Prod)
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.enable_cli=1" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.max_accelerated_files=10000" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.memory_consumption=128" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini

WORKDIR /var/www/html

# Copy Frontend Assets
COPY --from=frontend /app/public/build ./public/build

# Copy Vendor Packages
COPY --from=vendor /app/vendor ./vendor

# Copy Application Code
COPY . .

# Copy Production RoadRunner Config
COPY deployment/octane/rr.yaml .rr.yaml

# Create directory for RoadRunner binary and ensure permissions
RUN mkdir -p storage/logs \
    && mkdir -p storage/framework/views \
    && mkdir -p storage/framework/sessions \
    && mkdir -p storage/framework/cache \
    && chown -R www-data:www-data storage bootstrap/cache

# Get RoadRunner Binary (download specific version to be safe)
COPY --from=ghcr.io/roadrunner-server/roadrunner:2023.3 /usr/bin/rr /usr/local/bin/rr
RUN chmod +x /usr/local/bin/rr

# Expose port
EXPOSE 8000

# Run Octane
CMD ["/usr/local/bin/rr", "serve", "-c", ".rr.yaml"]
