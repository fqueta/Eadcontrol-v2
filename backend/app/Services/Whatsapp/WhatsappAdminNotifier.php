<?php

namespace App\Services\Whatsapp;

use App\Jobs\SendWhatsappAlertJob;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\Curso;
use App\Models\FinancialAccount;
use App\Models\Matricula;
use App\Models\WhatsappInstance;
use App\Services\Qlib;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * WhatsappAdminNotifier
 * pt-BR: Monta e envia alertas administrativos por WhatsApp usando as conexões
 *        Evolution GO do tenant (comentários, matrículas, vendas e pagamentos).
 * en-US: Builds and sends admin WhatsApp alerts through the tenant Evolution GO
 *        connections (comments, enrollments, sales and payments).
 */
class WhatsappAdminNotifier
{
    public function __construct(
        private WhatsappNotificationSettings $settings,
        private WhatsappService $whatsapp,
    ) {}

    // ─── Eventos ───────────────────────────────────────────────────────────

    /**
     * Notifica os administradores sobre um novo comentário.
     */
    public function notifyComment(Comment $comment): bool
    {
        return $this->dispatchEvent('comments', $this->buildCommentMessage($comment), [
            'comment_id' => $comment->id,
        ]);
    }

    /**
     * Notifica sobre uma nova matrícula/proposta criada no funil.
     */
    public function notifyEnrollment(Matricula $matricula): bool
    {
        return $this->dispatchEvent('enrollments', $this->buildEnrollmentMessage($matricula), [
            'matricula_id' => $matricula->id,
        ]);
    }

    /**
     * Notifica sobre uma venda confirmada (pagamento aprovado ou matrícula
     * efetivada manualmente no funil).
     */
    public function notifySale(Matricula $matricula, string $origin = 'payment'): bool
    {
        return $this->dispatchEvent('sales', $this->buildSaleMessage($matricula, $origin), [
            'matricula_id' => $matricula->id,
            'origin'       => $origin,
        ]);
    }

    /**
     * Notifica sobre um pagamento recebido em conta a receber (gateway).
     */
    public function notifyPaymentReceived(FinancialAccount $account): bool
    {
        return $this->dispatchEvent('payments', $this->buildPaymentMessage($account), [
            'financial_account_id' => $account->id,
        ]);
    }

    /**
     * pt-BR: Resolve a conexão/destinos e enfileira o alerta quando o evento
     *        está habilitado nas preferências.
     */
    private function dispatchEvent(string $event, string $message, array $context = []): bool
    {
        $settings = $this->settings->get();

        if (!$settings['enabled'] || !$this->settings->isEventEnabled($event, $settings)) {
            return false;
        }

        $instance = $this->settings->resolveInstance($settings);

        if (!$instance) {
            Log::info('WhatsappAdminNotifier: nenhuma conexão disponível para alertas', $context + [
                'event' => $event,
            ]);
            return false;
        }

        $recipients = $this->settings->resolveRecipients($instance, $settings);

        if (empty($recipients)) {
            Log::info('WhatsappAdminNotifier: nenhum destinatário para alertas', $context + [
                'event'    => $event,
                'instance' => $instance->instance_name,
            ]);
            return false;
        }

        SendWhatsappAlertJob::dispatch($instance->id, $recipients, $message, $event);

        return true;
    }

    // ─── Mensagens ─────────────────────────────────────────────────────────

