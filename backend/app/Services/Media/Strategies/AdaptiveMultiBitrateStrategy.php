<?php

namespace App\Services\Media\Strategies;

use Symfony\Component\Process\Process;
use Illuminate\Support\Facades\Log;

class AdaptiveMultiBitrateStrategy implements TranscoderStrategyInterface
{
    protected string $ffmpegBinary;

    public function __construct(?string $ffmpegBinary = null)
    {
        $this->ffmpegBinary = $ffmpegBinary ?: $this->resolveFfmpegPath();
    }

    public function getName(): string
    {
        return 'adaptive_reencode_hls';
    }

    public function transcode(string $inputFilePath, string $outputDir, array $options = []): TranscodeResult
    {
        if (!file_exists($inputFilePath)) {
            return TranscodeResult::failure("Arquivo de entrada não encontrado: {$inputFilePath}");
        }

        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0775, true);
        }

        $segmentTime = $options['segment_time'] ?? 4;
        $playlistPath = rtrim($outputDir, '/') . '/master.m3u8';
        $segmentPattern = rtrim($outputDir, '/') . '/segment_%03d.ts';
        $thumbnailPath = rtrim($outputDir, '/') . '/thumbnail.jpg';

        // Reencodifica para compatibilidade total: H.264 (preset fast/veryfast, crf 23) + áudio AAC
        $cmd = [
            $this->ffmpegBinary,
            '-y',
            '-i', $inputFilePath,
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
        $process->setTimeout(1800); // 30 minutos máximo
        $process->run();

        if (!$process->isSuccessful() || !file_exists($playlistPath)) {
            Log::error("AdaptiveMultiBitrateStrategy falhou: " . $process->getErrorOutput());
            return TranscodeResult::failure("Falha na reencodificação HLS: " . $process->getErrorOutput());
        }

        // Extrair thumbnail
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

    protected function extractThumbnail(string $inputFilePath, string $thumbnailPath): void
    {
        try {
            $cmd = [
                $this->ffmpegBinary,
                '-y',
                '-ss', '00:00:02',
                '-i', $inputFilePath,
                '-vframes', '1',
                '-q:v', '2',
                $thumbnailPath,
            ];
            $proc = new Process($cmd);
            $proc->setTimeout(30);
            $proc->run();
        } catch (\Throwable $e) {
            Log::warning("Falha ao extrair thumbnail: " . $e->getMessage());
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
