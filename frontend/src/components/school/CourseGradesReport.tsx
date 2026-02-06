import React, { useEffect, useState } from 'react';
import { progressService } from '@/services/progressService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface GradeItem {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  activity_id: number;
  activity_title: string;
  score: number;
  completed_at: string;
}

export function CourseGradesReport({ courseId }: { courseId: string | number }) {
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    progressService.getCourseGrades(courseId)
      .then(data => setGrades(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;

  return (
    <Card>
        <CardHeader>
            <CardTitle className="text-lg">Desempenho dos Alunos (Notas)</CardTitle>
        </CardHeader>
        <CardContent>
            {grades.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma nota registrada para este curso.</p>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Aluno</TableHead>
                                <TableHead>Atividade</TableHead>
                                <TableHead>Nota (%)</TableHead>
                                <TableHead>Data</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {grades.map(g => (
                                <TableRow key={g.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{g.student_name}</span>
                                            <span className="text-xs text-muted-foreground">{g.student_email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">{g.activity_title}</TableCell>
                                    <TableCell>
                                        <div className={`font-bold ${g.score >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                                            {g.score}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(g.completed_at).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
