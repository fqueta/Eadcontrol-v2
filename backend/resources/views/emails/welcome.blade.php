@extends('emails.layouts.master')

@section('title', 'Boas-vindas - ' . ($institutionName ?? config('app.name')))

@section('content')
    <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 24px; color: #1e293b; letter-spacing: -0.025em; text-align: center; line-height: 1.2;">Bem-vindo(a) à jornada!</h1>
    <p style="margin: 0 0 20px; line-height: 1.625; font-size: 16px; color: #475569;">Olá! Estamos extremamente felizes em ter você conosco na <strong style="color: #1e293b;">{{ $institutionName ?? config('app.name') }}</strong>.</p>
    
    <p style="margin: 0 0 20px; line-height: 1.625; font-size: 16px; color: #475569;">Seu cadastro foi realizado com sucesso. Você já garantiu sua vaga e está matriculado no seguinte curso:</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
        <span style="font-size: 18px; font-weight: 700; color: #1e293b; display: block;">{{ $courseName ?: 'Curso ID ' . $courseId }}</span>
    </div>

    @if (!empty($loginUrl))
        <div style="margin: 32px 0 24px; text-align: center;">
            <a href="{{ $loginUrl }}" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 24px; background-color: {{ $primaryColor ?? '#1b1b18' }}; color: {{ $primaryTextColor ?? '#ffffff' }}; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Acessar Plataforma</a>
        </div>
    @endif
    
    @if (!empty($courseSlug))
        <div style="text-align: center; margin-top: 16px; font-size: 14px; color: #475569;">
            Ou acesse diretamente: <a href="{{ url('/aluno/cursos/' . $courseSlug) }}" target="_blank" rel="noopener" style="color: {{ $primaryColor ?? '#1b1b18' }}; text-decoration: none; font-weight: 600;">Página do Curso</a>
        </div>
    @endif

    <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 24px; margin-bottom: 0;">
        Se você não realizou este cadastro, por favor entre em contato conosco ou ignore esta mensagem.
    </p>
@endsection