    /**
     * Monta o texto do alerta de novo comentário.
     */
    public function buildCommentMessage(Comment $comment): string
    {
        $target = $comment->commentable;

        $targetType = 'Conteúdo';
        $targetName = null;

        if ($target instanceof Curso) {
            $targetType = 'Curso';
            $targetName = $target->nome;
        } elseif ($target instanceof Activity) {
            $targetType = 'Atividade';
            $targetName = $target->post_title ?? $target->title ?? null;
        }

        $body = Str::limit(trim(strip_tags((string) $comment->body)), 400);
        $rating = (int) ($comment->rating ?? 0);

        $lines = $this->header(
            !empty($comment->parent_id)
                ? '💬 *Nova resposta em um comentário*'
                : '🔔 *Novo comentário recebido*'
        );

        $lines[] = '👤 *Autor:* ' . (optional($comment->user)->name ?: 'Usuário');
        $lines[] = '🎯 *' . $targetType . ':* ' . ($targetName ?: '#' . $comment->commentable_id);

        if ($rating >= 1 && $rating <= 5) {
            $lines[] = '⭐ *Avaliação:* ' . str_repeat('⭐', $rating) . ' (' . $rating . '/5)';
        }

        $lines[] = '';
        $lines[] = '💬 "' . $body . '"';
        $lines[] = '';
        $lines[] = 'Aprove ou responda no painel:';
        $lines[] = $this->frontendUrl('/admin/comments');

        return $this->join($lines);
    }

    /**
     * Monta o texto do alerta de nova matrícula/proposta.
     */
    public function buildEnrollmentMessage(Matricula $matricula): string
    {
        $client = $matricula->student;
        $course = $matricula->course;
        $situation = optional($matricula->situacao)->post_title;

        $lines = $this->header('🆕 *Nova matrícula/proposta*');
        $lines[] = '👤 *Cliente:* ' . ($client->name ?? 'Cliente removido');
        $lines[] = '📚 *Curso:* ' . ($course->nome ?? $course->titulo ?? 'Curso removido');

        if (!empty($matricula->total)) {
            $lines[] = '💰 *Valor:* ' . $this->money($matricula->total);
        }

        if (!empty($situation)) {
            $lines[] = '📌 *Situação:* ' . $situation;
        }

        $lines[] = '';
        $lines[] = 'Acompanhe no funil:';
        $lines[] = $this->frontendUrl('/admin/school/enrollments/view/' . $matricula->id);

        return $this->join($lines);
    }

    /**
     * Monta o texto do alerta de venda confirmada.
     */
    public function buildSaleMessage(Matricula $matricula, string $origin = 'payment'): string
    {
        $client = $matricula->student;
        $course = $matricula->course;

        $title = $origin === 'manual'
            ? '🎓 *Matrícula efetivada*'
            : '💰 *Nova venda confirmada*';

        $lines = $this->header($title);
        $lines[] = '👤 *Cliente:* ' . ($client->name ?? 'Cliente removido');

        if ($client && !empty($client->email)) {
            $lines[] = '✉️ *E-mail:* ' . $client->email;
        }

        $lines[] = '📚 *Curso:* ' . ($course->nome ?? $course->titulo ?? 'Curso removido');

        if (!empty($matricula->total)) {
            $lines[] = '💰 *Valor:* ' . $this->money($matricula->total);
        }

        $lines[] = '';
        $lines[] = 'Abra a matrícula no painel:';
        $lines[] = $this->frontendUrl('/admin/school/enrollments/view/' . $matricula->id);

        return $this->join($lines);
    }

    /**
     * Monta o texto do alerta de pagamento recebido.
     */
    public function buildPaymentMessage(FinancialAccount $account): string
    {
        $clientName = optional($account->client)->name
            ?: ($account->customer_name ?: null);

        $method = $account->payment_method
            ? (FinancialAccount::getPaymentMethodOptions()[$account->payment_method] ?? $account->payment_method)
            : null;

        $lines = $this->header('💵 *Pagamento recebido*');

        if (!empty($clientName)) {
            $lines[] = '👤 *Cliente:* ' . $clientName;
        }

        $lines[] = '💵 *Valor:* ' . $this->money($account->paid_amount ?: $account->amount);

        if (!empty($method)) {
            $lines[] = '💳 *Forma:* ' . $method;
        }

        if (!empty($account->invoice_number)) {
            $lines[] = '🧾 *Fatura:* ' . $account->invoice_number;
        }

        if (!empty($account->description)) {
            $lines[] = '📝 *Descrição:* ' . Str::limit((string) $account->description, 160);
        }

        $lines[] = '';
        $lines[] = 'Veja no financeiro:';
        $lines[] = $this->frontendUrl('/admin/financial');

        return $this->join($lines);
    }

