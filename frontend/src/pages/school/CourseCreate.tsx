import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CourseForm } from '@/components/school/CourseForm';
import { coursesService } from '@/services/coursesService';
import { CoursePayload } from '@/types/courses';

/**
 * CourseCreate
 * pt-BR: Página para criar um novo curso usando o CourseForm em abas.
 * en-US: Page to create a new course using the tabbed CourseForm.
 */
export default function CourseCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CoursePayload) => coursesService.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', 'list'] });
      navigate('/admin/school/courses');
    },
  });

  /**
   * handleSubmit
   * pt-BR: Submete criação do curso e volta à listagem.
   * en-US: Submits course creation and navigates back to listing.
   */
  const handleSubmit = async (data: CoursePayload) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Novo Curso</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/school/courses')}>Voltar</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cadastro de Curso</CardTitle>
          <CardDescription>Preencha as informações nas abas abaixo.</CardDescription>
        </CardHeader>
        <CardContent>
          <CourseForm onSubmit={handleSubmit} isSubmitting={createMutation.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}