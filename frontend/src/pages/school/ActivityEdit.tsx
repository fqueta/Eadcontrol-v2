import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActivityForm } from '@/components/school/ActivityForm';
import { activitiesService } from '@/services/activitiesService';
import type { ActivityPayload, ActivityRecord } from '@/types/activities';

/**
 * ActivityEdit — Página de edição de atividade
 * pt-BR: Edita atividade existente e retorna à listagem.
 * en-US: Edits existing activity and returns to listing.
 */
const ActivityEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const qc = useQueryClient();

  const detailsQuery = useQuery({
    queryKey: ['activities','getById', id],
    queryFn: async () => activitiesService.getById(String(id)),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: ActivityPayload) => activitiesService.update(String(id), payload),
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
            <CardTitle>Editar atividade</CardTitle>
            <CardDescription>Atualize os campos e salve</CardDescription>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/school/activities')}>Voltar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <ActivityForm initialData={detailsQuery.data as ActivityRecord} onSubmit={(v) => updateMutation.mutate(v)} />
      </CardContent>
    </Card>
  );
};

export default ActivityEdit;