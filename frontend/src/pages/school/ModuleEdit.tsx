import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModuleForm } from '@/components/school/ModuleForm';
import { modulesService } from '@/services/modulesService';
import type { ModulePayload, ModuleRecord } from '@/types/modules';

/**
 * ModuleEdit — Página de edição de módulo
 * pt-BR: Edita módulo existente e retorna à listagem.
 * en-US: Edits existing module and returns to listing.
 */
const ModuleEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const qc = useQueryClient();

  const detailsQuery = useQuery({
    queryKey: ['modules','getById', id],
    queryFn: async () => modulesService.getById(String(id)),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: ModulePayload) => modulesService.update(String(id), payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules','list'] });
      navigate('/admin/school/modules');
    },
  });

  return (
    <Card className="p-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Editar módulo</CardTitle>
            <CardDescription>Atualize os campos e salve</CardDescription>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/school/modules')}>Voltar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <ModuleForm initialData={detailsQuery.data as ModuleRecord} onSubmit={(v) => updateMutation.mutate(v)} />
      </CardContent>
    </Card>
  );
};

export default ModuleEdit;