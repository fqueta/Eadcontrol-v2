import { X, ExternalLink, Calendar, Video } from 'lucide-react';
import { VideoTip } from '@/services/videoTipsService';

interface VideoTipModalProps {
  tip: VideoTip;
  open: boolean;
  onClose: () => void;
}

/**
 * VideoTipModal
 * pt-BR: Modal de reprodução de vídeo/dica com iframe embed do YouTube ou Vimeo.
 *        Usado tanto na área admin (pré-visualização) quanto na área do aluno.
 * en-US: Video tip playback modal with YouTube or Vimeo embed iframe.
 *        Used in the admin area (preview) and student area.
 */
export default function VideoTipModal({ tip, open, onClose }: VideoTipModalProps) {
  if (!open) return null;

  const embedUrl = tip.embed_url ?? (tip.config as any)?.embed_url ?? null;
  const videoUrl = tip.video_url ?? (tip.config as any)?.video_url ?? null;
  const title = tip.title ?? tip.post_title ?? '(sem título)';
  const description = tip.description ?? tip.post_content ?? null;
  const createdAt = tip.created_at
    ? new Date(tip.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Assistir: ${title}`}
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          id="btn-close-video-modal"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Player */}
        <div className="relative w-full aspect-video bg-black">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
              <Video className="w-16 h-16" />
              <p className="text-sm">URL de incorporação não disponível.</p>
              {videoUrl && (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline text-sm"
                >
                  Abrir no player original
                </a>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold leading-snug">{title}</h2>
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                title="Abrir no YouTube/Vimeo"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          {createdAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              {createdAt}
            </div>
          )}
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line pt-1">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
