<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordBase;
use Illuminate\Notifications\Messages\MailMessage;
use App\Notifications\Channels\BrevoChannel;
use App\Services\Qlib;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\File;

class ResetPasswordNotification extends ResetPasswordBase
{
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
        $this->frontendUrl = Qlib::get_frontend_url();
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
        $logoDataUri = $this->getLogoDataUri();
        $logoSrc = Qlib::get_logo_url();

        return (new MailMessage)
            ->subject('Redefinição de Senha')
            ->view('emails.password_reset', [
                'resetLink' => $resetLink,
                'logoDataUri' => $logoDataUri,
                'logoSrc' => $logoSrc,
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
        $html = View::make('emails.password_reset', [
            'resetLink' => $resetLink,
            'logoDataUri' => $this->getLogoDataUri(),
            'logoSrc' => $this->getLogoSrc(),
        ])->render();

        return [
            'subject' => 'Redefinição de Senha',
            'htmlContent' => $html,
        ];
    }

    /**
     * Obtém o logo como data URI (base64) para uso em e-mails.
     * Prioriza ENV "MAIL_LOGO_BASE64", depois arquivo public/logo.svg.
     *
     * @return string|null Data URI (ex.: data:image/svg+xml;base64,PHN2Zy4uLg==) ou null se indisponível
     */
    protected function getLogoDataUri(): ?string
    {
        // Se informado diretamente por ENV/Config, usar
        $env = (string) env('MAIL_LOGO_BASE64', '');
        if ($env !== '') {
            // Tenta inferir MIME a partir de um prefixo opcional, senão assume SVG
            $mime = env('MAIL_LOGO_MIME', 'image/svg+xml');
            return 'data:' . $mime . ';base64,' . $env;
        }

        // Caso contrário, tenta carregar public/logo.svg
        $path = public_path('logo.svg');
        if (File::exists($path)) {
            $content = File::get($path);
            $base64 = base64_encode($content);
            return 'data:image/svg+xml;base64,' . $base64;
        }

        return null;
    }

    /**
     * Obtém uma URL pública para o logo quando disponível.
     * Prioriza ENV/Config "PUBLIC_LOGO_URL" para garantir visibilidade em clientes como Gmail.
     * Se não houver URL pública, retorna null para que o template use o fallback (data URI ou asset local).
     *
     * @return string|null
     */
    protected function getLogoSrc(): ?string
    {
        $publicUrl = (string) env('PUBLIC_LOGO_URL', '');
        if ($publicUrl !== '') {
            return $publicUrl;
        }
        return null;
    }
}
