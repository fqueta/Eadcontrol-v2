<?php

namespace App\Notifications;

use App\Notifications\Channels\BrevoChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\View;
use Illuminate\Notifications\Messages\MailMessage;
use App\Traits\HasDynamicBranding;

/**
 * WelcomeEmailNotification
 * pt-BR: Notificação para envio de e-mail de boas-vindas via Brevo e SMTP.
 * en-US: Notification to send welcome email through Brevo and SMTP.
 */
class WelcomeEmailNotification extends Notification
{
    use Queueable, HasDynamicBranding;

    /** @var string */
    protected string $recipientName;
    /** @var string */
    protected string $courseTitle;
    /** @var int|string|null */
    protected $courseId;
    /** @var string|null */
    protected ?string $courseSlug;

    /**
     * __construct
     * pt-BR: Inicializa a notificação com dados do destinatário e curso.
     * en-US: Initializes the notification with recipient and course data.
     */
    public function __construct(string $recipientName, string $courseTitle, $courseId = null, string $courseSlug = null)
    {
        $this->recipientName = $recipientName;
        $this->courseTitle = $courseTitle;
        $this->courseId = $courseId;
        $this->courseSlug = $courseSlug;
        
        $this->loadDynamicBranding();
    }

    /**
     * via
     * pt-BR: Define o canal de envio (BrevoChannel).
     * en-US: Defines the delivery channel (BrevoChannel).
     */
    public function via($notifiable): array
    {
        return [BrevoChannel::class];
    }

    /**
     * toMail
     * pt-BR: Suporte para envio padrão via SMTP se o Brevo não estiver configurado.
     */
    public function toMail($notifiable): MailMessage
    {
        $subject = sprintf('Bem-vindo(a) ao curso %s - %s', $this->courseTitle, $this->institutionName);
        $data = $this->getNotificationData();

        return (new MailMessage)
            ->subject($subject)
            ->view('emails.welcome', $data);
    }

    /**
     * toBrevo
     * pt-BR: Constrói o payload esperado pela API do Brevo.
     * en-US: Builds the payload expected by Brevo API.
     *
     * @return array
     */
    public function toBrevo($notifiable): array
    {
        $subject = sprintf('Bem-vindo(a) ao curso %s - %s', $this->courseTitle, $this->institutionName);
        $data = $this->getNotificationData();

        $htmlContent = View::make('emails.welcome', $data)->render();

        return [
            'subject' => $subject,
            'htmlContent' => $htmlContent,
            // pt-BR: 'sender' será preenchido pelo BrevoChannel a partir de config/services.php.
            // en-US: 'sender' will be filled by BrevoChannel from config/services.php.
        ];
    }
    
    /**
     * Array de dados centralizado para as Views
     */
    protected function getNotificationData(): array
    {
        return [
            'recipientName' => $this->recipientName,
            'courseTitle' => $this->courseTitle,
            'courseName' => $this->courseTitle,
            'courseId' => $this->courseId,
            'courseSlug' => $this->courseSlug,
            'courseUrl' => $this->courseSlug ? $this->getFrontendUrl() . '/aluno/cursos/' . $this->courseSlug : null,
            'loginUrl' => $this->getFrontendUrl() . '/login',
            
            // Variáveis injetadas pelo Trait HasDynamicBranding
            'logoDataUri' => $this->logoDataUri,
            'logoSrc' => $this->logoUrl,
            'primaryColor' => $this->primaryColor,
            'primaryTextColor' => $this->primaryTextColor,
            'institutionName' => $this->institutionName,
            'companyName' => $this->institutionName,
            'institutionSlogan' => $this->institutionSlogan,
        ];
    }
}