    // ─── Teste ─────────────────────────────────────────────────────────────

    /**
     * Envia uma mensagem de teste agora (usado pelo botão do painel).
     *
     * @return array{sent: int, recipients: string[]}
     */
    public function sendTestMessage(?string $customPhone = null): array
    {
        $settings = $this->settings->get();
        $instance = $this->settings->resolveInstance($settings);

        if (!$instance) {
            throw new \RuntimeException('Nenhuma conexão WhatsApp disponível. Crie e conecte uma instância primeiro.');
        }

        if (!$instance->isConnected()) {
            throw new \RuntimeException("A conexão \"{$instance->display_name}\" não está conectada. Leia o QR Code antes de testar.");
        }

        $recipients = $customPhone !== null && trim($customPhone) !== ''
            ? WhatsappNotificationSettings::normalizePhones($customPhone)
            : $this->settings->resolveRecipients($instance, $settings);

        if (empty($recipients)) {
            throw new \RuntimeException('Informe um número de destino (ou pareie a conexão para usar o próprio número dela).');
        }

        $message = $this->buildTestMessage($instance);

        $sent = 0;
        $lastError = null;

        foreach ($recipients as $phone) {
            try {
                $this->whatsapp->sendMessage($instance, $phone, $message);
                $sent++;
            } catch (\Throwable $e) {
                $lastError = $e->getMessage();
                Log::warning('WhatsappAdminNotifier: falha no envio de teste', [
                    'instance' => $instance->instance_name,
                    'phone'    => $phone,
                    'error'    => $e->getMessage(),
                ]);
            }
        }

        if ($sent === 0) {
            throw new \RuntimeException($lastError ?: 'Não foi possível enviar a mensagem de teste.');
        }

        self::markAlertSent($message);

        return [
            'sent'       => $sent,
            'recipients' => $recipients,
        ];
    }

    /**
     * pt-BR: Marca o texto do alerta para que o eco do webhook (fromMe) não
     *        crie uma conversa artificial no inbox de atendimento.
     * en-US: Flags the alert text so the webhook echo (fromMe) does not create
     *        an artificial conversation in the inbox.
     */
    public static function markAlertSent(string $message): void
    {
        try {
            Cache::put(self::alertCacheKey($message), true, now()->addMinutes(10));
        } catch (\Throwable $e) {
            // Cache indisponível não deve impedir o envio.
        }
    }

    public static function isAlertEcho(string $message): bool
    {
        $message = trim($message);

        if ($message === '') {
            return false;
        }

        try {
            return Cache::has(self::alertCacheKey($message));
        } catch (\Throwable $e) {
            return false;
        }
    }

    private static function alertCacheKey(string $message): string
    {
        return 'whatsapp:admin-alert:' . md5(trim($message));
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    /**
     * @return string[]
     */
    private function header(string $title): array
    {
        $lines = [$title];
        $institution = $this->institutionName();

        if ($institution !== '') {
            $lines[] = '_' . $institution . '_';
        }

        $lines[] = '';

        return $lines;
    }

    /**
     * @param string[] $lines
     */
    private function join(array $lines): string
    {
        return trim(implode("\n", $lines));
    }

    private function money($value): string
    {
        return 'R$ ' . number_format((float) $value, 2, ',', '.');
    }

    private function buildTestMessage(WhatsappInstance $instance): string
    {
        $institution = $this->institutionName();

        return $this->join([
            '✅ *Teste de notificação' . ($institution !== '' ? ' — ' . $institution : '') . '*',
            '',
            'Se você recebeu esta mensagem, os alertas administrativos por WhatsApp estão funcionando.',
            '',
            '📱 Conexão: ' . $instance->display_name,
        ]);
    }

    private function institutionName(): string
    {
        $name = (string) (Qlib::qoption('app_institution_name') ?? '');

        return trim($name) !== '' ? $name : (string) config('app.name', '');
    }

    private function frontendUrl(string $path): string
    {
        $base = (string) (Qlib::get_frontend_url() ?: config('app.url', ''));

        return rtrim($base, '/') . '/' . ltrim($path, '/');
    }
}
