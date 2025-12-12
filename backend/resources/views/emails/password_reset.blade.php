<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinição de Senha - {{ config('app.name') }}</title>
    <style>
        /* Layout base compatível com clientes de e-mail */
        body { margin: 0; padding: 0; background: #f5f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1b1b18; }
        .wrapper { width: 100%; background: #f5f7fb; padding: 24px 0; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .header { padding: 20px 24px; background: #0a0a0a; color: #EDEDEC; text-align: center; }
        .brand { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; letter-spacing: .3px; }
        .brand img { height: 24px; width: 24px; }
        .content { padding: 24px; }
        h1 { font-size: 20px; margin: 0 0 12px; color: #1b1b18; }
        p { margin: 0 0 12px; line-height: 1.6; }
        .cta { margin: 16px 0 24px; text-align: center; }
        .btn { display: inline-block; padding: 12px 18px; background: #1b1b18; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .muted { color: #3E3E3A; font-size: 13px; }
        .footer { padding: 16px 24px; text-align: center; color: #62605b; font-size: 12px; }
        .link { color: #1b1b18; word-break: break-all; }
        @media (prefers-color-scheme: dark) {
            body { background: #0a0a0a; color: #EDEDEC; }
            .container { background: #121212; }
            .header { background: #0a0a0a; color: #EDEDEC; }
            h1, .link { color: #EDEDEC; }
            .btn { background: #EDEDEC; color: #0a0a0a !important; }
            .muted, .footer { color: #9a9a97; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <div class="brand">
                    @if (!empty($logoSrc))
                        <img src="{{ $logoSrc }}" alt="Logo" />
                    @elseif (!empty($logoDataUri))
                        <img src="{{ $logoDataUri }}" alt="Logo" />
                    @else
                        <img src="{{ asset('logo.svg') }}" alt="Logo" />
                    @endif
                    <span>{{ config('app.name') }}</span>
                </div>
            </div>
            <div class="content">
                <h1>Redefinição de Senha</h1>
                <p>Olá!</p>
                <p>Você está recebendo este e-mail porque recebemos um pedido de redefinição de senha para a sua conta.</p>

                <div class="cta">
                    <a class="btn" href="{{ $resetLink }}" target="_blank" rel="noopener">Redefinir Senha</a>
                </div>

                <p class="muted">Se tiver problemas ao clicar no botão, copie e cole o link abaixo no navegador:</p>
                <p class="link">{{ $resetLink }}</p>

                <p class="muted">Se você não solicitou a redefinição de senha, nenhuma ação adicional é necessária.</p>
            </div>
            <div class="footer">
                <div>&copy; {{ date('Y') }} {{ config('app.name') }}. Todos os direitos reservados.</div>
                <div>{{ config('mail.from.name') }} • {{ config('mail.from.address') }}</div>
            </div>
        </div>
    </div>
</body>
</html>