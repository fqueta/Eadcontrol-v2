import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CourseForm } from '@/components/school/CourseForm';
import { coursesService } from '@/services/coursesService';
import { CoursePayload, CourseRecord } from '@/types/courses';
import { ChevronLeft, Loader2 } from 'lucide-react';

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

  const handleSubmit = async (data: CoursePayload) => {
    await updateMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90">Editar Curso</h1>
          <p className="text-sm text-muted-foreground font-medium">Gerencie o conteúdo, configurações e alunos matriculados.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="shadow-sm border-muted-foreground/20 hover:bg-muted font-semibold transition-all" onClick={() => navigate('/admin/school/courses')}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-96 border rounded-2xl bg-white shadow-sm gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
              <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando dados do curso...</p>
            </div>
          ) : (
            <CourseForm initialData={course} onSubmit={handleSubmit} isSubmitting={updateMutation.isPending} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}