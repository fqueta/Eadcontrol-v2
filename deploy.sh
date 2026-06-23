#!/bin/bash
set -e

# 🚀 Script de Deploy Automático - EadControl

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

echo "⏳ Aguardando container octane_app ficar saudável..."
for i in $(seq 1 30); do
  if docker ps -q --filter "name=octane_app" --filter "health=healthy" | grep -q .; then
    echo "✅ octane_app pronto!"
    break
  fi
  if docker ps -q --filter "name=octane_app" --filter "status=running" | grep -q .; then
    # sem healthcheck configurado, confia que está rodando após alguns segundos
    if [ $i -gt 10 ]; then
      echo "✅ octane_app está rodando (sem healthcheck)"
      break
    fi
  fi
  sleep 2
done

echo "🧹 Limpando caches do Laravel..."
if docker ps -q --filter "name=octane_app" --filter "status=running" | grep -q . ; then
    docker exec octane_app php artisan optimize:clear
    docker exec octane_app php artisan route:clear
    
    echo "🏗️ Rodando Migrations dos Tenants..."
    docker exec octane_app php artisan tenants:migrate --force

    echo "🌱 Rodando Database Seeds (MenuSeeder)..."
    docker exec octane_app php artisan tenants:seed --class=MenuSeeder --force
else
    echo "⚠️ octane_app não está rodando. Pulando limpeza de cache."
fi

echo "🔄 Copiando config do Nginx e recarregando..."
docker cp backend/deployment/nginx/nginx.conf.final nginx_standalone_proxy:/etc/nginx/nginx.conf
docker exec nginx_standalone_proxy nginx -t && docker exec nginx_standalone_proxy nginx -s reload

echo "✅ Deploy finalizado com sucesso!"

