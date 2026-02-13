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
            // dd($e->getMessage());
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

    public static function sendLeadNotification($client, $courseId)
    {
        try {
            if ($client->celular) {
                $firstName = explode(' ', trim($client->name))[0];
                
                $courseTitle = 'o curso';
                if ($courseId > 0) {
                        $cObj = \Illuminate\Support\Facades\DB::table('cursos')->where('id', $courseId)->first();
                        if ($cObj) {
                        $courseTitle = $cObj->titulo ?? $cObj->nome ?? 'o curso';
                        }
                }
                
                $companyName = \App\Services\Qlib::qoption('company_name') ?: config('app.name');

                $userMsg = "Olá, *{$firstName}*! 👋\n\n";
                $userMsg .= "Recebemos seu interesse em *{$courseTitle}*.\n";
                $userMsg .= "Em breve nossa equipe entrará em contato para passar mais detalhes.\n\n";
                $userMsg .= "Atenciosamente,\n*{$companyName}*";

                return self::sendMessage($client->celular, $userMsg);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('EvolutionAPI User Notification Error: ' . $e->getMessage());
            return false;
        }
        return false;
    }

    public static function sendAdminNotificationNewInterest($client, $courseId, $matriculaId)
    {
        try {
            $courseName = 'N/A';
            if ($courseId > 0) {
                $cObj = \Illuminate\Support\Facades\DB::table('cursos')->where('id', $courseId)->first();
                if ($cObj) $courseName = $cObj->titulo ?? $cObj->nome ?? 'Curso #' . $courseId;
            }
            $companyName = \App\Services\Qlib::qoption('institution_name');
            $msgObj = "📢 *Novo Interessado {$companyName}*\n\n";
            $msgObj .= "👤 *Nome:* {$client->name}\n";
            $msgObj .= "📧 *Email:* {$client->email}\n";
            $msgObj .= "📱 *Telefone:* " . ($client->getAttribute('celular') ?: 'N/D') . "\n";
            $msgObj .= "🎓 *Curso:* {$courseName}\n";
            $msgObj .= "📅 *Data:* " . date('d/m/Y H:i');
            // Fixed typo: get_front_url -> get_frontend_url
            $msgObj .= "\n🎓 *Link:* " . \App\Services\Qlib::get_frontend_url().'/admin/sales/proposals/view/'.$matriculaId;

            // Add delay to prevent ban risk when called immediately after lead notification
            sleep(2);
            return self::sendAdminNotification($msgObj, $courseId);

        } catch (\Throwable $evt) {
            \Illuminate\Support\Facades\Log::error('EvolutionAPI Notification Error: ' . $evt->getMessage());
            return false;
        }
    }
}
