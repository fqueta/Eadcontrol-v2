<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
    <style>
        @page { size: A4; margin: 0; }
        html, body { height: 100%; }
        body { font-family: DejaVu Sans, Arial, sans-serif; color: #374151; }
        .page { width: 210mm; min-height: 297mm; background: #ffffff; position: relative; }
        .content { padding: 48px; }
        .title { text-align: center; font-size: 28px; font-weight: 700; color: {{ $accentColor }}; }
        .body { margin-top: 24px; font-size: 16px; line-height: 1.7; text-align: center; }
        .footer { position: absolute; bottom: 64px; left: 48px; right: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 96px; }
        .footer .item { text-align: center; }
        .footer .line { border-top: 1px solid #9CA3AF; }
        .footer .label { margin-top: 6px; font-size: 12px; color: #6B7280; }
        .bg { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: {{ $bgUrl ? '1' : '0' }}; }
        .qr { display: flex; justify-content: center; margin-top: 40px; }
        .qr img { width: 120px; height: 120px; }
    </style>
</head>
<body>
    <div class="page">
        @if(!empty($bgUrl))
            <div class="bg" style="background-image: url('{{ $bgUrl }}');"></div>
        @endif
        <div class="content">
            <div class="title">{{ $title }}</div>
            <div class="body">{{ $body }}</div>
            <div class="qr">
                <img alt="QR Code" src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data={{ urlencode($validationUrl) }}">
            </div>
            <div class="footer">
                <div class="item">
                    <div class="line"></div>
                    <div class="label">{{ $footerLeft }}</div>
                </div>
                <div class="item">
                    <div class="line"></div>
                    <div class="label">{{ $footerRight }}</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
