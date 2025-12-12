import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap, TrendingUp, BookOpen } from 'lucide-react';

/**
 * StudentGrades
 * pt-BR: Página placeholder para notas/avaliações do aluno por curso/módulo.
 * en-US: Placeholder page for student grades/evaluations by course/module.
 */
export default function StudentGrades() {
  const { user } = useAuth();
  return (
    <InclusiveSiteLayout>
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas notas</h1>
          <p className="text-muted-foreground">Visualização das suas notas e avaliações (em breve)</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>Implementação futura: notas por curso, média e progresso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Usuário: {String(user?.name || '—')} • Integração com progresso e avaliações.
            </div>
          </CardContent>
        </Card>

        {/**
         * Summary cards
         * pt-BR: Cards de resumo de desempenho.
         * en-US: Performance summary cards.
         */}
        <Card>
          <CardHeader>
            <CardTitle>Desempenho</CardTitle>
            <CardDescription>Métricas gerais das suas notas (em breve)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    <CardTitle className="text-base">Média geral</CardTitle>
                  </div>
                  <CardDescription>Notas agregadas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">—</div>
                </CardContent>
              </Card>

              <Card className="p-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <CardTitle className="text-base">Progresso</CardTitle>
                  </div>
                  <CardDescription>Percentual médio</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">—</div>
                </CardContent>
              </Card>

              <Card className="p-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <CardTitle className="text-base">Cursos avaliados</CardTitle>
                  </div>
                  <CardDescription>Total com notas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">—</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </InclusiveSiteLayout>
  );
}