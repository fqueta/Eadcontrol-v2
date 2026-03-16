<?php

namespace App\Notifications;

use App\Models\Matricula;
use App\Notifications\Channels\BrevoChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\View;
use Illuminate\Notifications\Messages\MailMessage;
use App\Traits\HasDynamicBranding;

class NewSaleAdminNotification extends Notification
{
    use Queueable, HasDynamicBranding;

    protected Matricula $matricula;
    protected string $frontendUrl;

    public function __construct(Matricula $matricula)
    {
        $this->matricula = $matricula;
        $this->frontendUrl = $this->getFrontendUrl();
        $this->loadDynamicBranding();
    }

    public function via($notifiable): array
    {
        $hasBrevo = (string) (config('services.brevo.api_key') ?? '') !== '';
        return $hasBrevo ? [BrevoChannel::class] : ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $subject = 'Nova Venda Confirmada! - ' . ($this->institutionName ?? config('app.name'));
        $data = $this->getNotificationData();

        return (new MailMessage)
            ->subject($subject)
            ->view('emails.new_sale_admin', $data);
    }

    public function toBrevo($notifiable): array
    {
        $subject = 'Nova Venda Confirmada! - ' . ($this->institutionName ?? config('app.name'));
        $data = $this->getNotificationData();

        $htmlContent = View::make('emails.new_sale_admin', $data)->render();

        return [
            'subject' => $subject,
            'htmlContent' => $htmlContent,
        ];
    }
    
    protected function getNotificationData(): array
    {
        $client = $this->matricula->student;
        $course = $this->matricula->course;

        return [
            'adminName' => 'Equipe', // Pode ser trocado pelo nome do notifiable se necessário
            'clientName' => $client ? $client->name : 'Aluno Removido',
            'clientEmail' => $client ? $client->email : 'N/A',
            'courseTitle' => $course ? $course->titulo : 'Curso Removido',
            'amount' => number_format($this->matricula->total, 2, ',', '.'),
            'adminPanelUrl' => $this->frontendUrl . '/admin/sales/proposals/view/' . $this->matricula->id,
            
            'logoDataUri' => $this->logoDataUri,
            'logoSrc' => $this->logoUrl,
            'primaryColor' => $this->primaryColor,
            'primaryTextColor' => $this->primaryTextColor,
            'institutionName' => $this->institutionName,
            'institutionSlogan' => $this->institutionSlogan,
        ];
    }
}
