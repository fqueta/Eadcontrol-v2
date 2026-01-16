# Deploy em VPS Ubuntu 24 com Docker

## Pré-requisitos
- Ubuntu 24.04 com acesso root
- DNS A para `cursos.incluireeducar.com.br` e `api-cursos.incluireeducar.com.br` apontando para o IP da VPS

## Instalar Docker e Compose
```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release; echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin certbot
sudo usermod -aG docker $USER
newgrp docker
```

## Clonar projeto e configurar variáveis
```bash
git clone https://seu-repo/Eadcontrol-v2.git
cd Eadcontrol-v2
cp .env.production.example .env
```
Edite `.env` com valores reais (APP_KEY, DB_*, RECAPTCHA_SECRET, e-mails).

## Emitir certificados
```bash
mkdir -p certbot-var
docker compose -f docker-compose.production.yml up -d gateway
sudo certbot certonly --webroot -w $(pwd)/certbot-var \
  -d cursos.incluireeducar.com.br -d api-cursos.incluireeducar.com.br
```

## Subir toda a stack
```bash
docker compose -f docker-compose.production.yml up -d
```

## Habilitar HTTPS no gateway
Substitua a configuração do Nginx do gateway:
```bash
docker cp backend/deployment/nginx/nginx.ssl.conf gateway:/etc/nginx/nginx.conf
docker restart gateway
```

## Verificação
```bash
docker compose -f docker-compose.production.yml ps
curl -I http://cursos.incluireeducar.com.br
curl -I https://api-cursos.incluireeducar.com.br
```
