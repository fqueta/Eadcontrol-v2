@extends('emails.layouts.master')

@section('title', 'Nova Venda Confirmada - ' . ($institutionName ?? config('app.name')))

@section('content')
    <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background-color: #d1fae5; color: #047857; padding: 12px 24px; border-radius: 9999px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            🎉 Nova Venda Confirmada!
        </div>
    </div>
    
    <p style="margin: 0 0 20px; line-height: 1.625; font-size: 16px; color: #475569;">Olá equipe,</p>
    
    <p style="margin: 0 0 20px; line-height: 1.625; font-size: 16px; color: #475569;">Uma nova matrícula acaba de ter o pagamento confirmado na plataforma <strong style="color: #1e293b;">{{ $institutionName ?? config('app.name') }}</strong>.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0;">
        <h3 style="margin: 0 0 16px; font-size: 16px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Detalhes da Compra</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;"><strong>Curso:</strong></td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 15px; font-weight: 600;">{{ $courseTitle }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;"><strong>Aluno:</strong></td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 15px;">{{ $clientName }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;"><strong>E-mail:</strong></td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 15px;">
                    <a href="mailto:{{ $clientEmail }}" style="color: {{ $primaryColor ?? '#3b82f6' }}; text-decoration: none;">{{ $clientEmail }}</a>
                </td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;"><strong>Valor Pago:</strong></td>
                <td style="padding: 8px 0; color: #047857; font-size: 16px; font-weight: bold;">R$ {{ $amount }}</td>
            </tr>
        </table>
    </div>

    @if (!empty($adminPanelUrl))
        <div style="margin: 32px 0 24px; text-align: center;">
            <a href="{{ $adminPanelUrl }}" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 24px; background-color: {{ $primaryColor ?? '#1b1b18' }}; color: {{ $primaryTextColor ?? '#ffffff' }}; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Ver Detalhes no Painel</a>
        </div>
    @endif

    <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 24px; margin-bottom: 0;">
        Esta é uma notificação automática do sistema.
    </p>
@endsection
