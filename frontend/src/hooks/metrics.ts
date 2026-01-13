import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metricsService } from '@/services/metricsService';
import { 
  MetricRecord, 
  CreateMetricInput, 
  UpdateMetricInput, 
  MetricsListParams 
} from '@/types/metrics';
import { useToast } from '@/hooks/use-toast';

export function useMetricsList(params?: MetricsListParams) {
  return useQuery({
    queryKey: ['metrics', 'list', params],
    queryFn: () => metricsService.listMetrics(params),
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useMetric(id: string) {
  return useQuery({
    queryKey: ['metrics', 'detail', id],
    queryFn: () => metricsService.getMetric(id),
    enabled: !!id,
  });
}

export function useCreateMetric() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateMetricInput) => metricsService.createMetric(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast({
        title: "Sucesso",
        description: "Mátrica criada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar Mátrica",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateMetric() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMetricInput }) => 
      metricsService.updateMetric(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast({
        title: "Sucesso",
        description: "Mátrica atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar Mátrica",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteMetric() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => metricsService.deleteMetric(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast({
        title: "Sucesso",
        description: "Mátrica excluída com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir Mátrica",
        variant: "destructive",
      });
    },
  });
}
// export function CamposForm() {
//   const arr = [
//     { name: "investment", label: "Investimento", type: "number" },
//     { name: "visitors", label: "Visitantes", type: "number" },
//     { name: "bot_conversations", label: "Bot", type: "number" },
//     { name: "human_conversations", label: "Humanos", type: "number" },
//     { name: "proposals", label: "Propostas", type: "number" },
//     { name: "closed_deals", label: "Fechados", type: "number" }
//   ];
//   console.log('CamposForm',arr);
//   return arr;
// }