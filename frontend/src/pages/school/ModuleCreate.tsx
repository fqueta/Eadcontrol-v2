import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModuleForm } from '@/components/school/ModuleForm';
import { modulesService } from '@/services/modulesService';
import type { ModulePayload } from '@/types/modules';

/**
 * ModuleCreate — Página de criação de módulo
 * pt-BR: Cria um novo módulo e retorna à listagem.
 * en-US: Creates a new module and returns to listing.
 */
const ModuleCreate = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (payload: ModulePayload) => modulesService.create(payload),
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
            <CardTitle>Novo módulo</CardTitle>
            <CardDescription>Preencha os campos e salve</CardDescription>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/school/modules')}>Voltar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <ModuleForm onSubmit={(v) => createMutation.mutate(v)} />
      </CardContent>
    </Card>
  );
};

export default ModuleCreate;