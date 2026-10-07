<?php

namespace App\Services\Media\Strategies;

use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

/**
 * CappedReencodeStrategy
 * pt-BR: Reencoda o vídeo limitando a resolução ao teto de 720p (1280x720),
 *        preservando a proporção. Usada automaticamente quando o upload
 *        original excede o teto — arquivos menores seguem pelo remux rápido.
 *        Gera HLS de faixa única (rápido e leve para o aluno).
 */
class CappedReencodeStrategy implements TranscoderStrategyInterface
{
    public const MAX_WIDTH = 1280;
    public const MAX_HEIGHT = 720;

    protected string $ffmpegBinary;

    public function __construct(?string $ffmpegBinary = null)
    {
        $this->ffmpegBinary = $ffmpegBinary ?: $this->resolveFfmpegPath();
    }

    public function getName(): string
    {
        return 'capped_720p_hls';
    }

    public function transcode(string $inputFilePath, string $outputDir, array $options = []): TranscodeResult
    {
        if (!file_exists($inputFilePath)) {
            return TranscodeResult::failure("Arquivo de entrada não encontrado: {$inputFilePath}");
        }

        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0775, true);
        }

        [$targetW, $targetH] = $this->resolveTargetDimensions($inputFilePath);

        $segmentTime = $options['segment_time'] ?? 4;
        $playlistPath = rtrim($outputDir, '/') . '/master.m3u8';
        $segmentPattern = rtrim($outputDir, '/') . '/segment_%03d.ts';
        $thumbnailPath = rtrim($outputDir, '/') . '/thumbnail.jpg';

        Log::info("CappedReencodeStrategy: normalizando para {$targetW}x{$targetH}.");

        $cmd = [
            $this->ffmpegBinary,
            '-y',
            '-i', $inputFilePath,
            '-map', '0:v:0',
            '-map', '0:a:0?',
            '-vf', "scale={$targetW}:{$targetH}",
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ac', '2',
            '-pix_fmt', 'yuv420p',
            '-start_number', '0',
            '-hls_time', (string) $segmentTime,
            '-hls_list_size', '0',
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', $segmentPattern,
            $playlistPath,
        ];

        $process = new Process($cmd);
        $process->setTimeout(1800); // 30 minutos (acompanha o timeout do job)
        $process->run();

        if (!$process->isSuccessful() || !file_exists($playlistPath)) {
            Log::error("CappedReencodeStrategy falhou: " . $process->getErrorOutput());
            return TranscodeResult::failure("Falha na normalização 720p: " . $process->getErrorOutput());
        }

        $this->extractThumbnail($inputFilePath, $thumbnailPath);
        $segments = glob(rtrim($outputDir, '/') . '/segment_*.ts') ?: [];

        return TranscodeResult::success(
            outputDir: $outputDir,
            masterPlaylist: $playlistPath,
            thumbnail: file_exists($thumbnailPath) ? $thumbnailPath : null,
            segmentFiles: $segments,
            durationSeconds: $this->extractDuration($inputFilePath)
        );
    }

    /**
     * Calcula a resolução alvo preservando a proporção dentro da caixa 1280x720.
     * Retorna dimensões pares (exigência do H.264).
     *
     * @return array{0: int, 1: int}
     */
    protected function resolveTargetDimensions(string $inputFilePath): array
    {
        [$w, $h] = $this->probeDimensions($inputFilePath);

        if ($w <= 0 || $h <= 0) {
            return [self::MAX_WIDTH, self::MAX_HEIGHT];
        }

        if ($w <= self::MAX_WIDTH && $h <= self::MAX_HEIGHT) {
            return [$w - ($w % 2), $h - ($h % 2)];
        }

        if ($w >= $h) {
            $tw = min($w, self::MAX_WIDTH);
            $th = (int) round($tw * $h / $w);
        } else {
            $th = min($h, self::MAX_HEIGHT);
            $tw = (int) round($th * $w / $h);
        }

        $tw = max(2, $tw - ($tw % 2));
        $th = max(2, $th - ($th % 2));

        return [$tw, $th];
    }

    /**
     * @return array{0: int, 1: int}
     */
    protected function probeDimensions(string $inputFilePath): array
    {
        $ffprobe = str_replace('ffmpeg', 'ffprobe', $this->ffmpegBinary);
        if (!file_exists($ffprobe)) {
            return [0, 0];
        }

        try {
            $proc = new Process([
                $ffprobe,
                '-v', 'error',
                '-select_streams', 'v:0',
                '-show_entries', 'stream=width,height',
                '-of', 'csv=p=0',
                $inputFilePath,
            ]);
            $proc->setTimeout(15);
            $proc->run();
            if ($proc->isSuccessful()) {
                $parts = explode(',', trim($proc->getOutput()));
                return [(int) ($parts[0] ?? 0), (int) ($parts[1] ?? 0)];
            }
        } catch (\Throwable) {}

        return [0, 0];
    }

    protected function extractThumbnail(string $inputFilePath, string $thumbnailPath): void
    {
        try {
            $proc = new Process([
                $this->ffmpegBinary,
                '-y',
                '-ss', '00:00:02',
                '-i', $inputFilePath,
                '-vframes', '1',
                '-q:v', '2',
                $thumbnailPath,
            ]);
            $proc->setTimeout(30);
            $proc->run();
        } catch (\Throwable $e) {
            Log::warning("Não foi possível extrair thumbnail do vídeo: " . $e->getMessage());
        }
    }

    protected function extractDuration(string $inputFilePath): int
    {
        $ffprobe = str_replace('ffmpeg', 'ffprobe', $this->ffmpegBinary);
        if (!file_exists($ffprobe)) {
            return 0;
        }

        try {
            $proc = new Process([
                $ffprobe,
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                $inputFilePath,
            ]);
            $proc->setTimeout(15);
            $proc->run();

            if ($proc->isSuccessful()) {
                return (int) round((float) trim($proc->getOutput()));
            }
        } catch (\Throwable) {}

        return 0;
    }

    protected function resolveFfmpegPath(): string
    {
        $localBin = base_path('bin/ffmpeg');
        if (file_exists($localBin) && is_executable($localBin)) {
            return $localBin;
        }

        return env('FFMPEG_PATH', 'ffmpeg');
    }
}
