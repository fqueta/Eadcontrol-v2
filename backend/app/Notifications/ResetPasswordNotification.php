<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordBase;
use Illuminate\Notifications\Messages\MailMessage;
use App\Notifications\Channels\BrevoChannel;
use App\Services\Qlib;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\File;
use App\Traits\HasDynamicBranding;

class ResetPasswordNotification extends ResetPasswordBase
{
    use HasDynamicBranding;
    /**
     * Define os canais de entrega da notificação.
     * Se a API key do Brevo estiver configurada, usa o canal Brevo; caso contrário, usa e-mail padrão.
     *
     * @param mixed $notifiable
     * @return array
     */
    public $frontendUrl = '';

    public function __construct($token)
    {
        $this->token = $token;
        $this->frontendUrl = $this->getFrontendUrl();
        $this->loadDynamicBranding();
    }
    public function via($notifiable)
    {
        $hasBrevo = (string) (config('services.brevo.api_key') ?? '') !== '';
        return $hasBrevo ? [BrevoChannel::class] : ['mail'];
    }

    /**
     * Conteúdo padrão para envio via e-mail tradicional (fallback).
     *
     * @param mixed $notifiable
     * @return MailMessage
     */
    /**
     * Gera o e-mail padrão usando template Blade com layout do projeto.
     *
     * @param  mixed  $notifiable
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    public function toMail($notifiable)
    {
        // Base do frontend: usa config('app.frontend_url') parametrizada via .env
        $resetLink = $this->frontendUrl . '/reset-password/' . $this->token . '?email=' . urlencode($notifiable->email);

        // Renderiza nosso template com o tema/layout do projeto
        $logoDataUri = $this->getLogoDataUri(); // Fallback to getLogoDataUri if DB logo is missing
        $logoSrc = !empty($this->logoUrl) ? $this->logoUrl : $this->getLogoSrc(); // DB logo takes precedence

        return (new MailMessage)
            ->subject('Redefinição de Senha - ' . $this->institutionName)
            ->view('emails.password_reset', [
                'resetLink' => $resetLink,
                'logoDataUri' => $logoDataUri,
                'logoSrc' => $logoSrc,
                'primaryColor' => $this->primaryColor,
                'primaryTextColor' => $this->primaryTextColor,
                'institutionName' => $this->institutionName,
            ]);
    }

    /**
     * Conteúdo estruturado para envio via API do Brevo.
     * Retorna o payload conforme o endpoint `/smtp/email`.
     *
     * @param mixed $notifiable
     * @return array
     */
    /**
     * Gera conteúdo HTML para envio via canal Brevo, reutilizando o template Blade.
     *
     * @param  mixed  $notifiable
     * @return array{subject:string, htmlContent:string}
     */
    public function toBrevo($notifiable)
    {
        // Base do frontend: usa config('app.frontend_url') parametrizada via .env
        $resetLink = $this->frontendUrl . '/reset-password/' . $this->token . '?email=' . urlencode($notifiable->email);

        // Reaproveita o mesmo template Blade para o conteúdo HTML do Brevo
        $logoSrc = !empty($this->logoUrl) ? $this->logoUrl : $this->getLogoSrc();

        $html = View::make('emails.password_reset', [
            'resetLink' => $resetLink,
            'logoDataUri' => $this->getLogoDataUri(),
            'logoSrc' => $logoSrc,
            'primaryColor' => $this->primaryColor,
            'primaryTextColor' => $this->primaryTextColor,
            'institutionName' => $this->institutionName,
        ])->render();

        return [
            'subject' => 'Redefinição de Senha - ' . $this->institutionName,
            'htmlContent' => $html,
        ];
    }
}
