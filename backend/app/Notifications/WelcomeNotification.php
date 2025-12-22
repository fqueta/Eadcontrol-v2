<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use App\Notifications\Channels\BrevoChannel;
use App\Services\Qlib;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\File;

/**
 * Notificação de boas-vindas para novos clientes.
 * EN: Welcome notification sent to newly registered clients.
 */
class WelcomeNotification extends Notification
{
    /** @var int */
    protected $courseId;

    /**
     * Construtor.
     * @param int $courseId ID do curso para a matrícula.
     */
    public function __construct(int $courseId)
    {
        $this->courseId = $courseId;
    }

    /**
     * Define os canais de entrega da notificação.
     */
    public function via($notifiable)
    {
        $hasBrevo = (string) (config('services.brevo.api_key') ?? '') !== '';
        return $hasBrevo ? [BrevoChannel::class] : ['mail'];
    }

    /**
     * Conteúdo para envio via e-mail tradicional (fallback).
     */
    public function toMail($notifiable)
    {
        $frontendUrl = Qlib::get_frontend_url();
        $loginUrl = $frontendUrl ? $frontendUrl . '/login' : null;

        return (new MailMessage)
            ->subject('Boas-vindas ao ' . config('app.name'))
            ->view('emails.welcome', [
                'loginUrl' => $loginUrl,
                'courseId' => $this->courseId,
                'logoDataUri' => $this->getLogoDataUri(),
                'logoSrc' => Qlib::get_logo_url(),
            ]);
    }

    /**
     * Conteúdo para envio via Brevo.
     * @return array{subject:string, htmlContent:string}
     */
    public function toBrevo($notifiable)
    {
        $frontendUrl = Qlib::get_frontend_url();
        $loginUrl = $frontendUrl ? $frontendUrl . '/login' : null;

        $html = View::make('emails.welcome', [
            'loginUrl' => $loginUrl,
            'courseId' => $this->courseId,
            'logoDataUri' => $this->getLogoDataUri(),
            'logoSrc' => Qlib::get_logo_url(),
        ])->render();

        return [
            'subject' => 'Boas-vindas ao ' . config('app.name'),
            'htmlContent' => $html,
        ];
    }

    /**
     * Obtém o logo como data URI (base64) para uso em e-mails.
     */
    protected function getLogoDataUri(): ?string
    {
        $env = (string) env('MAIL_LOGO_BASE64', '');
        if ($env !== '') {
            $mime = env('MAIL_LOGO_MIME', 'image/svg+xml');
            return 'data:' . $mime . ';base64,' . $env;
        }
        $path = public_path('logo.svg');
        if (File::exists($path)) {
            $content = File::get($path);
            $base64 = base64_encode($content);
            return 'data:image/svg+xml;base64,' . $base64;
        }
        return null;
    }

    /**
     * Obtém URL pública para o logo quando disponível.
     */
    protected function getLogoSrc(): ?string
    {
        $publicUrl = (string) env('PUBLIC_LOGO_URL', '');
        return $publicUrl !== '' ? $publicUrl : null;
    }
}
