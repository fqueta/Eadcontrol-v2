<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use App\Notifications\Channels\BrevoChannel;
use App\Traits\HasDynamicBranding;
use Illuminate\Support\Facades\View;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Bus\Queueable;

/**
 * Notificação de boas-vindas para novos clientes.
 * EN: Welcome notification sent to newly registered clients.
 */
class WelcomeNotification extends Notification implements ShouldQueue
{
    use Queueable, HasDynamicBranding;

    /** @var int */
    protected $courseId;

    /** @var string */
    protected $courseSlug;

    /** @var string */
    protected $courseName;

    /** @var int|null */
    public $enrollmentId;

    /**
     * Construtor.
     * @param int $courseId ID do curso para a matrícula.
     */
    public function __construct(int $courseId, string $courseSlug='',string $courseName='', ?int $enrollmentId = null)
    {
        $this->courseId = $courseId;
        $this->courseSlug = $courseSlug;
        $this->courseName = $courseName;
        $this->enrollmentId = $enrollmentId;
        
        $this->loadDynamicBranding();
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
        $subject = sprintf('Boas-vindas ao %s', $this->institutionName);
        $data = $this->getNotificationData($notifiable);

        return (new MailMessage)
            ->subject($subject)
            ->view('emails.welcome', $data);
    }

    /**
     * Conteúdo para envio via Brevo.
     * @return array{subject:string, htmlContent:string}
     */
    public function toBrevo($notifiable)
    {
        $subject = sprintf('Boas-vindas ao %s', $this->institutionName);
        $data = $this->getNotificationData($notifiable);

        $html = View::make('emails.welcome', $data)->render();

        return [
            'subject' => $subject,
            'htmlContent' => $html,
        ];
    }
    
    /**
     * Get the data for the notification template.
     */
    protected function getNotificationData($notifiable): array
    {
        $recipientName = trim($notifiable->nome . ' ' . $notifiable->sobrenome);
        if (empty($recipientName)) {
            $recipientName = $notifiable->name ?? 'Aluno';
        }

        return [
            'recipientName' => $recipientName,
            'courseTitle' => $this->courseName,
            'courseName' => $this->courseName,
            'courseId' => $this->courseId,
            'courseSlug' => $this->courseSlug,
            'loginUrl' => $this->getFrontendUrl() . '/login',
            
            // Variáveis injetadas pelo Trait HasDynamicBranding
            'logoDataUri' => $this->logoDataUri,
            'logoSrc' => $this->logoUrl,
            'primaryColor' => $this->primaryColor,
            'primaryTextColor' => $this->primaryTextColor,
            'institutionName' => $this->institutionName,
            'institutionSlogan' => $this->institutionSlogan,
            'companyName' => $this->institutionName,
        ];
    }
}
