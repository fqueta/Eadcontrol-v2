<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Boas-vindas - {{ $companyName ?? config('app.name') }}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1f2937; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; background-color: #f3f4f6; padding: 40px 0; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
        
        /* Header */
        .header { padding: 40px 32px; background-color: {{ $primaryColor ?? '#0f172a' }}; color: {{ $primaryTextColor ?? '#ffffff' }}; text-align: center; }
        .brand { display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .brand img { height: 48px; width: auto; max-width: 200px; object-fit: contain; }
        .brand span { font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }

        /* Content */
        .content { padding: 48px 40px; }
        h1 { font-size: 28px; font-weight: 800; margin: 0 0 24px; color: #111827; letter-spacing: -0.025em; text-align: center; line-height: 1.2; }
        p { margin: 0 0 20px; line-height: 1.625; font-size: 16px; color: #4b5563; }
        
        /* Highlight & Course Card */
        .highlight { font-weight: 600; color: {{ $secondaryColor ?? '#4f46e5' }}; }
        .course-card {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
            text-align: center;
        }
        .course-title {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 8px;
            display: block;
        }
        
        /* Buttons */
        .cta { margin-top: 32px; text-align: center; }
        .btn { 
            display: inline-block; 
            padding: 16px 32px; 
            background-color: {{ $secondaryColor ?? '#4f46e5' }}; 
            color: {{ $secondaryTextColor ?? '#ffffff' }} !important; 
            text-decoration: none; 
            border-radius: 10px; 
            font-weight: 600; 
            font-size: 16px; 
            transition: opacity 0.2s;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .btn:hover { opacity: 0.9; }

        /* Secondary Link */
        .secondary-link {
            text-align: center;
            margin-top: 24px;
            font-size: 14px;
        }
        .secondary-link a {
            color: {{ $secondaryColor ?? '#4f46e5' }};
            text-decoration: none;
            font-weight: 600;
        }
        .secondary-link a:hover { text-decoration: underline; }

        /* Footer */
        .muted { color: #9ca3af; font-size: 13px; text-align: center; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 32px; margin-bottom: 0; }
        .footer { padding: 32px; text-align: center; color: #9ca3af; font-size: 12px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; }
        
        @media (max-width: 600px) {
            .content { padding: 32px 24px; }
            .header { padding: 32px 24px; }
            h1 { font-size: 24px; }
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
                       <!-- Fallback text if no logo -->
                    @endif
                    @if(empty($logoSrc) && empty($logoDataUri))
                        <span>{{ $companyName ?? config('app.name') }}</span>
                    @endif
                </div>
            </div>
            <div class="content">
                <h1>Bem-vindo(a) à jornada!</h1>
                <p>Olá! Estamos extremamente felizes em ter você conosco na <span style="font-weight: 700; color: #111827;">{{ $companyName ?? config('app.name') }}</span>.</p>
                
                <p>Seu cadastro foi realizado com sucesso. Você já garantiu sua vaga e está matriculado no seguinte curso:</p>
                
                <div class="course-card">
                    <span class="course-title">{{ $courseName ?: 'Curso ID ' . $courseId }}</span>
                </div>

                @if (!empty($loginUrl))
                    <div class="cta">
                        <a class="btn" href="{{ $loginUrl }}" target="_blank" rel="noopener">Acessar Plataforma</a>
                    </div>
                @endif
                
                @if (!empty($courseSlug))
                    <div class="secondary-link">
                        Ou acesse diretamente: <a href="{{ url('/aluno/cursos/' . $courseSlug) }}" target="_blank" rel="noopener">Página do Curso</a>
                    </div>
                @endif

                <p class="muted">
                    Se você não realizou este cadastro, por favor entre em contato conosco ou ignore esta mensagem.
                </p>
            </div>
            <div class="footer">
                <div>&copy; {{ date('Y') }} {{ $companyName ?? config('app.name') }}. Todos os direitos reservados.</div>
                <div>{{ config('mail.from.name') }} • {{ config('mail.from.address') }}</div>
            </div>
        </div>
    </div>
</body>
</html>
