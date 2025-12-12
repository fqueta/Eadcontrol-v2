import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActivityForm } from '@/components/school/ActivityForm';
import { activitiesService } from '@/services/activitiesService';
import type { ActivityPayload } from '@/types/activities';

/**
 * ActivityCreate — Página de criação de atividade
 * pt-BR: Cria uma nova atividade e retorna à listagem.
 * en-US: Creates a new activity and returns to listing.
 */
const ActivityCreate = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (payload: ActivityPayload) => activitiesService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities','list'] });
      navigate('/admin/school/activities');
    },
  });

  return (
    <Card className="p-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Nova atividade</CardTitle>
            <CardDescription>Preencha os campos e salve</CardDescription>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/school/activities')}>Voltar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <ActivityForm onSubmit={(v) => createMutation.mutate(v)} />
      </CardContent>
    </Card>
  );
};

export default ActivityCreate;