<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title ?? 'Vídeo' }} — Ead Control</title>
    <meta name="robots" content="noindex, nofollow">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background: #0a0a0f;
            color: #e2e8f0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .player-wrapper {
            width: 100%;
            max-width: 1100px;
            padding: 16px;
        }

        .player-container {
            position: relative;
            width: 100%;
            aspect-ratio: 16 / 9;
            background: #000;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.8);
        }

        /* Overlay invisível que bloqueia right-click e seleção visual da tag video */
        .player-overlay {
            position: absolute;
            inset: 0;
            z-index: 5;
            background: transparent;
            pointer-events: none; /* Passa cliques para os controles */
        }

        video {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
        }

        /* Watermark sutil */
        .watermark {
            position: absolute;
            bottom: 60px;
            right: 16px;
            z-index: 10;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.25);
            letter-spacing: 0.05em;
            pointer-events: none;
            user-select: none;
        }

        .video-title {
            margin-top: 16px;
            font-size: 16px;
            font-weight: 600;
            color: #cbd5e1;
            text-align: center;
            padding: 0 8px;
        }

        .video-brand {
            margin-top: 8px;
            font-size: 12px;
            color: #475569;
            text-align: center;
        }

        /* Fallback message */
        .no-support {
            text-align: center;
            padding: 40px 20px;
            color: #64748b;
        }
    </style>
</head>
<body>
<div class="player-wrapper">
    <div class="player-container" id="playerContainer">
        <!-- Overlay de proteção -->
        <div class="player-overlay" id="playerOverlay"></div>

        <video
            id="secureVideo"
            controls
            playsinline
            controlsList="nodownload noremoteplayback nofullscreen"
            disablePictureInPicture
            preload="none"
            poster="{{ $mediaFile->thumbnail_url ?? '' }}"
            style="width:100%;height:100%;object-fit:contain;"
        >
            <source src="#" type="application/x-mpegURL" />
            <p class="no-support">Seu navegador não suporta reprodução de vídeo.</p>
        </video>

        <!-- Watermark -->
        <div class="watermark" aria-hidden="true">Ead Control</div>
    </div>

    <p class="video-title">{{ $title ?? 'Vídeo' }}</p>
    <p class="video-brand">Transmitido com segurança via Ead Control</p>
</div>

{{-- hls.js para streaming adaptativo --}}
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js" integrity="sha256-VFMr7i1+Yn9VFDkY+K+sH5tZSGGE7GXa3zM3F9LRiH0=" crossorigin="anonymous"></script>

<script>
(function() {
    'use strict';

    const video       = document.getElementById('secureVideo');
    const streamToken = '{{ $streamToken }}';
    const streamBase  = '{{ $streamBase }}';
    const hlsFile     = 'master.m3u8';
    const hlsUrl      = streamBase + '/' + hlsFile + (streamToken ? '?st=' + encodeURIComponent(streamToken) : '');

    // ── Proteções anti-download ─────────────────────────────────────────────

    // Bloquear menu de contexto no player
    document.getElementById('playerContainer').addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });

    // Bloquear atalhos comuns de salvar/inspecionar
    document.addEventListener('keydown', function(e) {
        const blocked = (
            (e.ctrlKey && ['s', 'u', 'j'].includes(e.key.toLowerCase())) ||
            e.key === 'F12'
        );
        if (blocked) {
            e.preventDefault();
            return false;
        }
    });

    // Desabilitar drag do vídeo
    video.addEventListener('dragstart', function(e) { e.preventDefault(); });

    // DevTools warning
    const devWarning = '%c⚠ Atenção! %cEste conteúdo é protegido e não pode ser reproduzido fora desta plataforma.';
    console.log(devWarning, 'color:#f59e0b;font-size:18px;font-weight:bold;', 'color:#94a3b8;font-size:13px;');

    // ── Inicializar player HLS ──────────────────────────────────────────────

    function initPlayer() {
        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            const hls = new Hls({
                xhrSetup: function(xhr, url) {
                    // Injetar stream token em todas as requisições de segmentos
                    if (streamToken && !url.includes('st=')) {
                        const sep = url.includes('?') ? '&' : '?';
                        // URL já é reescrita pelo backend, mas garantimos o header
                        xhr.setRequestHeader('X-Stream-Token', streamToken);
                    }
                },
                maxBufferLength: 30,
                backBufferLength: 10,
            });

            hls.loadSource(hlsUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                // Não auto-play: deixa o usuário iniciar
            });

            hls.on(Hls.Events.ERROR, function(event, data) {
                if (data.fatal) {
                    console.warn('HLS error:', data.type, data.details);
                }
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari nativo
            video.src = hlsUrl;
        } else {
            video.parentElement.innerHTML = '<p style="text-align:center;padding:40px;color:#64748b;">Seu navegador não suporta este formato de vídeo. Tente com Chrome ou Safari.</p>';
        }
    }

    // Inicializar quando a lib carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPlayer);
    } else {
        initPlayer();
    }
})();
</script>
</body>
</html>
