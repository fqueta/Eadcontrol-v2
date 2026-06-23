# Estágio de Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

ARG VITE_TENANT_API_URL
ENV VITE_TENANT_API_URL=${VITE_TENANT_API_URL}

COPY . .
RUN npm run build

# Estágio de Produção (Nginx)
FROM nginx:alpine

# Copia os arquivos estáticos do build anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuração customizada do Nginx para SPA catch-all e detecção de crawlers/bots
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
