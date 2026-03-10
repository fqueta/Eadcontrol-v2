<?php

namespace App\Notifications;

use App\Notifications\Channels\BrevoChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\View;
use Illuminate\Notifications\Messages\MailMessage;
use App\Traits\HasDynamicBranding;

/**
 * PendingPaymentNotification
 * pt-BR: Notificação para informar que a compra foi recebida e aguarda pagamento (PIX/Boleto).
 * en-US: Notification to inform that the purchase was received and awaits payment (PIX/Boleto).
 */
class PendingPaymentNotification extends Notification
{
    use Queueable, HasDynamicBranding;

    protected string $recipientName;
    protected string $courseTitle;
    protected ?string $paymentType;
    protected ?string $pixCode;
    protected ?string $boletoUrl;

    /**
     * @param string $recipientName
     * @param string $courseTitle
     * @param string|null $paymentType (PIX or BOLETO)
     * @param string|null $pixCode
     * @param string|null $boletoUrl
     */
    public function __construct(string $recipientName, string $courseTitle, ?string $paymentType = null, ?string $pixCode = null, ?string $boletoUrl = null)
    {
        $this->recipientName = $recipientName;
        $this->courseTitle = $courseTitle;
        $this->paymentType = $paymentType;
        $this->pixCode = $pixCode;
        $this->boletoUrl = $boletoUrl;
        
        $this->loadDynamicBranding();
    }

    public function via($notifiable): array
    {
        return [BrevoChannel::class];
    }

    public function toMail($notifiable): MailMessage
    {
        $subject = sprintf('Pedido recebido: %s - %s', $this->courseTitle, $this->institutionName);
        $data = $this->getNotificationData();

        return (new MailMessage)
            ->subject($subject)
            ->view('emails.pending_payment', $data);
    }

    public function toBrevo($notifiable): array
    {
        $subject = sprintf('Pedido recebido: %s - %s', $this->courseTitle, $this->institutionName);
        $data = $this->getNotificationData();

        $htmlContent = View::make('emails.pending_payment', $data)->render();

        return [
            'subject' => $subject,
            'htmlContent' => $htmlContent,
        ];
    }
    
    protected function getNotificationData(): array
    {
        return [
            'recipientName' => $this->recipientName,
            'courseTitle' => $this->courseTitle,
            'paymentType' => $this->paymentType,
            'pixCode' => $this->pixCode,
            'boletoUrl' => $this->boletoUrl,
            
            'logoDataUri' => $this->logoDataUri,
            'logoSrc' => $this->logoUrl,
            'primaryColor' => $this->primaryColor,
            'primaryTextColor' => $this->primaryTextColor,
            'institutionName' => $this->institutionName,
            'institutionSlogan' => $this->institutionSlogan,
        ];
    }
}
