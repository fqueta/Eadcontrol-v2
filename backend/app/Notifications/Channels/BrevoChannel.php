<?php

namespace App\Notifications\Channels;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Canal de notificação para envio de e-mails via API Brevo (Sendinblue).
 *
 * Este canal utiliza as credenciais definidas em config('services.brevo') e
 * envia e-mails pelo endpoint HTTP `/smtp/email`.
 */
class BrevoChannel
{
    /**
     * Envia a notificação utilizando a API do Brevo.
     *
     * @param mixed $notifiable Entidade que será notificada
     * @param Notification $notification Notificação com conteúdo
     * @return array|null Resposta simplificada da API ou null em caso de falha
     */
    public function send($notifiable, Notification $notification)
    {
        $config = config('services.brevo');
        $apiKey = (string) ($config['api_key'] ?? '');
        $apiUrl = rtrim((string) ($config['api_url'] ?? 'https://api.brevo.com/v3'), '/');

        if ($apiKey === '') {
            // Logar ausência de configuração para facilitar diagnóstico
            Log::warning('BrevoChannel: API key ausente, envio ignorado.');
            return null;
        }

        // O método toBrevo deve retornar o payload sem credenciais
        if (!method_exists($notification, 'toBrevo')) {
            return null;
        }

        $payload = (array) $notification->toBrevo($notifiable);

        // Garantir remetente padrão a partir das configs
        $fromEmail = (string) ($config['from_email'] ?? '');
        $fromName = (string) ($config['from_name'] ?? '');
        $payload['sender'] = $payload['sender'] ?? [
            'email' => $fromEmail,
            'name' => $fromName,
        ];

        // Garantir destinatário principal
        $email = method_exists($notifiable, 'routeNotificationForMail')
            ? $notifiable->routeNotificationForMail()
            : ($notifiable->email ?? null);

        if (!isset($payload['to'])) {
            $payload['to'] = [];
        }
        if ($email) {
            $payload['to'][] = ['email' => (string) $email, 'name' => (string) ($notifiable->name ?? '')];
        }

        // Pré-visualização para auditoria (sem conteúdo sensível como API key)
        Log::info('BrevoChannel: preparando envio', [
            'to' => collect($payload['to'])->map(fn($t) => $t['email'])->all(),
            'subject' => $payload['subject'] ?? null,
            'html_preview' => isset($payload['htmlContent']) ? Str::limit(strip_tags((string) $payload['htmlContent']), 180) : null,
        ]);

        // Chamada HTTP para Brevo
        $response = Http::withHeaders([
                'api-key' => $apiKey,
                'accept' => 'application/json',
                'content-type' => 'application/json',
            ])
            ->post($apiUrl . '/smtp/email', $payload);

        // Retornar resposta simplificada
        if ($response->successful()) {
            $result = [
                'status' => $response->status(),
                'messageId' => data_get($response->json(), 'messageId'),
            ];
            Log::info('BrevoChannel: envio concluído com sucesso', [
                'status' => $result['status'],
                'messageId' => $result['messageId'] ?? null,
                'to' => collect($payload['to'])->map(fn($t) => $t['email'])->all(),
                'subject' => $payload['subject'] ?? null,
            ]);
            return $result;
        }

        $error = [
            'status' => $response->status(),
            'error' => $response->json(),
        ];
        Log::error('BrevoChannel: falha no envio', [
            'status' => $error['status'],
            'error' => $error['error'],
            'to' => collect($payload['to'])->map(fn($t) => $t['email'])->all(),
            'subject' => $payload['subject'] ?? null,
        ]);
        return $error;
    }
}