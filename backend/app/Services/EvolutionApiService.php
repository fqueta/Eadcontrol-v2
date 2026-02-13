<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EvolutionApiService
{
    /**
     * Envia uma mensagem de texto para um número WhatsApp via EvolutionAPI.
     *
     * @param string $phone O número de telefone (com DDD/DDI, apenas dígitos).
     * @param string $message O conteúdo da mensagem.
     * @return bool Retorna true se a requisição foi enviada com sucesso (HTTP 2xx).
     */
    public static function sendMessage(string $phone, string $message): bool
    {
        $baseUrl = config('services.evolution.base_url');
        $apiKey = config('services.evolution.api_key');
        $instance = config('services.evolution.instance');
        // Validação básica de configuração
        if (empty($baseUrl) || empty($apiKey)) {
            Log::warning('EvolutionAPI credentials not configured.');
            return false;
        }

        // Remove caracteres não numéricos do telefone
        $phone = preg_replace('/\D/', '', $phone);
        
        // Se o número não tiver DDI (ex: 55), poderíamos adicionar aqui se necessário.
        // Assumindo que o sistema já armazena com 55 ou o usuário inputa corretamente.
        
        $endpoint = "{$baseUrl}/message/sendText/{$instance}";

        try {
            $response = Http::withHeaders([
                'apikey' => $apiKey,
                'Content-Type' => 'application/json',
            ])->post($endpoint, [
                'number' => $phone,
                'options' => [
                    'delay' => 1200,
                    'presence' => 'composing',
                    'linkPreview' => false
                ],
                'textMessage' => [
                    'text' => $message
                ],
                'text' => $message
            ]);

            if ($response->successful()) {
                return true;
            }
            // dd($response->body());
            Log::error('EvolutionAPI Error: ' . $response->body());
            return false;

        } catch (\Throwable $e) {
            dd($e->getMessage());
            Log::error('EvolutionAPI Exception: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Envia notificação para o administrador (WhatsApp configurado em app_whatsapp).
     *
     * @param string $message Mensagem já formatada ou texto simples.
     * @param int|null $courseId Opcional: ID do curso para contexto.
     * @return bool
     */
    public static function sendAdminNotification(string $message, ?int $courseId = null): bool
    {
        try {
            $adminPhone = \App\Services\Qlib::qoption('app_whatsapp');
            if (!$adminPhone) {
                return false;
            }
            // Se desejar adicionar info do curso automaticamente, pode-se usar o courseId aqui
            // Mas como a mensagem já vem formatada do caller, apenas enviamos.
            return self::sendMessage($adminPhone, $message);

        } catch (\Throwable $e) {
            Log::error('EvolutionAPI Admin Notification Error: ' . $e->getMessage());
            return false;
        }
    }
}
