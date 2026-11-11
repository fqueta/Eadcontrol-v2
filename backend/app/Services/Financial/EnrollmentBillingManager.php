<?php

namespace App\Services\Financial;

use App\Models\FinancialAccount;
use App\Models\Matricula;
use App\Models\User;
use App\Services\Financial\InstallmentStrategies\InstallmentStrategyFactory;
use App\Services\Qlib;
use Illuminate\Support\Facades\DB;

/**
 * Gerenciador de faturamento e sincronização inteligente de parcelas da matrícula.
 * Preserva faturas pagas, permite atualizar faturas pendentes individualmente ou regerar
 * o cronograma de cobrança aplicando o Strategy Pattern.
 */
class EnrollmentBillingManager
{
    /**
     * Sincroniza as faturas de uma matrícula de forma segura:
     * - Faturas já pagas (status = 'paid') nunca são apagadas.
     * - Faturas enviadas com `id` existente e pendentes são atualizadas in-place.
     * - No modo `replace_pending`, faturas pendentes antigas que não estão no novo lote são removidas.
     *
     * @param Matricula $matricula
     * @param array $invoices Lista de faturas (já calculadas pela Strategy ou enviadas customizadas)
     * @param string $mode 'replace_pending' | 'append' | 'clear_pending'
     * @return array Lista atualizada de FinancialAccount vinculadas à matrícula
     */
    public function syncInvoices(Matricula $matricula, array $invoices, string $mode = 'replace_pending'): array
    {
        return DB::transaction(function () use ($matricula, $invoices, $mode) {
            $existingAccounts = FinancialAccount::withoutGlobalScopes()
                ->where('config->matricula_id', $matricula->id)
                ->where('excluido', false)
                ->where('deletado', false)
                ->orderBy('due_date', 'asc')
                ->get();

            if ($mode === 'clear_pending') {
                foreach ($existingAccounts as $acc) {
                    if ($acc->status !== 'paid') {
                        $acc->delete();
                    }
                }

                return $this->getEnrollmentInvoices($matricula->id);
            }

            $client = User::find($matricula->id_cliente);
            $clientName = $client ? $client->name : 'Cliente';

            $incomingIds = collect($invoices)
                ->pluck('id')
                ->filter(fn ($id) => !empty($id) && is_numeric($id))
                ->map(fn ($id) => (int) $id)
                ->all();

            // Se o modo for replace_pending, removemos todas as faturas não pagas que não estejam sendo atualizadas pelo ID
            if ($mode === 'replace_pending') {
                foreach ($existingAccounts as $acc) {
                    if ($acc->status === 'paid') {
                        continue; // Nunca apaga fatura já paga
                    }
                    if (!in_array((int) $acc->id, $incomingIds, true)) {
                        $acc->delete();
                    }
                }
            }

            $totalInvoices = count($invoices);

            foreach ($invoices as $idx => $inv) {
                $amount = round((float) ($inv['amount'] ?? 0), 2);
                if ($amount <= 0) {
                    continue;
                }

                $installmentIndex = (int) ($inv['installment_index'] ?? ($idx + 1));
                $description = trim((string) ($inv['description'] ?? "Parcela {$installmentIndex}/{$totalInvoices} - Curso"));
                $dueDate = $inv['due_date'] ?? now()->addDays(7)->format('Y-m-d');
                $paymentMethod = $inv['payment_method'] ?? 'pix';
                $installmentType = $inv['installment_type'] ?? 'tuition';

                $existingId = !empty($inv['id']) && is_numeric($inv['id']) ? (int) $inv['id'] : null;
                $existingAcc = $existingId ? $existingAccounts->firstWhere('id', $existingId) : null;

                if ($existingAcc) {
                    // Se já está paga, não sobrescreve valor nem vencimento para proteger conciliação financeira
                    if ($existingAcc->status === 'paid') {
                        continue;
                    }

                    $cfg = is_array($existingAcc->config)
                        ? $existingAcc->config
                        : (json_decode((string) ($existingAcc->config ?? '{}'), true) ?: []);

                    $cfg['matricula_id'] = $matricula->id;
                    $cfg['installment_index'] = $installmentIndex;
                    $cfg['installment_type'] = $installmentType;

                    $existingAcc->update([
                        'amount'         => $amount,
                        'description'    => $description,
                        'due_date'       => $dueDate,
                        'payment_method' => $paymentMethod,
                        'customer_name'  => $clientName,
                        'client_id'      => $matricula->id_cliente,
                        'installments'   => $totalInvoices,
                        'config'         => $cfg,
                    ]);
                } else {
                    FinancialAccount::create([
                        'type'            => 'receivable',
                        'amount'          => $amount,
                        'customer_name'   => $clientName,
                        'client_id'       => $matricula->id_cliente,
                        'description'     => $description,
                        'due_date'        => $dueDate,
                        'invoice_number'  => $matricula->id . '-' . $installmentIndex,
                        'contract_number' => 'Matrícula ' . $matricula->id,
                        'payment_method'  => $paymentMethod,
                        'status'          => 'pending',
                        'installments'    => $totalInvoices,
                        'config'          => [
                            'matricula_id'      => $matricula->id,
                            'installment_index' => $installmentIndex,
                            'installment_type'  => $installmentType,
                        ],
                        'token'           => Qlib::token(),
                        'excluido'        => false,
                        'deletado'        => false,
                    ]);
                }
            }

            return $this->getEnrollmentInvoices($matricula->id);
        });
    }

    /**
     * Gera o cronograma via Strategy e sincroniza no banco.
     */
    public function generateAndSyncByStrategy(Matricula $matricula, string $strategyKey, array $params, string $mode = 'replace_pending'): array
    {
        $strategy = InstallmentStrategyFactory::make($strategyKey);
        $schedule = $strategy->calculateSchedule($params);

        return $this->syncInvoices($matricula, $schedule, $mode);
    }

    /**
     * Retorna todas as faturas ativas vinculadas à matrícula.
     */
    public function getEnrollmentInvoices(int|string $matriculaId): array
    {
        return FinancialAccount::withoutGlobalScopes()
            ->where('config->matricula_id', $matriculaId)
            ->where('excluido', false)
            ->where('deletado', false)
            ->orderBy('due_date', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->toArray();
    }
}

