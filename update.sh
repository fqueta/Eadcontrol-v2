#!/bin/bash
set -e

# Script de atualização rápida (sem git pull)
# Use deploy.sh para deploy completo com git pull

echo "=== Iniciando atualização do EadControl ==="

echo "Reconstruindo containers..."
docker compose -f docker-compose.production.yml up -d --build

echo "Aguardando containers..."
sleep 5

echo "Executando migrações..."
docker exec octane_app php artisan migrate --force
docker exec octane_app php artisan tenants:migrate --force

echo "Limpando cache..."
docker exec octane_app php artisan optimize:clear

echo "Copiando config do Nginx..."
docker cp backend/deployment/nginx/nginx.conf.final nginx_standalone_proxy:/etc/nginx/nginx.conf
docker exec nginx_standalone_proxy nginx -t && docker exec nginx_standalone_proxy nginx -s reload

echo "=== Atualização concluída! ==="
