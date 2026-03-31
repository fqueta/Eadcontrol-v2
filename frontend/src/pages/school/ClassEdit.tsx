import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ClassForm } from '@/components/school/ClassForm';
import { turmasService } from '@/services/turmasService';
import type { TurmaPayload, TurmaRecord } from '@/types/turmas';

export default function ClassEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const turmaQuery = useQuery<TurmaRecord | null>({
    queryKey: ['turmas', 'detail', id],
    queryFn: async () => {
      const res = await turmasService.getById(String(id));
      return res ?? null;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: TurmaPayload) => turmasService.updateTurma(String(id), payload),
    onSuccess: () => {
      toast({ title: 'Turma atualizada', description: 'As alterações foram salvas com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['turmas', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['turmas', 'detail', id] });
      navigate('/admin/school/classes');
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar', description: String(err?.message ?? 'Falha ao salvar turma'), variant: 'destructive' });
    }
  });

  const handleSubmit = async (data: TurmaPayload) => {
    await updateMutation.mutateAsync(data);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90">Editar Turma</h1>
          <p className="text-sm font-medium text-muted-foreground">
            {turmaQuery.data?.nome ? `Editando: ${turmaQuery.data.nome}` : 'Atualize as informações da turma'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/school/classes')} className="h-10 rounded-xl font-bold">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>

      {turmaQuery.isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-slate-800/60">
          <Loader2 className="h-10 w-10 animate-spin text-primary/60 mb-4" />
          <p className="text-lg font-medium text-foreground/80">Carregando dados da turma...</p>
        </div>
      ) : turmaQuery.isError ? (
        <div className="text-center py-20 text-red-500 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30">
          <p className="font-bold text-lg">Erro ao carregar a turma.</p>
          <Button variant="outline" onClick={() => navigate('/admin/school/classes')} className="mt-4">
            Voltar para a lista
          </Button>
        </div>
      ) : (
        <ClassForm 
          initialData={turmaQuery.data} 
          onSubmit={handleSubmit} 
          isSubmitting={updateMutation.isPending} 
        />
      )}
    </div>
  );
}