import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CourseForm } from '@/components/school/CourseForm';
import { coursesService } from '@/services/coursesService';
import { CoursePayload, CourseRecord } from '@/types/courses';

/**
 * CourseEdit
 * pt-BR: Página para editar curso existente com formulário em abas.
 * en-US: Page to edit an existing course with tabbed form.
 */
export default function CourseEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery<CourseRecord | null>({
    queryKey: ['courses', 'detail', id],
    /**
     * queryFn
     * pt-BR: Garante retorno não-`undefined`. Caso API não encontre o registro,
     *        retorna `null` para evitar erro do React Query.
     * en-US: Ensures non-`undefined` return. If API doesn't find the record,
     *        returns `null` to avoid React Query error.
     */
    queryFn: async () => {
      const res = await coursesService.getById(String(id));
      return res ?? null;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: CoursePayload) => coursesService.updateCourse(String(id), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['courses', 'detail', id] });
      navigate('/admin/school/courses');
    },
  });

  /**
   * handleSubmit
   * pt-BR: Submete atualização do curso e volta à listagem.
   * en-US: Submits course update and navigates back to listing.
   */
  const handleSubmit = async (data: CoursePayload) => {
    await updateMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Editar Curso</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/school/courses')}>Voltar</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Atualização de Curso</CardTitle>
          <CardDescription>Edite as informações nas abas abaixo.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <CourseForm initialData={course} onSubmit={handleSubmit} isSubmitting={updateMutation.isPending} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}