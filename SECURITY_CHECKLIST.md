# Checklist de Segurança - EadControl Production

## Configurações de Segurança Atuais

### 1. Certificados SSL
- ✅ Configuração nginx.ssl.conf com TLS 1.2 e 1.3
- ✅ Certificados Let's Encrypt configurados
- ✅ Redirecionamento automático HTTP → HTTPS
- ✅ HSTS configurado (recomendado adicionar ao nginx)

### 2. CORS e Domínios
- ✅ Configuração cors.php com domínios permitidos
- ✅ Padrões regex para subdomínios
- ✅ Suporte a credenciais (cookies)
- ✅ Cabeçalhos expostos para multi-tenancy

### 3. Autenticação e Autorização
- ✅ Laravel Sanctum configurado
- ✅ Rotas de API protegidas
- ✅ Tokens com expiração
- ⚠️ RECAPTCHA_SECRET configurado no .env.production (preencher valor)

### 4. Sanitização de Input
- ✅ Validação com Laravel Request classes
- ✅ Sanitização automática do framework
- ✅ Proteção contra SQL Injection (Eloquent ORM)
- ✅ Proteção contra XSS (Blade templates)

### 5. Proteção de Banco de Dados
- ✅ Senhas fortes configuradas
- ✅ Usuário dedicado (eadcontrol)
- ✅ Migrations versionadas
- ⚠️ Scripts de backup incluem senha (considerar usar secrets do Docker)

## Ações Pendentes

### ReCAPTCHA
```bash
# Obtenha as chaves em https://www.google.com/recaptcha/admin
# Adicione ao .env.production:
RECAPTCHA_SITE_KEY=seu_site_key
RECAPTCHA_SECRET=seu_secret_key
```

### HSTS (HTTP Strict Transport Security)
Adicionar ao nginx.ssl.conf:
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### Rate Limiting
Já configurado no Laravel, verificar limites em:
- `app/Http/Kernel.php`
- `config/sanctum.php`

### Firewall
```bash
# Permitir apenas portas necessárias
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## Comandos de Verificação de Segurança

### Verificar dependências vulneráveis
```bash
cd backend
composer audit
cd ../frontend
npm audit
```

### Verificar permissões
```bash
docker compose -f docker-compose.production.yml exec backend ls -la storage
```

### Testar headers de segurança
```bash
curl -I https://api-cursos.incluireeducar.com.br
```

## Melhores Práticas

1. **Nunca commitar secrets** - Use .env.production e .gitignore
2. **Atualizações regulares** - `composer update` e `npm update` em ambiente de staging
3. **Monitoramento de logs** - Buscar por tentativas de intrusão
4. **Backup da base de dados** - Testar restauração periodicamente
5. **HTTPS forçado** - Garantir que todo tráfego usa SSL/TLS
