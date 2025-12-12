import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { modulesService } from '@/services/modulesService';
import type { ModuleRecord } from '@/types/modules';

/**
 * Modules — Listagem de módulos
 * pt-BR: Página de listagem e ações de módulos do EAD.
 * en-US: Modules listing page with actions.
 */
const Modules = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['modules','list',1],
    queryFn: async () => modulesService.list({ page: 1, per_page: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => modulesService.deleteById(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modules','list'] }),
  });

  /**
   * handleRowDoubleClick
   * pt-BR: Abre a edição do módulo ao dar duplo clique na linha.
   * en-US: Opens module edit page on row double-click.
   */
  const handleRowDoubleClick = (id: string | number) => {
    navigate(`/admin/school/modules/${id}/edit`);
  };

  return (
    <Card className="p-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Módulos</CardTitle>
            <CardDescription>Gerencie os módulos de cursos</CardDescription>
          </div>
          <Button onClick={() => navigate('/admin/school/modules/create')}>Novo módulo</Button>
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
              {(listQuery.data?.data ?? []).map((m: ModuleRecord) => (
                <tr
                  key={String(m.id)}
                  onDoubleClick={() => handleRowDoubleClick(m.id)}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                >
                  <td className="p-2">{m.title}</td>
                  <td className="p-2">{m.name}</td>
                  <td className="p-2">{m.tipo_duracao}</td>
                  <td className="p-2">{m.duration}</td>
                  <td className="p-2">{(m.active === true || m.active === 's' || m.active === 1) ? 'Sim' : 'Não'}</td>
                  <td className="p-2 flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/school/modules/${m.id}/edit`}>Editar</Link>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(m.id)}>Excluir</Button>
                  </td>
                </tr>
              ))}
              {!listQuery.data?.data?.length && (
                <tr><td className="p-2" colSpan={6}>Nenhum módulo encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default Modules;