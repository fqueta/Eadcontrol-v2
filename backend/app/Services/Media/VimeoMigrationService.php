<?php

namespace App\Services\Media;

use App\Http\Controllers\api\ApiCredentialController;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * VimeoMigrationService
 * pt-BR: Leitura de vídeos legados hospedados no Vimeo para migração ao R2.
 *        Usa o Personal Access Token da credencial "vimeo" (escopos public,
 *        private e video_files). O download direto dos arquivos exige que a
 *        conta Vimeo tenha capacidade de download (planos pagos).
 */
class VimeoMigrationService
{
    protected const API_BASE = 'https://api.vimeo.com';
    protected const API_VERSION = 'application/vnd.vimeo.*+json;version=3.4';

    /**
     * Retorna o token da credencial "vimeo" ativa (descriptografado) ou null.
     */
    public function getAccessToken(): ?string
    {
        try {
            $credential = ApiCredentialController::get('vimeo');
            if (!$credential) {
                return null;
            }
            if (isset($credential->active) && !$credential->active) {
                return null;
            }
            $config = $credential->config ?? [];
            $token = trim((string) ($config['access_token'] ?? ''));
            return $token !== '' ? $token : null;
        } catch (\Throwable $e) {
            Log::warning('VimeoMigrationService: falha ao ler credencial vimeo: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Valida o token contra GET /me. Retorna ['ok'=>bool,'user'=>?string,'membership'=>?string,'error'=>?string].
     */
    public function testToken(string $token): array
    {
        try {
            $response = Http::withToken(trim($token))
                ->accept(self::API_VERSION)
                ->timeout(15)
                ->get(self::API_BASE . '/me');

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'ok' => true,
                    'user' => $data['name'] ?? null,
                    'membership' => $data['membership']['type'] ?? null,
                ];
            }

            return [
                'ok' => false,
                'error' => $response->json('error') ?: ('HTTP ' . $response->status()),
            ];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Extrai o ID numérico do vídeo a partir de URLs do Vimeo
     * (vimeo.com/ID, player.vimeo.com/video/ID).
     */
    public function extractVimeoId(string $url): ?string
    {
        if (preg_match('/vimeo\.com\/(?:video\/)?(\d+)/', $url, $m)) {
            return $m[1];
        }
        return null;
    }

    /**
     * Busca os arquivos progressivos de download de um vídeo.
     * Retorna ['url','width','height','size','name','duration'] do melhor MP4
     * ou ['error' => mensagem] quando a conta não permite download.
     */
    public function getDownloadableFile(string $vimeoId, string $token): array
    {
        try {
            $response = Http::withToken(trim($token))
                ->accept(self::API_VERSION)
                ->timeout(30)
                ->get(self::API_BASE . "/videos/{$vimeoId}", [
                    'fields' => 'name,duration,files,status,user,privacy,download,play',
                ]);

            if ($response->status() === 401 || $response->status() === 403) {
                return ['error' => 'Token do Vimeo inválido ou sem permissão (401/403). Gere um novo Personal Access Token com os escopos public, private e video_files.'];
            }

            if ($response->failed()) {
                return ['error' => "Vimeo API retornou HTTP {$response->status()} para o vídeo {$vimeoId}."];
            }

            $data = $response->json();
            $files = $data['files'] ?? [];

            $candidates = array_values(array_filter($files, function ($f) {
                return ($f['type'] ?? '') === 'video/mp4' && !empty($f['link']);
            }));

            // Alternativa 1: campo "download" (links do arquivo original, liberado
            // pelo toggle "Permitir downloads" do vídeo)
            if (empty($candidates)) {
                $downloads = $data['download'] ?? [];
                foreach ((array) $downloads as $d) {
                    $link = is_array($d) ? ($d['link'] ?? null) : $d;
                    if (!empty($link)) {
                        $candidates[] = [
                            'link' => $link,
                            'width' => $d['width'] ?? 0,
                            'height' => $d['height'] ?? 0,
                            'size' => $d['size'] ?? 0,
                            'type' => 'video/mp4',
                        ];
                    }
                }
            }

            // Alternativa 2: URLs progressivas de reprodução (play.progressive)
            if (empty($candidates)) {
                $progressive = $data['play']['progressive'] ?? [];
                foreach ((array) $progressive as $p) {
                    if (!empty($p['url'])) {
                        $candidates[] = [
                            'link' => $p['url'],
                            'width' => $p['width'] ?? 0,
                            'height' => $p['height'] ?? 0,
                            'size' => 0,
                            'type' => $p['mime'] ?? 'video/mp4',
                        ];
                    }
                }
                usort($candidates, function ($a, $b) {
                    return ((int) ($b['width'] ?? 0)) <=> ((int) ($a['width'] ?? 0));
                });
            }

            if (empty($candidates)) {
                $owner = $data['user']['name'] ?? ($data['user']['uri'] ?? 'desconhecido');
                $status = $data['status'] ?? 'desconhecido';
                $privacy = $data['privacy']['view'] ?? 'desconhecida';
                \Illuminate\Support\Facades\Log::info("VimeoMigrationService: vídeo {$vimeoId} sem files. owner={$owner} status={$status} privacy={$privacy} keys=" . implode(',', array_keys($data)));
                return ['error' => "Este vídeo não possui arquivos para download na API do Vimeo (dono: {$owner}, status: {$status}, privacidade: {$privacy}). Se o dono for diferente da conta do token, use um token da conta dona do vídeo. A conta precisa ter a capacidade de download liberada (planos pagos) e o token precisa do escopo video_files."];
            }

            usort($candidates, function ($a, $b) {
                return ((int) ($b['width'] ?? 0)) <=> ((int) ($a['width'] ?? 0));
            });
            $best = $candidates[0];

            return [
                'url' => $best['link'],
                'width' => (int) ($best['width'] ?? 0),
                'height' => (int) ($best['height'] ?? 0),
                'size' => (int) ($best['size'] ?? 0),
                'name' => (string) ($data['name'] ?? ''),
                'duration' => (int) ($data['duration'] ?? 0),
            ];
        } catch (\Throwable $e) {
            return ['error' => 'Falha ao consultar o vídeo no Vimeo: ' . $e->getMessage()];
        }
    }
}
