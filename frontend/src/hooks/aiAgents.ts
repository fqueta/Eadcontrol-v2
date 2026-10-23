import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiAgentsService } from '@/services/aiAgentsService';
import type { AiAgent, AiAgentPayload, AiKnowledgeBase, LlmProviderInfo } from '@/types/ai';
import type { WhatsappInstance } from '@/types/whatsapp';

/**
 * Hooks dos agentes de IA e base de conhecimento.
 */

export const aiAgentKeys = {
  all: ['ai-agents'] as const,
  list: () => [...aiAgentKeys.all, 'list'] as const,
  detail: (id: number | string) => [...aiAgentKeys.all, 'detail', String(id)] as const,
  knowledge: (id: number | string) => [...aiAgentKeys.all, 'knowledge', String(id)] as const,
  providers: () => [...aiAgentKeys.all, 'providers'] as const,
  instances: () => [...aiAgentKeys.all, 'instances'] as const,
};

export function useAiAgents() {
  return useQuery<{ data: AiAgent[] }>({
    queryKey: aiAgentKeys.list(),
    queryFn: () => aiAgentsService.list(),
    staleTime: 20 * 1000,
  });
}

export function useAiAgent(id?: number | string) {
  return useQuery<{ data: AiAgent }>({
    queryKey: aiAgentKeys.detail(id ?? ''),
    queryFn: () => aiAgentsService.show(id as number | string),
    enabled: !!id,
  });
}

export function useLlmProviders() {
  return useQuery<{ data: LlmProviderInfo[] }>({
    queryKey: aiAgentKeys.providers(),
    queryFn: () => aiAgentsService.providers(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAiInstances() {
  return useQuery<{ data: WhatsappInstance[] }>({
    queryKey: aiAgentKeys.instances(),
    queryFn: () => aiAgentsService.instances(),
    staleTime: 60 * 1000,
  });
}

export function useCreateAiAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AiAgentPayload) => aiAgentsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiAgentKeys.all });
    },
  });
}

export function useUpdateAiAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: Partial<AiAgentPayload> }) =>
      aiAgentsService.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: aiAgentKeys.all });
      queryClient.invalidateQueries({ queryKey: aiAgentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: aiAgentKeys.knowledge(variables.id) });
    },
  });
}

export function useDeleteAiAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => aiAgentsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiAgentKeys.all });
    },
  });
}

export function useTestAiAgent() {
  return useMutation({
    mutationFn: ({ id, message }: { id: number | string; message: string }) => aiAgentsService.test(id, message),
  });
}

export function useSyncCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => aiAgentsService.syncCatalog(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: aiAgentKeys.knowledge(id) });
      queryClient.invalidateQueries({ queryKey: aiAgentKeys.detail(id) });
    },
  });
}

export function useKnowledgeBases(agentId?: number | string) {
  return useQuery<{ data: AiKnowledgeBase[] }>({
    queryKey: aiAgentKeys.knowledge(agentId ?? ''),
    queryFn: () => aiAgentsService.knowledgeList(agentId as number | string),
    enabled: !!agentId,
  });
}

export function useCreateKnowledgeBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agentId,
      payload,
    }: {
      agentId: number | string;
      payload: { name: string; content: string; type?: string; is_active?: boolean };
    }) => aiAgentsService.knowledgeCreate(agentId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: aiAgentKeys.knowledge(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: aiAgentKeys.detail(variables.agentId) });
    },
  });
}

export function useUpdateKnowledgeBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agentId,
      id,
      payload,
    }: {
      agentId: number | string;
      id: number | string;
      payload: { name?: string; content?: string; type?: string; is_active?: boolean };
    }) => aiAgentsService.knowledgeUpdate(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: aiAgentKeys.knowledge(variables.agentId) });
    },
  });
}

export function useDeleteKnowledgeBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { agentId: number | string; id: number | string }) =>
      aiAgentsService.knowledgeRemove(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: aiAgentKeys.knowledge(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: aiAgentKeys.detail(variables.agentId) });
    },
  });
}

export function useReindexKnowledgeBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { agentId: number | string; id: number | string }) =>
      aiAgentsService.knowledgeReindex(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: aiAgentKeys.knowledge(variables.agentId) });
    },
  });
}
