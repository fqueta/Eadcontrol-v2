@extends('emails.layouts.master')

@section('title', 'Pedido Recebido - ' . ($institutionName ?? config('app.name')))

@section('content')
    <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 24px; color: #1e293b; letter-spacing: -0.025em; text-align: center; line-height: 1.2;">Pedido Recebido!</h1>
    
    <p style="margin: 0 0 20px; line-height: 1.625; font-size: 16px; color: #475569;">Olá! Recebemos seu pedido na <strong style="color: #1e293b;">{{ $institutionName ?? config('app.name') }}</strong>.</p>
    
    <p style="margin: 0 0 20px; line-height: 1.625; font-size: 16px; color: #475569;">Estamos aguardando a confirmação do pagamento para liberar seu acesso ao curso:</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
        <span style="font-size: 18px; font-weight: 700; color: #1e293b; display: block;">{{ $courseTitle }}</span>
    </div>

    @if($paymentType === 'PIX' && !empty($pixCode))
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 24px; margin: 24px 0;">
            <p style="margin: 0 0 12px; font-weight: 700; color: #166534; text-align: center;">Pagamento via PIX</p>
            <p style="margin: 0 0 16px; font-size: 14px; color: #166534; text-align: center;">Para agilizar sua liberação, utilize o código "Copia e Cola" abaixo em seu aplicativo bancário:</p>
            <div style="background-color: #ffffff; padding: 12px; border-radius: 4px; border: 1px dashed #bbf7d0; font-family: monospace; font-size: 12px; word-break: break-all; color: #166534;">
                {{ $pixCode }}
            </div>
            <p style="margin: 16px 0 0; font-size: 13px; color: #166534; text-align: center; font-style: italic;">A liberação ocorre em poucos minutos após o pagamento.</p>
        </div>
    @elseif($paymentType === 'BOLETO' && !empty($boletoUrl))
        <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
            <p style="margin: 0 0 12px; font-weight: 700; color: #475569;">Pagamento via Boleto</p>
            <p style="margin: 0 0 20px; font-size: 14px; color: #475569;">Clique no botão abaixo para visualizar e imprimir seu boleto:</p>
            <a href="{{ $boletoUrl }}" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 24px; background-color: {{ $primaryColor ?? '#1b1b18' }}; color: {{ $primaryTextColor ?? '#ffffff' }}; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Visualizar Boleto</a>
            <p style="margin: 16px 0 0; font-size: 13px; color: #64748b; font-style: italic;">Lembre-se que boletos podem levar até 48h úteis para compensação.</p>
        </div>
    @endif

    <p style="margin: 24px 0 20px; line-height: 1.625; font-size: 16px; color: #475569;">Assim que o pagamento for confirmado, você receberá um novo e-mail com as instruções de acesso à nossa plataforma.</p>

    <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 24px; margin-bottom: 0;">
        Se você já realizou o pagamento, por favor desconsidere esta mensagem.
    </p>
@endsection
