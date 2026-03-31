import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ClassForm } from '@/components/school/ClassForm';
import { turmasService } from '@/services/turmasService';
import type { TurmaPayload } from '@/types/turmas';

export default function ClassCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (payload: TurmaPayload) => turmasService.createTurma(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turmas', 'list'] });
      toast({ title: 'Turma criada', description: 'Nova turma cadastrada com sucesso!' });
      navigate('/admin/school/classes');
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: String(err?.message ?? 'Falha ao criar turma'), variant: 'destructive' });
    },
  });

  const handleSubmit = async (data: TurmaPayload) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90">Nova Turma</h1>
          <p className="text-sm font-medium text-muted-foreground">Preencha as informações para criar uma nova turma</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/school/classes')} className="h-10 rounded-xl font-bold">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>

      <ClassForm 
        onSubmit={handleSubmit} 
        isSubmitting={createMutation.isPending} 
      />
    </div>
  );
}