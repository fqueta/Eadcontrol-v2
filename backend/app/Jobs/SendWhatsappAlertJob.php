<?php

namespace App\Jobs;

use App\Models\WhatsappInstance;
use App\Services\Whatsapp\WhatsappService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * SendWhatsappAlertJob
 * pt-BR: Envia alertas administrativos por WhatsApp fora do ciclo da requisição
 *        (ex.: novo comentário aguardando moderação). O job reativa o contexto
 *        do tenant antes de tocar em qualquer model.
 * en-US: Sends admin WhatsApp alerts outside the request cycle (e.g.: a new
 *        comment awaiting moderation). Re-initializes the tenant context before
 *        touching any model.
 */
class SendWhatsappAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 120;

    public ?string $tenantId;
    public int $instanceId;
    /** @var string[] */
    public array $recipients;
    public string $message;
    public string $event;

    /**
     * @param string[] $recipients
     */
    public function __construct(int $instanceId, array $recipients, string $message, string $event = 'general')
    {
        $this->tenantId = $this->currentTenantId();
        $this->instanceId = $instanceId;
        $this->recipients = array_values(array_unique(array_filter($recipients)));
        $this->message = $message;
        $this->event = $event;
    }

    private function currentTenantId(): ?string
    {
        try {
            return tenancy()->tenant?->id;
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function handle(WhatsappService $whatsapp): void
    {
        if ($this->tenantId) {
            try {
                if (!tenancy()->tenant || tenancy()->tenant->id !== $this->tenantId) {
                    tenancy()->initialize($this->tenantId);
                }
            } catch (\Throwable $e) {
                Log::warning('SendWhatsappAlertJob: tenant inválido', [
                    'tenant' => $this->tenantId,
                    'error'  => $e->getMessage(),
                ]);
                return;
            }
        }

        if (empty($this->recipients)) {
            Log::warning('SendWhatsappAlertJob: nenhum destinatário configurado', [
                'instance_id' => $this->instanceId,
                'event'       => $this->event,
            ]);
            return;
        }

        $instance = WhatsappInstance::query()->find($this->instanceId);

        if (!$instance) {
            Log::warning('SendWhatsappAlertJob: instância não encontrada', [
                'instance_id' => $this->instanceId,
                'event'       => $this->event,
            ]);
            return;
        }

        if (!$instance->isConnected()) {
            Log::warning('SendWhatsappAlertJob: instância desconectada, alerta descartado', [
                'instance' => $instance->instance_name,
                'status'   => $instance->status,
                'event'    => $this->event,
            ]);
            return;
        }

        $sent = 0;

        foreach ($this->recipients as $phone) {
            try {
                $whatsapp->sendMessage($instance, (string) $phone, $this->message);
                $sent++;
            } catch (\Throwable $e) {
                Log::error('SendWhatsappAlertJob: falha ao enviar alerta', [
                    'instance' => $instance->instance_name,
                    'phone'    => $phone,
                    'event'    => $this->event,
                    'error'    => $e->getMessage(),
                ]);
            }
        }

        if ($sent > 0) {
            // Evita que o eco (fromMe) do alerta vire conversa no inbox.
            \App\Services\Whatsapp\WhatsappAdminNotifier::markAlertSent($this->message);
        }
    }
}
