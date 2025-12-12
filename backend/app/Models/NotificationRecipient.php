<?php

namespace App\Models;

use Illuminate\Notifications\Notifiable;

/**
 * NotificationRecipient
 * pt-BR: Entidade simples para endereçar notificações por e-mail.
 * en-US: Simple entity to address notifications via email.
 */
class NotificationRecipient
{
    use Notifiable;

    /** @var string|null */
    public ?string $name = null;
    /** @var string */
    public string $email;

    /**
     * __construct
     * pt-BR: Inicializa com nome e e-mail do destinatário.
     * en-US: Initializes with recipient name and email.
     */
    public function __construct(string $email, ?string $name = null)
    {
        $this->email = $email;
        $this->name = $name;
    }

    /**
     * routeNotificationForMail
     * pt-BR: Retorna o e-mail para roteamento do canal de e-mail.
     * en-US: Returns email for mail channel routing.
     */
    public function routeNotificationForMail(): string
    {
        return $this->email;
    }
}