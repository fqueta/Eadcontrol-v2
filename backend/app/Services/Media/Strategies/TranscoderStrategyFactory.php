<?php

namespace App\Services\Media\Strategies;

use Symfony\Component\Process\Process;

class TranscoderStrategyFactory
{
    /**
     * Inspeciona o arquivo e retorna a melhor estratégia de transcodificação.
     */
    public static function createForFile(string $inputFilePath, array $options = []): TranscoderStrategyInterface
    {
        if (!empty($options['force_reencode'])) {
            return new AdaptiveMultiBitrateStrategy();
        }

        // Teto automático de 720p: originais maiores são normalizados (uma
        // passada H.264) antes de fatiar — arquivos menores seguem via remux.
        if (self::exceedsResolutionCap($inputFilePath)) {
            return new CappedReencodeStrategy();
        }

        $codecs = self::detectCodecs($inputFilePath);
        $videoCodec = strtolower($codecs['video'] ?? '');
        $audioCodec = strtolower($codecs['audio'] ?? '');

        // Se o vídeo for H.264 (AVC) e áudio for AAC (ou sem áudio), o remux HLS é 100% compatível e instantâneo
        $isVideoCompatible = in_array($videoCodec, ['h264', 'avc1']);
        $isAudioCompatible = empty($audioCodec) || in_array($audioCodec, ['aac', 'mp3']);

        if ($isVideoCompatible && $isAudioCompatible) {
            return new FastRemuxStrategy();
        }

        return new AdaptiveMultiBitrateStrategy();
    }

    /**
     * Verifica se o vídeo excede o teto de 720p (1280x720).
     * Falha de leitura (dimensões zeradas) retorna false para manter o fluxo atual.
     */
    public static function exceedsResolutionCap(
        string $inputFilePath,
        int $maxWidth = CappedReencodeStrategy::MAX_WIDTH,
        int $maxHeight = CappedReencodeStrategy::MAX_HEIGHT
    ): bool {
        $localBin = base_path('bin/ffprobe');
        $ffprobe = file_exists($localBin) && is_executable($localBin) ? $localBin : 'ffprobe';

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
                $w = (int) ($parts[0] ?? 0);
                $h = (int) ($parts[1] ?? 0);
                return $w > $maxWidth || $h > $maxHeight;
            }
        } catch (\Throwable) {}

        return false;
    }

    /**
     * Detecta os codecs de áudio e vídeo usando ffprobe.
     */
    public static function detectCodecs(string $inputFilePath): array
    {
        $localBin = base_path('bin/ffprobe');
        $ffprobe = file_exists($localBin) && is_executable($localBin) ? $localBin : 'ffprobe';

        try {
            $proc = new Process([
                $ffprobe,
                '-v', 'error',
                '-select_streams', 'v:0',
                '-show_entries', 'stream=codec_name',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                $inputFilePath,
            ]);
            $proc->setTimeout(15);
            $proc->run();
            $videoCodec = trim($proc->getOutput());

            $procAudio = new Process([
                $ffprobe,
                '-v', 'error',
                '-select_streams', 'a:0',
                '-show_entries', 'stream=codec_name',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                $inputFilePath,
            ]);
            $procAudio->setTimeout(15);
            $procAudio->run();
            $audioCodec = trim($procAudio->getOutput());

            return [
                'video' => $videoCodec,
                'audio' => $audioCodec,
            ];
        } catch (\Throwable $e) {
            return ['video' => '', 'audio' => ''];
        }
    }
}
