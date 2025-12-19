<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <title inertia>{{ config('app.name', 'Laravel') }}</title>
        <!-- Favicon (default) + dynamic override via localStorage -->
        <link id="app-favicon" rel="icon" type="image/x-icon" href="/favicon.ico" sizes="any">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        <script>
            /**
             * applyBrandingFromLocalStorage
             * pt-BR: Lê localStorage e aplica favicon personalizado. Também expõe a logo em window.
             * en-US: Reads localStorage and applies custom favicon. Also exposes logo to window.
             */
            (function() {
                try {
                    var favicon = localStorage.getItem('app_favicon_url');
                    var logo = localStorage.getItem('app_logo_url');
                    if (favicon) {
                        var linkEl = document.getElementById('app-favicon');
                        if (linkEl) {
                            var type = 'image/png';
                            if (/\.svg$/i.test(favicon)) type = 'image/svg+xml';
                            if (/\.ico$/i.test(favicon)) type = 'image/x-icon';
                            linkEl.setAttribute('type', type);
                            linkEl.setAttribute('href', favicon);
                        }
                    }
                    if (logo) {
                        window.__APP_LOGO_URL__ = logo;
                    }
                } catch (e) {
                    console.warn('Branding load failed:', e);
                }
            })();
        </script>

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
