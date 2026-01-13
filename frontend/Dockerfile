# Estágio de Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Estágio de Produção (Nginx)
FROM nginx:alpine

# Copia os arquivos estáticos do build anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuração customizada do Nginx (opcional, para SPA catch-all)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
