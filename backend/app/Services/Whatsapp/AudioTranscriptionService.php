<?php

namespace App\Services\Whatsapp;

use App\Services\Integrations\CredentialStore;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Transcrição de áudios recebidos no WhatsApp (OpenAI Whisper).
 * Quando não há chave configurada, o inbox continua funcionando:
 * a IA apenas recebe um marcador "[Áudio recebido]".
 */
class AudioTranscriptionService
{
    public function isConfigured(): bool
    {
        $config = $this->config();

        return !empty($config['api_key']);
    }

    /**
     * Transcreve um arquivo do disco `public` (path relativo).
     */
    public function transcribePath(string $path): ?string
    {
        $config = $this->config();

        if (empty($config['api_key'])) {
            return null;
        }

        try {
            if (!Storage::disk('public')->exists($path)) {
                return null;
            }

            $contents = Storage::disk('public')->get($path);
            $filename = basename($path) ?: 'audio.ogg';

            $response = Http::timeout(90)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $config['api_key'],
                ])
                ->attach('file', $contents, $filename)
                ->post(rtrim($config['base_url'], '/') . '/audio/transcriptions', [
                    'model'    => $config['transcription_model'] ?? 'whisper-1',
                    'language' => 'pt',
                    'response_format' => 'json',
                ]);

            if ($response->failed()) {
                Log::warning('AudioTranscriptionService: falha na transcrição', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return null;
            }

            $text = trim((string) ($response->json('text') ?? ''));

            return $text !== '' ? $text : null;
        } catch (\Throwable $e) {
            Log::warning('AudioTranscriptionService: exceção na transcrição', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    private function config(): array
    {
        $defaults = config('ai.providers.openai', []);

        return CredentialStore::for('openai', $defaults);
    }
}
