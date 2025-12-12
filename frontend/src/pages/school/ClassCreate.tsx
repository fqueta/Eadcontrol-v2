import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClassForm } from '@/components/school/ClassForm';
import { turmasService } from '@/services/turmasService';
import type { TurmaPayload } from '@/types/turmas';

/**
 * ClassCreate
 * pt-BR: Página para criar nova turma.
 * en-US: Page to create a new class.
 */
export default function ClassCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /**
   * createMutation
   * pt-BR: Mutation para criar turma e invalidar lista.
   * en-US: Mutation to create class and invalidate list.
   */
  const createMutation = useMutation({
    mutationFn: async (payload: TurmaPayload) => turmasService.createTurma(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turmas', 'list'] });
      navigate('/admin/school/classes');
    },
  });

  /**
   * handleSubmit
   * pt-BR: Envia dados para criação e navega para listagem.
   * en-US: Sends data for creation and navigates to listing.
   */
  const handleSubmit = async (data: TurmaPayload) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Criar Turma</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/school/classes')}>Voltar</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Novo Cadastro de Turma</CardTitle>
          <CardDescription>Preencha as informações nas abas abaixo.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClassForm onSubmit={handleSubmit} isSubmitting={createMutation.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}