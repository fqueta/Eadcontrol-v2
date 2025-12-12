<?php

namespace App\Notifications;

use App\Notifications\Channels\BrevoChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * WelcomeEmailNotification
 * pt-BR: Notificação para envio de e-mail de boas-vindas via Brevo.
 * en-US: Notification to send welcome email through Brevo.
 */
class WelcomeEmailNotification extends Notification
{
    use Queueable;

    /** @var string */
    protected string $recipientName;
    /** @var string */
    protected string $courseTitle;
    /** @var int|string|null */
    protected $courseId;

    /**
     * __construct
     * pt-BR: Inicializa a notificação com dados do destinatário e curso.
     * en-US: Initializes the notification with recipient and course data.
     */
    public function __construct(string $recipientName, string $courseTitle, $courseId = null)
    {
        $this->recipientName = $recipientName;
        $this->courseTitle = $courseTitle;
        $this->courseId = $courseId;
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
     * toBrevo
     * pt-BR: Constrói o payload esperado pela API do Brevo.
     * en-US: Builds the payload expected by Brevo API.
     *
     * @return array
     */
    public function toBrevo($notifiable): array
    {
        $subject = sprintf('Bem-vindo(a) ao curso %s', $this->courseTitle);

        $htmlContent = sprintf(
            '<p>Olá %s,</p>
             <p>Obrigado pelo seu interesse no curso <strong>%s</strong>.</p>
             <p>Nossa equipe entrará em contato em breve com mais detalhes e próximos passos.</p>
             %s
             <p>Atenciosamente,<br/>Equipe Incluir &amp; Educar</p>',
            e($this->recipientName),
            e($this->courseTitle),
            $this->courseId ? '<p><small>ID do curso: '.e((string)$this->courseId).'</small></p>' : ''
        );

        $textContent = sprintf(
            "Olá %s,\n\n" .
            "Obrigado pelo seu interesse no curso '%s'.\n" .
            "Nossa equipe entrará em contato em breve com mais detalhes e próximos passos.\n\n" .
            "%s" .
            "Atenciosamente,\nEquipe Incluir & Educar",
            $this->recipientName,
            $this->courseTitle,
            $this->courseId ? ('ID do curso: ' . $this->courseId . "\n\n") : ''
        );

        return [
            'subject' => $subject,
            'htmlContent' => $htmlContent,
            'textContent' => $textContent,
            // pt-BR: 'sender' será preenchido pelo BrevoChannel a partir de config/services.php.
            // en-US: 'sender' will be filled by BrevoChannel from config/services.php.
        ];
    }
}