<?php

namespace App\Console\Commands;

use App\Models\SaasInvoice;
use App\Models\SaasSubscription;
use Illuminate\Console\Command;

class GenerateSaasInvoices extends Command
{
    protected $signature = 'saas:generate-invoices
        {--reference-date= : Data de referência para vencimento (YYYY-MM-DD)}
        {--dry-run : Apenas exibe o que seria gerado, sem criar}
        {--auto-charge : Envia as faturas geradas para o gateway de pagamento}';

    protected $description = 'Gera faturas em lote para assinaturas com next_billing_date atingida';

    public function handle(): int
    {
        $referenceDate = $this->option('reference-date')
            ?: now()->toDateString();
        $dryRun = (bool) $this->option('dry-run');
        $autoCharge = (bool) $this->option('auto-charge');

        $this->info("Gerando faturas com data de referência: {$referenceDate}");
        if ($dryRun) {
            $this->warn('Modo dry-run: nenhuma fatura será criada.');
        }

        $subscriptions = SaasSubscription::with('plan')
            ->whereIn('status', ['active'])
            ->where('next_billing_date', '<=', $referenceDate)
            ->get();

        if ($subscriptions->isEmpty()) {
            $this->info('Nenhuma assinatura apta para faturamento.');
            return Command::SUCCESS;
        }

        $this->line("Encontradas {$subscriptions->count()} assinatura(s) para faturar.");
        $generated = 0;
        $errors = [];

        foreach ($subscriptions as $subscription) {
            try {
                $plan = $subscription->plan;
                $amount = $plan->getPriceForCycle($subscription->billing_cycle);
                $usageAmount = $subscription->calculateUsageCharges();
                $total = max(0, $amount + $usageAmount);

                $this->line("  [{$subscription->tenant_id}] Plano: {$plan->name}, Valor: R\$ " . number_format($total, 2, ',', '.'));

                if (!$dryRun) {
                    $invoice = SaasInvoice::create([
                        'subscription_id' => $subscription->id,
                        'tenant_id' => $subscription->tenant_id,
                        'invoice_number' => SaasInvoice::generateInvoiceNumber($subscription->tenant_id),
                        'amount' => $amount,
                        'usage_amount' => $usageAmount,
                        'discount' => 0,
                        'total' => $total,
                        'due_date' => $subscription->next_billing_date,
                        'status' => 'pending',
                        'usage_details' => $subscription->usage_data,
                    ]);

                    if ($autoCharge) {
                        try {
                            $gateway = \App\Services\SaasPayment\SaasPaymentFactory::create();
                            $gateway->createCharge($invoice, 'UNDEFINED');
                            $this->line("    -> Cobrança enviada ao gateway (ID: {$invoice->id}).");
                        } catch (\Exception $e) {
                            $this->error("    -> Falha ao cobrar no gateway: " . $e->getMessage());
                        }
                    }

                    $subscription->next_billing_date = $subscription->billing_cycle === 'yearly'
                        ? $subscription->next_billing_date->addYear()
                        : $subscription->next_billing_date->addMonth();
                    $subscription->save();
                }

                $generated++;
            } catch (\Exception $e) {
                $errors[] = [
                    'tenant_id' => $subscription->tenant_id,
                    'error' => $e->getMessage(),
                ];
                $this->error("  Erro: {$e->getMessage()}");
            }
        }

        $this->newLine();
        $this->info("Faturas geradas: {$generated}.");
        if (count($errors) > 0) {
            $this->warn("Erros: " . count($errors));
        }

        return Command::SUCCESS;
    }
}
