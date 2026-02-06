import { useParams, useNavigate } from 'react-router-dom';
import { CourseGradesReport } from '@/components/school/CourseGradesReport';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function AdminCourseGrades() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 space-y-6">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Relatório de Notas</h1>
       </div>
       <CourseGradesReport courseId={id || ''} />
    </div>
  );
}
