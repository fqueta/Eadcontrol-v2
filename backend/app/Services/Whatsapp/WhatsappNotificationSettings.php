<?php

namespace App\Services\Whatsapp;

use App\Models\Option;
use App\Models\WhatsappInstance;
use App\Services\Qlib;

/**
 * WhatsappNotificationSettings
 * pt-BR: Preferências de notificações administrativas enviadas por WhatsApp.
 *        As preferências ficam na tabela `options` do banco do tenant.
 * en-US: Admin WhatsApp notification preferences stored in the tenant
 *        `options` table.
 */
class WhatsappNotificationSettings
{
    public const OPTION_ENABLED = 'whatsapp_notify_enabled';
    public const OPTION_INSTANCE = 'whatsapp_notify_instance_id';
    public const OPTION_RECIPIENTS = 'whatsapp_notify_recipients';
    public const OPTION_EVENTS = 'whatsapp_notify_events';

    /**
     * Eventos suportados pelo canal de notificação.
     */
    public const EVENTS = [
        'comments'    => 'Novos comentários',
        'enrollments' => 'Novas matrículas/propostas',
        'sales'       => 'Vendas confirmadas',
        'payments'    => 'Pagamentos recebidos',
    ];

    /**
     * Eventos habilitados quando o administrador ainda não personalizou.
     */
    public const DEFAULT_EVENTS = ['comments'];

    /**
     * pt-BR: Lê uma opção diretamente da tabela (sem exigir `ativo = s`,
     *        pois `Qlib::qoption` filtra por `ativo` e `excluido`).
     */
    private function option(string $key): ?string
    {
        $value = Option::query()
            ->where('url', $key)
            ->orderByDesc('id')
            ->value('value');

        return $value === null ? null : (string) $value;
    }

    /**
     * Configuração atual normalizada.
     *
     * @return array{
     *   enabled: bool,
     *   instance_id: ?int,
     *   recipients: string[],
     *   recipients_raw: string,
     *   events: string[]
     * }
     */
    public function get(): array
    {
        $enabled = in_array($this->option(self::OPTION_ENABLED), ['s', '1', 'true'], true);
        $instanceId = (int) ($this->option(self::OPTION_INSTANCE) ?? 0);
        $recipientsRaw = (string) ($this->option(self::OPTION_RECIPIENTS) ?? '');

        // pt-BR: Sem opção salva, assume o padrão; se salva (mesmo vazia), respeita.
        $rawEvents = $this->option(self::OPTION_EVENTS);
        $events = $rawEvents === null ? self::DEFAULT_EVENTS : json_decode($rawEvents, true);

        if (!is_array($events)) {
            $events = self::DEFAULT_EVENTS;
        }

        $events = array_values(array_intersect(
            array_map('strval', $events),
            array_keys(self::EVENTS)
        ));

        return [
            'enabled'        => $enabled,
            'instance_id'    => $instanceId > 0 ? $instanceId : null,
            'recipients'     => self::normalizePhones($recipientsRaw),
            'recipients_raw' => $recipientsRaw,
            'events'         => $events,
        ];
    }

    /**
     * Persiste a configuração recebida do painel.
     *
     * @param array{enabled?: bool, instance_id?: int|string|null, recipients?: string|null, events?: array|null} $data
     * @return array<string, mixed>
     */
    public function save(array $data): array
    {
        $events = $data['events'] ?? self::DEFAULT_EVENTS;

        if (!is_array($events)) {
            $events = [];
        }

        $events = array_values(array_intersect(
            array_map('strval', $events),
            array_keys(self::EVENTS)
        ));

        $this->put(self::OPTION_ENABLED, !empty($data['enabled']) ? 's' : 'n');
        $this->put(self::OPTION_INSTANCE, !empty($data['instance_id']) ? (string) (int) $data['instance_id'] : '');
        $this->put(self::OPTION_RECIPIENTS, trim((string) ($data['recipients'] ?? '')));
        $this->put(self::OPTION_EVENTS, json_encode($events, JSON_UNESCAPED_UNICODE));

        return $this->get();
    }

    /**
     * pt-BR: Retorna a instância configurada (ou a primeira conectada).
     * en-US: Returns the configured instance (or the first connected one).
     */
    public function resolveInstance(?array $settings = null): ?WhatsappInstance
    {
        $settings ??= $this->get();

        if (!empty($settings['instance_id'])) {
            $instance = WhatsappInstance::query()->find((int) $settings['instance_id']);
            if ($instance) {
                return $instance;
            }
        }

        return WhatsappInstance::query()
            ->orderByRaw("CASE WHEN status = 'connected' THEN 0 ELSE 1 END")
            ->orderBy('id')
            ->first();
    }

    /**
     * Destinos efetivos: números informados ou o próprio número da conexão.
     *
     * @return string[]
     */
    public function resolveRecipients(WhatsappInstance $instance, ?array $settings = null): array
    {
        $settings ??= $this->get();
        $recipients = $settings['recipients'] ?? [];

        if (empty($recipients) && !empty($instance->phone_number)) {
            $recipients = self::normalizePhones((string) $instance->phone_number);
        }

        return $recipients;
    }

    public function isEventEnabled(string $event, ?array $settings = null): bool
    {
        $settings ??= $this->get();

        return in_array($event, $settings['events'] ?? [], true);
    }

    /**
     * Normaliza uma lista de telefones separada por vírgula, ponto e vírgula,
     * quebra de linha ou espaço.
     *
     * @return string[]
     */
    public static function normalizePhones(string $value): array
    {
        $parts = preg_split('/[\s,;|]+/', $value) ?: [];
        $phones = [];

        foreach ($parts as $part) {
            $digits = preg_replace('/\D/', '', $part);

            if ($digits === null || strlen($digits) < 10) {
                continue;
            }

            $phones[$digits] = $digits;
        }

        return array_values($phones);
    }

    private function put(string $key, string $value): void
    {
        $option = Option::query()->where('url', $key)->orderByDesc('id')->first();

        if (!$option) {
            $option = new Option();
            $option->token = Qlib::token();
            $option->name = ucwords(str_replace('_', ' ', $key));
            $option->url = $key;
        }

        $option->value = $value;
        $option->ativo = 's';
        $option->excluido = 'n';
        $option->deletado = 'n';
        $option->save();
    }
}
