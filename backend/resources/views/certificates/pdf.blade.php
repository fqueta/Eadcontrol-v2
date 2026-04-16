<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        @page { size: A4 landscape; margin: 0; }
        * { margin:0; padding:0; box-sizing: border-box; }
        body { 
            font-family: 'Helvetica', 'Arial', sans-serif; 
            color: #374151; 
            background: #ffffff;
            margin: 0;
            padding: 0;
            width: 297mm;
            height: 210mm;
            overflow: hidden;
        }
        .bg-img {
            position: absolute;
            top: 0;
            left: 0;
            width: 297mm;
            height: 210mm;
            z-index: 1;
        }
        .content {
            position: absolute;
            top: 0;
            left: 0;
            width: 297mm;
            height: 210mm;
            z-index: 10;
            padding: 30px;
            text-align: center;
        }
        .title {
            margin-top: 20px;
            font-size: 38px;
            font-weight: bold;
            color: {{ $accentColor }};
            text-transform: uppercase;
        }
        .body-text {
            margin-top: 15px;
            font-size: 18px;
            line-height: 1.4;
            color: #4B5563;
            padding: 0 60px;
        }
        .qr-section {
            margin-top: 20px;
        }
        .qr-section img {
            width: 100px;
            height: 100px;
        }
        .footer-table {
            position: absolute;
            bottom: 50px;
            left: 0;
            right: 0;
            width: 100%;
            padding: 0 100px;
            border-collapse: collapse;
        }
        .footer-table td {
            width: 50%;
            text-align: center;
            vertical-align: bottom;
            padding: 0 20px;
        }
        .signature-line {
            border-top: 1px solid #9CA3AF;
            margin: 5px auto 0;
            width: 100%;
        }
        .footer-label {
            font-size: 14px;
            color: #6B7280;
            margin-top: 5px;
        }
        .signature-img {
            max-height: 80px;
            max-width: 220px;
            display: block;
            margin: 0 auto 5px;
        }
        .qr-fixed {
            position: absolute;
            z-index: 50;
        }
        .qr-top-left { top: 30px; left: 30px; }
        .qr-top-center { top: 30px; left: 50%; transform: translateX(-50%); }
        .qr-top-right { top: 30px; right: 30px; }
        .qr-bottom-left { bottom: 30px; left: 30px; }
        .qr-bottom-center { bottom: 120px; left: 50%; transform: translateX(-50%); }
        .qr-bottom-right { bottom: 30px; right: 30px; }
    </style>
</head>
<body>
    @if(!empty($bgUrl))
        <img src="{{ $bgUrl }}" class="bg-img" />
    @endif

    @if($qrPosition !== 'integrated')
        <div class="qr-fixed qr-{{ $qrPosition }}">
            {!! $qrImgHtml !!}
        </div>
    @endif
    
    <div class="content">
        <h1 class="title">{{ $title }}</h1>
        
        <div class="body-text">
            {!! $body !!}
        </div>


        <table class="footer-table">
            <tr>
                <td>
                    @if(!empty($signatureLeftUrl))
                        <img src="{{ $signatureLeftUrl }}" class="signature-img" />
                    @else
                        <div style="height: 80px;"></div>
                    @endif
                    <div class="signature-line"></div>
                    <div class="footer-label">{{ $footerLeft }}</div>
                </td>
                <td>
                    @if(!empty($signatureRightUrl))
                        <img src="{{ $signatureRightUrl }}" class="signature-img" />
                    @else
                        <div style="height: 80px;"></div>
                    @endif
                    <div class="signature-line"></div>
                    <div class="footer-label">{{ $footerRight }}</div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
