<?php

namespace App\Services\Media\Strategies;

interface TranscoderStrategyInterface
{
    /**
     * Retorna o identificador amigável da estratégia.
     */
    public function getName(): string;

    /**
     * Executa a transcodificação/segmentação do arquivo de vídeo para HLS.
     *
     * @param string $inputFilePath Caminho absoluto do arquivo original (.mp4, .mov, etc.)
     * @param string $outputDir Diretório onde a playlist (.m3u8), fatias (.ts) e thumbnail serão salvas
     * @param array $options Opções adicionais (ex: segment_time, max_width)
     * @return TranscodeResult
     */
    public function transcode(string $inputFilePath, string $outputDir, array $options = []): TranscodeResult;
}
