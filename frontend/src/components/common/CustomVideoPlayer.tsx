import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  RotateCw, 
  Settings, 
  PictureInPicture,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CustomVideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  initialTime?: number;
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPause?: (currentTime: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  className?: string;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  title,
  poster,
  initialTime = 0,
  autoPlay = false,
  onTimeUpdate,
  onPause,
  onEnded,
  onPlay,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [centerAnimation, setCenterAnimation] = useState<'play' | 'pause' | null>(null);

  // Formatar tempo (00:00 ou 00:00:00)
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
    const totalSeconds = Math.floor(timeInSeconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // Auto-hide controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isPlaying]);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video.play().catch(() => {});
      setCenterAnimation('play');
    } else {
      video.pause();
      setCenterAnimation('pause');
    }
    setTimeout(() => setCenterAnimation(null), 500);
  }, []);

  // Seek +/- 10s
  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.min(Math.max(0, video.currentTime + seconds), video.duration || 0);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  // Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      if (volume === 0) {
        setVolume(0.5);
        video.volume = 0.5;
      }
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  // Playback Rate
  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  // Fullscreen
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // PiP
  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.error('Erro no Picture-in-Picture:', e);
    }
  };

  // Progress Bar Seek
  const calculateProgressFromEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    const bar = progressBarRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return pos;
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = calculateProgressFromEvent(e);
    const video = videoRef.current;
    if (!video || !duration) return;
    const newTime = pos * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressBarHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = calculateProgressFromEvent(e);
    if (duration > 0) {
      setHoverTime(pos * duration);
      setHoverPosition(pos * 100);
    }
  };

  const handleProgressBarLeave = () => {
    setHoverTime(null);
  };

  // Atalhos de teclado familiares do YouTube
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se o usuário estiver digitando em um input ou textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          skip(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          skip(10);
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume((prev) => {
            const next = Math.min(1, prev + 0.1);
            if (videoRef.current) {
              videoRef.current.volume = next;
              videoRef.current.muted = false;
              setIsMuted(false);
            }
            return next;
          });
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume((prev) => {
            const next = Math.max(0, prev - 0.1);
            if (videoRef.current) {
              videoRef.current.volume = next;
              if (next === 0) {
                videoRef.current.muted = true;
                setIsMuted(true);
              }
            }
            return next;
          });
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip]);

  // Sincronização de Fullscreen
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Inicialização e Retoma
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hasResumed = false;

    const onLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      if (!hasResumed && initialTime > 0) {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
        hasResumed = true;
      }
    };

    const onTimeUpdateHandler = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        const buffEnd = video.buffered.end(video.buffered.length - 1);
        setBuffered(buffEnd);
      }
      onTimeUpdate?.(video.currentTime, video.duration);
    };

    const onPlayHandler = () => {
      setIsPlaying(true);
      setIsLoading(false);
      onPlay?.();
    };

    const onPauseHandler = () => {
      setIsPlaying(false);
      setShowControls(true);
      onPause?.(video.currentTime);
    };

    const onEndedHandler = () => {
      setIsPlaying(false);
      setShowControls(true);
      onEnded?.();
    };

    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdateHandler);
    video.addEventListener('play', onPlayHandler);
    video.addEventListener('pause', onPauseHandler);
    video.addEventListener('ended', onEndedHandler);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdateHandler);
      video.removeEventListener('play', onPlayHandler);
      video.removeEventListener('pause', onPauseHandler);
      video.removeEventListener('ended', onEndedHandler);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
    };
  }, [src, initialTime, onTimeUpdate, onPause, onEnded, onPlay]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={cn(
        'relative group select-none overflow-hidden bg-black flex items-center justify-center font-sans aspect-video w-full',
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen max-w-none rounded-none' : 'rounded-lg shadow-lg',
        className
      )}
    >
      {/* Vídeo HTML5 */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[1px]">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
        </div>
      )}

      {/* Animação Central ao Clicar (Play / Pause) */}
      {centerAnimation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 text-white rounded-full p-6 transform scale-125 transition-all duration-300 animate-out fade-out zoom-out">
            {centerAnimation === 'play' ? (
              <Play className="w-12 h-12 fill-white" />
            ) : (
              <Pause className="w-12 h-12 fill-white" />
            )}
          </div>
        </div>
      )}

      {/* Título do Vídeo no Topo (gradiente sutil) */}
      {title && (
        <div
          className={cn(
            'absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 pointer-events-none',
            showControls ? 'opacity-100' : 'opacity-0'
          )}
        >
          <h3 className="text-white text-sm md:text-base font-medium truncate drop-shadow-md">
            {title}
          </h3>
        </div>
      )}

      {/* Controles Estilo YouTube (Barra Inferior) */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 px-3 pb-2 pt-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Barra de Progresso com Scrubber Vermelho e Buffer */}
        <div
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          onMouseMove={handleProgressBarHover}
          onMouseLeave={handleProgressBarLeave}
          className="relative h-2 hover:h-3.5 group/progress cursor-pointer flex items-center transition-all duration-150 mb-2"
        >
          {/* Tooltip de tempo ao passar o mouse */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 transform -translate-x-1/2 bg-black/85 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none border border-white/10"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Fundo da trilha */}
          <div className="absolute inset-0 bg-white/20 rounded-full overflow-hidden">
            {/* Barra de Buffer */}
            <div
              className="h-full bg-white/40 transition-all duration-150"
              style={{ width: `${bufferPercent}%` }}
            />
          </div>

          {/* Barra de Progresso Real (Vermelho YouTube) */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-red-600 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Knob / Marcador Vermelho */}
          <div
            className="absolute w-3.5 h-3.5 bg-red-600 rounded-full shadow-md transform -translate-x-1/2 scale-0 group-hover/progress:scale-100 transition-transform duration-150"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Linha de Botões de Controle */}
        <div className="flex items-center justify-between text-white text-sm">
          {/* Lado Esquerdo: Play, Skip, Volume, Tempo */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
              title={isPlaying ? 'Pausar (k/espaço)' : 'Reproduzir (k/espaço)'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white" />
              )}
            </button>

            {/* Voltar 10s */}
            <button
              onClick={() => skip(-10)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors focus:outline-none hidden sm:block"
              title="Voltar 10s (j/seta esq)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Avançar 10s */}
            <button
              onClick={() => skip(10)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors focus:outline-none hidden sm:block"
              title="Avançar 10s (l/seta dir)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Controle de Volume com Slider expansível */}
            <div className="flex items-center group/volume">
              <button
                onClick={toggleMute}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
                title={isMuted ? 'Desmutar (m)' : 'Mudo (m)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <div className="w-0 overflow-hidden group-hover/volume:w-16 md:group-hover/volume:w-20 transition-all duration-200 flex items-center ml-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1 bg-white/40 accent-red-600 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Tempo Atual / Duração */}
            <div className="text-xs md:text-sm font-medium text-white/90 ml-1">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-white/50">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Lado Direito: Velocidade, PiP, Fullscreen */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Seletor de Velocidade */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="px-2 py-1 text-xs font-semibold hover:bg-white/10 rounded transition-colors focus:outline-none"
                  title="Velocidade de Reprodução"
                >
                  {playbackRate === 1 ? 'Normal' : `${playbackRate}x`}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-neutral-900 text-white border-neutral-800">
                <div className="text-xs text-white/60 px-2 py-1 font-medium border-b border-neutral-800">
                  Velocidade de Reprodução
                </div>
                {PLAYBACK_RATES.map((rate) => (
                  <DropdownMenuItem
                    key={rate}
                    onClick={() => handleRateChange(rate)}
                    className={cn(
                      'cursor-pointer text-xs py-1.5 focus:bg-neutral-800 focus:text-white',
                      playbackRate === rate ? 'text-red-500 font-bold' : 'text-neutral-300'
                    )}
                  >
                    {rate === 1 ? 'Normal (1x)' : `${rate}x`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Picture-in-Picture */}
            {document.pictureInPictureEnabled && (
              <button
                onClick={togglePiP}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors focus:outline-none hidden sm:block"
                title="Picture-in-Picture"
              >
                <PictureInPicture className="w-4 h-4" />
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
              title={isFullscreen ? 'Sair da tela cheia (f)' : 'Tela cheia (f)'}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
