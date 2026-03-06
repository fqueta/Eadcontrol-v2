@extends('emails.layouts.master')

@section('title', 'Novo Comentário Postado - ' . ($institutionName ?? config('app.name')))

@section('content')
    <h1 style="font-size: 20px; margin: 0 0 12px; color: #1e293b;">Novo Comentário Postado</h1>
    <p style="margin: 0 0 12px; line-height: 1.6; color: #475569;">Olá!</p>
    <p style="margin: 0 0 12px; line-height: 1.6; color: #475569;">Um novo comentário foi postado no sistema e aguarda moderação.</p>
    
    <p style="margin: 0 0 12px; line-height: 1.6; color: #475569;"><strong>Autor:</strong> {{ $userName }}</p>
    <p style="margin: 0 0 12px; line-height: 1.6; color: #475569;"><strong>Alvo:</strong> {{ $targetName }} ({{ $targetType }})</p>
    @if($rating)
        <p style="margin: 0 0 12px; line-height: 1.6; color: #475569;"><strong>Avaliação:</strong> {{ $rating }} estrelas</p>
    @endif
    
    <div style="background-color: #f8fafc; border-left: 4px solid {{ $primaryColor ?? '#1b1b18' }}; padding: 16px; margin: 16px 0; font-style: italic; color: #475569;">
        "{{ $commentBody }}"
    </div>

    <div style="margin: 16px 0 24px; text-align: center;">
        <a href="{{ $adminLink }}" target="_blank" rel="noopener" style="display: inline-block; padding: 12px 18px; background-color: {{ $primaryColor ?? '#1b1b18' }}; color: {{ $primaryTextColor ?? '#ffffff' }}; text-decoration: none; border-radius: 6px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Ir para Moderação</a>
    </div>

    <p style="margin: 0; line-height: 1.6; color: #64748b; font-size: 13px;">Você recebeu este e-mail porque é um administrador do sistema.</p>
@endsection
