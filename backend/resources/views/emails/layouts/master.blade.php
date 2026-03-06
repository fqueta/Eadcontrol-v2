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
            <div style="padding: 30px 24px; background-color: {{ $primaryColor ?? '#ffffff' }}; color: {{ $primaryTextColor ?? '#1e293b' }}; text-align: center;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                    <tr>
                        <td align="center">
                            @if (!empty($logoSrc))
                                <img src="{{ $logoSrc }}" alt="Logo" style="height: auto; max-height: 80px; width: auto; max-width: 250px; display: block; margin: 0 auto; border: 0;" />
                            @elseif (!empty($logoDataUri))
                                <img src="{{ $logoDataUri }}" alt="Logo" style="height: auto; max-height: 80px; width: auto; max-width: 250px; display: block; margin: 0 auto; border: 0;" />
                            @else
                                <img src="{{ asset('logo.svg') }}" alt="Logo" style="height: auto; max-height: 80px; width: auto; max-width: 250px; display: block; margin: 0 auto; border: 0;" />
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-top: 30px;">
                            <h1 style="margin: 0; font-size: 23px; line-height: 28px; font-weight: bold; color: {{ $primaryTextColor ?? '#1e293b' }}; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                {{ $institutionName ?? config('app.name') }}
                            </h1>
                        </td>
                    </tr>
                    @if(!empty($institutionSlogan))
                    <tr>
                        <td align="center" style="padding-top: 8px;">
                            <p style="margin: 0; font-size: 14px; line-height: 20px; font-weight: normal; color: {{ $primaryTextColor ?? '#475569' }}; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; opacity: 0.9;">
                                {{ $institutionSlogan }}
                            </p>
                        </td>
                    </tr>
                    @endif
                </table>
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
