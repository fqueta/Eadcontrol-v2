<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', $institutionName ?? config('app.name'))</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1e293b;">
    <div style="width: 100%; background-color: #f5f7fb; padding: 24px 0;">
        <div style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <!-- Header -->
            <div style="padding: 20px 24px; background-color: {{ $primaryColor ?? '#1b1b18' }}; color: {{ $primaryTextColor ?? '#ffffff' }}; text-align: center;">
                <div style="display: inline-block; font-weight: 600; letter-spacing: 0.3px; font-size: 18px;">
                    @if (!empty($logoSrc))
                        <img src="{{ $logoSrc }}" alt="Logo" style="height: 24px; width: auto; max-width: 150px; vertical-align: middle; margin-right: 8px;" />
                    @elseif (!empty($logoDataUri))
                        <img src="{{ $logoDataUri }}" alt="Logo" style="height: 24px; width: auto; max-width: 150px; vertical-align: middle; margin-right: 8px;" />
                    @else
                        <img src="{{ asset('logo.svg') }}" alt="Logo" style="height: 24px; width: 24px; vertical-align: middle; margin-right: 8px;" />
                    @endif
                    <span style="vertical-align: middle; color: {{ $primaryTextColor ?? '#ffffff' }};">{{ $institutionName ?? config('app.name') }}</span>
                </div>
            </div>
            
            <!-- Content -->
            <div style="padding: 24px;">
                @yield('content')
            </div>

            <!-- Footer -->
            <div style="padding: 16px 24px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9;">
                <div style="margin-bottom: 4px;">&copy; {{ date('Y') }} {{ $institutionName ?? config('app.name') }}. Todos os direitos reservados.</div>
                <div>{{ config('mail.from.name') }} &bull; {{ config('mail.from.address') }}</div>
            </div>
        </div>
    </div>
</body>
</html>
