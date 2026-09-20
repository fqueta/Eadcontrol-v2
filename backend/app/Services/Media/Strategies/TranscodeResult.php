<?php

namespace App\Services\Media\Strategies;

class TranscodeResult
{
    public function __construct(
        public bool $success,
        public string $outputDir,
        public ?string $masterPlaylist = null,
        public ?string $thumbnail = null,
        public array $segmentFiles = [],
        public int $durationSeconds = 0,
        public ?string $error = null
    ) {}

    public static function success(
        string $outputDir,
        string $masterPlaylist,
        ?string $thumbnail,
        array $segmentFiles,
        int $durationSeconds = 0
    ): self {
        return new self(
            success: true,
            outputDir: $outputDir,
            masterPlaylist: $masterPlaylist,
            thumbnail: $thumbnail,
            segmentFiles: $segmentFiles,
            durationSeconds: $durationSeconds
        );
    }

    public static function failure(string $error): self
    {
        return new self(
            success: false,
            outputDir: '',
            error: $error
        );
    }
}
