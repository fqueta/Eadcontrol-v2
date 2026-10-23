import { BaseApiService } from './BaseApiService';
import type {
  AiAgent,
  AiAgentPayload,
  AiAgentTestResult,
  AiKnowledgeBase,
  LlmProviderInfo,
} from '@/types/ai';
import type { WhatsappInstance } from '@/types/whatsapp';

/**
 * AiAgentsService
 * pt-BR: CRUD de agentes de IA, base de conhecimento (RAG), providers e testes.
 */
class AiAgentsService extends BaseApiService {
  async list(): Promise<{ data: AiAgent[] }> {
    return this.get<{ data: AiAgent[] }>('/ai/agents');
  }

  async show(id: number | string): Promise<{ data: AiAgent }> {
    return this.get<{ data: AiAgent }>(`/ai/agents/${id}`);
  }

  async create(payload: AiAgentPayload): Promise<{ message: string; data: AiAgent }> {
    return this.post<{ message: string; data: AiAgent }>('/ai/agents', payload);
  }

  async update(id: number | string, payload: Partial<AiAgentPayload>): Promise<{ message: string; data: AiAgent }> {
    return this.put<{ message: string; data: AiAgent }>(`/ai/agents/${id}`, payload);
  }

  async remove(id: number | string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/ai/agents/${id}`);
  }

  async test(id: number | string, message: string): Promise<{ message: string; data: AiAgentTestResult }> {
    return this.post<{ message: string; data: AiAgentTestResult }>(`/ai/agents/${id}/test`, { message });
  }

  async syncCatalog(id: number | string): Promise<{ message: string; data: AiKnowledgeBase }> {
    return this.post<{ message: string; data: AiKnowledgeBase }>(`/ai/agents/${id}/sync-catalog`);
  }

  async providers(): Promise<{ data: LlmProviderInfo[] }> {
    return this.get<{ data: LlmProviderInfo[] }>('/ai/providers');
  }

  async instances(): Promise<{ data: WhatsappInstance[] }> {
    return this.get<{ data: WhatsappInstance[] }>('/ai/instances');
  }

  // ─── Base de conhecimento ──────────────────────────────────────────────

  async knowledgeList(agentId: number | string): Promise<{ data: AiKnowledgeBase[] }> {
    return this.get<{ data: AiKnowledgeBase[] }>(`/ai/agents/${agentId}/knowledge-bases`);
  }

  async knowledgeCreate(
    agentId: number | string,
    payload: { name: string; content: string; type?: string; is_active?: boolean }
  ): Promise<{ message: string; data: AiKnowledgeBase }> {
    return this.post<{ message: string; data: AiKnowledgeBase }>(`/ai/agents/${agentId}/knowledge-bases`, payload);
  }

  async knowledgeUpdate(
    knowledgeBaseId: number | string,
    payload: { name?: string; content?: string; type?: string; is_active?: boolean }
  ): Promise<{ message: string; data: AiKnowledgeBase }> {
    return this.put<{ message: string; data: AiKnowledgeBase }>(`/ai/knowledge-bases/${knowledgeBaseId}`, payload);
  }

  async knowledgeRemove(knowledgeBaseId: number | string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/ai/knowledge-bases/${knowledgeBaseId}`);
  }

  async knowledgeReindex(knowledgeBaseId: number | string): Promise<{ message: string; data: AiKnowledgeBase }> {
    return this.post<{ message: string; data: AiKnowledgeBase }>(`/ai/knowledge-bases/${knowledgeBaseId}/reindex`);
  }
}

export const aiAgentsService = new AiAgentsService();
export default aiAgentsService;
