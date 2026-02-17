<?php

namespace App\Notifications;

use App\Models\Comment;
use App\Models\Curso;
use App\Models\Activity;
use App\Notifications\Channels\BrevoChannel;
use App\Services\Qlib;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\View;

class NewCommentNotification extends Notification
{
    use Queueable;

    protected $comment;
    protected $frontendUrl;

    /**
     * Create a new notification instance.
     */
    public function __construct(Comment $comment)
    {
        $this->comment = $comment;
        $this->frontendUrl = Qlib::get_frontend_url();
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via($notifiable): array
    {
        $hasBrevo = (string) (config('services.brevo.api_key') ?? '') !== '';
        return $hasBrevo ? [BrevoChannel::class] : ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        $data = $this->getNotificationData();

        return (new MailMessage)
            ->subject('Novo Comentário Postado - ' . config('app.name'))
            ->view('emails.new_comment', $data);
    }

    /**
     * Get the Brevo representation of the notification.
     */
    public function toBrevo($notifiable): array
    {
        $data = $this->getNotificationData();

        $html = View::make('emails.new_comment', $data)->render();

        return [
            'subject' => 'Novo Comentário Postado - ' . config('app.name'),
            'htmlContent' => $html,
        ];
    }

    /**
     * Get the data for the notification template.
     */
    protected function getNotificationData(): array
    {
        $target = $this->comment->commentable;
        $targetName = 'N/A';
        $targetType = 'N/A';

        if ($target instanceof Curso) {
            $targetName = $target->nome;
            $targetType = 'Curso';
        } elseif ($target instanceof Activity) {
            $targetName = $target->title;
            $targetType = 'Atividade';
        }

        return [
            'userName' => optional($this->comment->user)->name ?? 'Usuário Anônimo',
            'targetName' => $targetName,
            'targetType' => $targetType,
            'commentBody' => $this->comment->body,
            'rating' => $this->comment->rating,
            'adminLink' => $this->frontendUrl . '/admin/comments', // Ajustar se necessário
            'logoDataUri' => $this->getLogoDataUri(),
            'logoSrc' => $this->getLogoSrc(),
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
     * Obtém uma URL pública para o logo quando disponível.
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
