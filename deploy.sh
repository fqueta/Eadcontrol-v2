#!/bin/bash
set -e

echo "📥 Buscando atualizações do Git..."
git update-index --no-assume-unchanged backend/config/cors.php docker-compose.production.yml 2>/dev/null

if [[ -n $(git status --porcelain) ]]; then
  echo "📦 Guardando alterações locais (stash)..."
  git stash
  STASHED=true
else
  echo "✨ Nenhuma alteração local para guardar."
  STASHED=false
fi

git pull --rebase

if [ "$STASHED" = true ]; then
  echo "📦 Restaurando alterações locais..."
  git stash pop
fi

git update-index --assume-unchanged backend/config/cors.php docker-compose.production.yml 2>/dev/null

echo "🏗️ Reconstruindo containers (Backend/Frontend)..."
docker compose -f docker-compose.production.yml up --build -d --remove-orphans

echo "⏳ Aguardando octane_app ficar saudável (HTTP)..."
for i in $(seq 1 60); do
  HTTP_CODE=$(docker exec octane_app curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ 2>/dev/null || true)
  case "$HTTP_CODE" in
    200|302|404|000)
      echo "✅ octane_app pronto! (HTTP $HTTP_CODE)"
      break
      ;;
    *)
      if [ $i -eq 60 ]; then
        echo "❌ octane_app não respondeu após 120 segundos (último HTTP: $HTTP_CODE)"
        exit 1
      fi
      ;;
  esac
  sleep 2
done

echo "🧹 Limpando caches do Laravel..."
docker exec octane_app php artisan optimize:clear
docker exec octane_app php artisan route:clear

echo "🏗️ Rodando Migrations dos Tenants..."
docker exec octane_app php artisan tenants:migrate --force

echo "🌱 Rodando Database Seeds (MenuSeeder)..."
docker exec octane_app php artisan tenants:seed --class=MenuSeeder --force

echo "🔄 Atualizando config do Nginx..."
cp backend/deployment/nginx/eadcontrol.conf /home/servidor/nginx/conf.d/eadcontrol.conf

echo "🔄 Testando e reiniciando Nginx (limpa cache DNS)..."
docker restart nginx_standalone_proxy

echo "✅ Deploy finalizado com sucesso!"
