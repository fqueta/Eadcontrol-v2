@extends('emails.layouts.master')

@section('title', 'Redefinição de Senha - ' . ($institutionName ?? config('app.name')))

@section('content')
    <h1 style="font-size: 20px; margin: 0 0 12px; color: #1e293b;">Redefinição de Senha</h1>
    <p style="margin: 0 0 12px; line-height: 1.6; color: #475569;">Olá!</p>
    <p style="margin: 0 0 12px; line-height: 1.6; color: #475569;">Você está recebendo este e-mail porque recebemos um pedido de redefinição de senha para a sua conta.</p>

    <div style="margin: 16px 0 24px; text-align: center;">
        <a href="{{ $resetLink }}" target="_blank" rel="noopener" style="display: inline-block; padding: 12px 18px; background-color: {{ $primaryColor ?? '#1b1b18' }}; color: {{ $primaryTextColor ?? '#ffffff' }}; text-decoration: none; border-radius: 6px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Redefinir Senha</a>
    </div>

    <p style="margin: 0 0 12px; line-height: 1.6; color: #64748b; font-size: 13px;">Se tiver problemas ao clicar no botão, copie e cole o link abaixo no navegador:</p>
    <p style="margin: 0 0 12px; line-height: 1.6; color: {{ $primaryColor ?? '#1b1b18' }}; word-break: break-all; font-size: 14px;">{{ $resetLink }}</p>

    <p style="margin: 0; line-height: 1.6; color: #64748b; font-size: 13px;">Se você não solicitou a redefinição de senha, nenhuma ação adicional é necessária.</p>
@endsection