import React from 'react';
import { VideoPreviewModal } from '@/components/VideoPreviewModal';
import { isSupportedVideoUrl } from '@/lib/video';

/**
 * PT: Componente para renderizar um link de vídeo com botão de preview em modal.
 * EN: Component to render a video link with a preview button in a modal.
 */
export interface VideoLinkWithPreviewProps {
    /** PT: URL do vídeo (YouTube/Vimeo). EN: Video URL (YouTube/Vimeo). */
    url: string;
    /** PT: Texto do link. EN: Link text. */
    text?: string;
    /** PT: Rótulo do botão Preview. EN: Preview button label. */
    previewLabel?: string;
}

/**
 * PT: Exibe o link original e, se suportado, um botão "Preview" que abre o modal.
 * EN: Shows the original link and, if supported, a "Preview" button that opens the modal.
 */
export function VideoLinkWithPreview({ url, text, previewLabel = 'Preview' }: VideoLinkWithPreviewProps) {
    const supported = isSupportedVideoUrl(url);

    return (
        <div className="flex items-center gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
                {text ?? url}
            </a>
            {supported && <VideoPreviewModal url={url} triggerLabel={previewLabel} />}
        </div>
    );
}

export default VideoLinkWithPreview;