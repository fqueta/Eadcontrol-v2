/**
 * PT: Utilitários para vídeos (detecção de provedor e URLs de embed).
 * EN: Video utilities (provider detection and embed URLs).
 */

/**
 * PT: Detecta o provedor do vídeo a partir da URL.
 * EN: Detect video provider from URL.
 */
export function getVideoProvider(url: string): 'youtube' | 'vimeo' | 'unknown' {
    try {
        const u = new URL(url);
        if (u.host.includes('youtube.com') || u.host.includes('youtu.be')) return 'youtube';
        if (u.host.includes('vimeo.com')) return 'vimeo';
        return 'unknown';
    } catch {
        return 'unknown';
    }
}

/**
 * PT: Extrai o ID do vídeo YouTube.
 * EN: Extract YouTube video ID.
 */
export function getYouTubeId(url: string): string | null {
    try {
        const u = new URL(url);
        if (u.host.includes('youtu.be')) {
            return u.pathname.replace('/', '') || null;
        }
        if (u.host.includes('youtube.com')) {
            if (u.pathname.startsWith('/watch')) return u.searchParams.get('v');
            if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * PT: Extrai o ID do vídeo Vimeo.
 * EN: Extract Vimeo video ID.
 */
export function getVimeoId(url: string): string | null {
    try {
        const u = new URL(url);
        if (u.host.includes('vimeo.com')) {
            const parts = u.pathname.split('/').filter(Boolean);
            return parts[0] || null;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * PT: Extrai o ID do vídeo Vimeo (alias para `getVimeoId`).
 * EN: Extract Vimeo video ID (alias of `getVimeoId`).
 */
export function extractVimeoId(url: string): string | null {
    return getVimeoId(url);
}

/**
 * PT: Constrói a URL de embed segura para o provedor.
 * EN: Build safe embed URL for provider.
 */
export function getEmbedUrl(url: string, autoplay = false): string | null {
    const provider = getVideoProvider(url);
    if (provider === 'youtube') {
        const id = getYouTubeId(url);
        if (!id) return null;
        const params = new URLSearchParams({ rel: '0', modestbranding: '1', autoplay: autoplay ? '1' : '0' });
        return `https://www.youtube.com/embed/${id}?${params.toString()}`;
    }
    if (provider === 'vimeo') {
        const id = getVimeoId(url);
        if (!id) return null;
        const params = new URLSearchParams({ autoplay: autoplay ? '1' : '0', dnt: '1' });
        return `https://player.vimeo.com/video/${id}?${params.toString()}`;
    }
    return null;
}

/**
 * PT: Retorna true se a URL aparenta ser de vídeo suportado.
 * EN: Returns true if URL looks like a supported video.
 */
export function isSupportedVideoUrl(url: string): boolean {
    const provider = getVideoProvider(url);
    return provider === 'youtube' || provider === 'vimeo';
}

/**
 * PT: Busca metadados de um vídeo do Vimeo com estratégia de fallback.
 *     1) Tenta a Simple API v2: `https://vimeo.com/api/v2/video/{id}.json`.
 *     2) Se falhar, tenta o endpoint do player config: `https://player.vimeo.com/video/{id}/config`.
 *     Retorna duração, título, descrição e thumbnails quando disponível.
 * EN: Fetch Vimeo metadata using a fallback strategy.
 *     1) Try Simple API v2: `https://vimeo.com/api/v2/video/{id}.json`.
 *     2) If it fails, try player config: `https://player.vimeo.com/video/{id}/config`.
 *     Returns duration, title, description, and thumbnails when available.
 */
export async function fetchVimeoMetadata(urlOrId: string): Promise<{
    id: string;
    duration?: number;
    title?: string;
    description?: string;
    thumbnails?: Record<string, string>;
}> {
    const id = /^[0-9]+$/.test(urlOrId) ? urlOrId : (extractVimeoId(urlOrId) ?? '');
    if (!id) {
        throw new Error('Vimeo ID inválido');
    }

    // 1) Simple API v2
    try {
        const res = await fetch(`https://vimeo.com/api/v2/video/${id}.json`, { method: 'GET' });
        if (res.ok) {
            const arr = (await res.json()) as Array<any>;
            const v = Array.isArray(arr) ? arr[0] : null;
            if (v) {
                return {
                    id,
                    duration: typeof v.duration === 'number' ? v.duration : undefined,
                    title: typeof v.title === 'string' ? v.title : undefined,
                    description: typeof v.description === 'string' ? v.description : undefined,
                    thumbnails: {
                        small: v.thumbnail_small,
                        medium: v.thumbnail_medium,
                        large: v.thumbnail_large,
                    },
                };
            }
        }
    } catch {
        // ignora erro, tenta fallback
    }

    // 2) Player config fallback (pode ter CORS em frontends)
    try {
        const res = await fetch(`https://player.vimeo.com/video/${id}/config`, { method: 'GET' });
        if (res.ok) {
            const cfg = await res.json();
            const video = cfg?.video;
            const thumbs = video?.thumbs ?? {};
            return {
                id,
                duration: typeof video?.duration === 'number' ? video.duration : undefined,
                title: typeof video?.title === 'string' ? video.title : undefined,
                description: typeof video?.description === 'string' ? video.description : undefined,
                thumbnails: thumbs,
            };
        }
    } catch {
        // Possível bloqueio por CORS; considere buscar via backend.
    }

    // Se ambos falharem, retorna apenas o id.
    return { id };
}