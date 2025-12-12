import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { activitiesService } from '@/services/activitiesService';
import type { ActivityRecord } from '@/types/activities';

/**
 * Activities — Listagem de atividades
 * pt-BR: Página de listagem e ações de atividades do EAD.
 * en-US: Activities listing page with actions.
 */
const Activities = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['activities','list',1],
    queryFn: async () => activitiesService.list({ page: 1, per_page: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => activitiesService.deleteById(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities','list'] }),
  });

  /**
   * handleRowDoubleClick
   * pt-BR: Abre a edição da atividade ao dar duplo clique na linha.
   * en-US: Opens activity edit page on row double-click.
   */
  const handleRowDoubleClick = (id: string | number) => {
    navigate(`/admin/school/activities/${id}/edit`);
  };

  return (
    <Card className="p-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Atividades</CardTitle>
            <CardDescription>Gerencie atividades (vídeo, apostila, avaliação)</CardDescription>
          </div>
          <Button onClick={() => navigate('/admin/school/activities/create')}>Nova atividade</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Título</th>
                <th className="p-2">Nome</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Duração</th>
                <th className="p-2">Ativo</th>
                <th className="p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(listQuery.data?.data ?? []).map((a: ActivityRecord) => (
                <tr
                  key={String(a.id)}
                  onDoubleClick={() => handleRowDoubleClick(a.id)}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                >
                  <td className="p-2">{a.title}</td>
                  <td className="p-2">{a.name}</td>
                  <td className="p-2">{a.type_activities}</td>
                  <td className="p-2">{a.duration} {a.type_duration}</td>
                  <td className="p-2">{(a.active === true || a.active === 's' || a.active === 1) ? 'Sim' : 'Não'}</td>
                  <td className="p-2 flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/school/activities/${a.id}/edit`}>Editar</Link>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(a.id)}>Excluir</Button>
                  </td>
                </tr>
              ))}
              {!listQuery.data?.data?.length && (
                <tr><td className="p-2" colSpan={6}>Nenhuma atividade encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default Activities;