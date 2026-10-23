<?php

namespace App\Jobs;

use App\Models\AiKnowledgeBase;
use App\Services\Ai\RagService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * IndexKnowledgeBase
 * pt-BR: Gera chunks e embeddings de uma base de conhecimento em background,
 *        reativando o contexto do tenant antes de qualquer acesso ao banco.
 */
class IndexKnowledgeBase implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 600;

    public ?string $tenantId;
    public int $knowledgeBaseId;

    public function __construct(int $knowledgeBaseId)
    {
        $this->tenantId = $this->currentTenantId();
        $this->knowledgeBaseId = $knowledgeBaseId;
    }

    private function currentTenantId(): ?string
    {
        try {
            return tenancy()->tenant?->id;
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function handle(RagService $rag): void
    {
        if ($this->tenantId) {
            try {
                if (!tenancy()->tenant || tenancy()->tenant->id !== $this->tenantId) {
                    tenancy()->initialize($this->tenantId);
                }
            } catch (\Throwable $e) {
                Log::warning('IndexKnowledgeBase: tenant inválido', [
                    'tenant' => $this->tenantId,
                    'error'  => $e->getMessage(),
                ]);
                return;
            }
        }

        $base = AiKnowledgeBase::query()->find($this->knowledgeBaseId);

        if (!$base) {
            return;
        }

        $rag->indexKnowledgeBase($base);
    }
}
