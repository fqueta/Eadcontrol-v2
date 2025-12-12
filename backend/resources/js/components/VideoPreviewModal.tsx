import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getEmbedUrl, isSupportedVideoUrl } from '@/lib/video';
import React, { useMemo, useState } from 'react';

/**
 * PT: Modal de preview de vídeo (YouTube/Vimeo) com iframe embed.
 * EN: Video preview modal (YouTube/Vimeo) using embed iframe.
 */
export interface VideoPreviewModalProps {
    /** PT: URL do vídeo (YouTube/Vimeo). EN: Video URL (YouTube/Vimeo). */
    url: string;
    /** PT: Rótulo do botão gatilho. EN: Trigger button label. */
    triggerLabel?: string;
    /** PT: Autoplay ao abrir modal. EN: Autoplay when modal opens. */
    autoplay?: boolean;
    /** PT: Controlar abertura externamente. EN: Control open externally. */
    open?: boolean;
    /** PT: Mudança de estado externo. EN: External state change handler. */
    onOpenChange?: (open: boolean) => void;
    /** PT: Classe opcional. EN: Optional className. */
    className?: string;
}

/**
 * PT: Componente que exibe um modal com um player embedded do vídeo.
 * EN: Component that shows a modal with an embedded video player.
 */
export function VideoPreviewModal({ url, triggerLabel = 'Preview', autoplay = false, open, onOpenChange, className }: VideoPreviewModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const controlled = typeof open === 'boolean';
    const isVideo = useMemo(() => isSupportedVideoUrl(url), [url]);
    const embedSrc = useMemo(() => getEmbedUrl(url, autoplay), [url, autoplay]);

    const currentOpen = controlled ? open! : internalOpen;
    const handleOpenChange = (next: boolean) => {
        if (controlled) {
            onOpenChange?.(next);
        } else {
            setInternalOpen(next);
        }
    };

    if (!isVideo || !embedSrc) {
        return null;
    }

    return (
        <Dialog open={currentOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className={className}>
                    {triggerLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Preview do Vídeo</DialogTitle>
                </DialogHeader>
                <div className="relative w-full">
                    <div className="aspect-video w-full overflow-hidden rounded-md border">
                        <iframe
                            src={embedSrc}
                            className="h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Video Preview"
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default VideoPreviewModal;