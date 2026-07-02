import { useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Edit, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Calendar, 
  DollarSign, 
  BookOpen, 
  Clock, 
  Filter, 
  Loader2 
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTurma } from '@/hooks/turmas';
import { coursesService } from '@/services/coursesService';
import { useEnrollmentsList, useUpdateEnrollment, useDeleteEnrollment } from '@/hooks/enrollments';
import { useEnrollmentSituationsList } from '@/hooks/enrollmentSituations';
import EnrollmentTable from '@/components/enrollments/EnrollmentTable';

/**
 * ClassDetails - Visualização de detalhes de uma turma
 * pt-BR: Exibe metadados da turma e listagem de matriculados e interessados separados.
 * en-US: Displays class metadata and separated lists of enrolled and interested students.
 */
export default function ClassDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const returnTo = `${location.pathname}${location.search || ''}`;

  // Estados de busca e paginação para Matriculados
  const [enrolledSearch, setEnrolledSearch] = useState('');
  const [enrolledPage, setEnrolledPage] = useState(1);
  const [enrolledStatus, setEnrolledStatus] = useState<string>('all');

  // Estados de busca e paginação para Interessados
  const [interestedSearch, setInterestedSearch] = useState('');
  const [interestedPage, setInterestedPage] = useState(1);

  // Busca detalhes da turma
  const { data: turma, isLoading: isTurmaLoading } = useTurma(String(id));

  // Busca curso diretamente se a relação não vier carregada
  const { data: directCourse } = useQuery({
    queryKey: ['cursos', 'detail', turma?.id_curso],
    queryFn: async () => {
      if (!turma?.id_curso) return null;
      return coursesService.getById(String(turma.id_curso));
    },
    enabled: !!turma?.id_curso && !turma?.curso,
  });

  const courseObj = turma?.curso || directCourse;

  // Busca lista de situações de matrícula para o filtro
  const { data: situationsData } = useEnrollmentSituationsList({ per_page: 200 });
  const situations = useMemo(() => {
    // Filtra para remover a situação 'int' (pois ela é para interessados)
    return (situationsData?.data ?? []).filter((s: any) => String(s.slug || s.post_name).toLowerCase() !== 'int');
  }, [situationsData]);

  // Query de Matriculados
  const enrolledParams = useMemo(() => ({
    id_turma: id,
    situacao: 'mat',
    page: enrolledPage,
    per_page: 10,
    search: enrolledSearch || undefined,
    situacao_id: enrolledStatus !== 'all' ? Number(enrolledStatus) : undefined
  }), [id, enrolledPage, enrolledSearch, enrolledStatus]);

  const { data: enrolledResp, isLoading: isEnrolledLoading, isFetching: isEnrolledFetching } = useEnrollmentsList(enrolledParams, {
    enabled: !!id,
    keepPreviousData: true,
  });

  // Query de Interessados
  const interestedParams = useMemo(() => ({
    id_turma: id,
    situacao: 'int',
    page: interestedPage,
    per_page: 10,
    search: interestedSearch || undefined
  }), [id, interestedPage, interestedSearch]);

  const { data: interestedResp, isLoading: isInterestedLoading, isFetching: isInterestedFetching } = useEnrollmentsList(interestedParams, {
    enabled: !!id,
    keepPreviousData: true,
  });

  // Mutations para ações da tabela de matrícula
  const updateEnrollmentMutation = useUpdateEnrollment({
    onSuccess: () => {
      toast({ title: 'Matrícula atualizada', description: 'Registro salvo com sucesso.' });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar', description: String(err?.message ?? 'Falha ao salvar alteração'), variant: 'destructive' });
    }
  });

  const deleteEnrollmentMutation = useDeleteEnrollment({
    onSuccess: () => {
      toast({ title: 'Matrícula excluída', description: 'Registro removido com sucesso.' });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir', description: String(err?.message ?? 'Falha ao excluir matrícula'), variant: 'destructive' });
    }
  });

  const handleToggleActive = (enroll: any, isActive: boolean) => {
    updateEnrollmentMutation.mutate({
      id: String(enroll.id),
      ativo: isActive ? 's' : 'n'
    } as any);
  };

  const handleDeleteEnrollment = (enroll: any) => {
    if (window.confirm('Tem certeza que deseja remover esta matrícula?')) {
      deleteEnrollmentMutation.mutate(String(enroll.id));
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    } catch {
      return dateStr;
    }
  };

  const formatBRL = (v?: number | string | null) => {
    const n = Number(v);
    if (isNaN(n) || v === null || v === undefined) return 'Grátis';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (isTurmaLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary/60 mb-4" />
        <p className="text-lg font-medium text-foreground/80">Carregando dados da turma...</p>
      </div>
    );
  }

  if (!turma) {
    return (
      <div className="text-center py-20 text-red-500">
        <p className="font-bold text-lg">Turma não encontrada.</p>
        <Button variant="outline" onClick={() => navigate('/admin/school/classes')} className="mt-4">
          Voltar para turmas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90">{turma.nome || 'Sem nome'}</h1>
            <Badge variant={turma.ativo === 's' ? 'default' : 'secondary'} className={turma.ativo === 's' ? 'bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20' : ''}>
              {turma.ativo === 's' ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Período: {formatDate(turma.inicio)} até {formatDate(turma.fim)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/admin/school/classes')} className="h-10 rounded-xl font-bold">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <Button onClick={() => navigate(`/admin/school/classes/${id}/edit`)} className="h-10 rounded-xl font-bold shadow-lg shadow-primary/10">
            <Edit className="h-4 w-4 mr-2" /> Editar Turma
          </Button>
        </div>
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white dark:bg-slate-950 rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Curso / Prof.</p>
                <p className="font-bold text-foreground/90 line-clamp-1">{courseObj?.titulo || courseObj?.nome || 'Nenhum curso'}</p>
                <p className="text-xs text-muted-foreground">Prof: {turma.professor || 'Não definido'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-950 rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 text-green-600 rounded-xl">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Valores</p>
                <p className="font-bold text-foreground/90">{formatBRL(turma.Valor)}</p>
                <p className="text-xs text-muted-foreground">Matrícula: {formatBRL(turma.Matricula)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-950 rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Capacidade</p>
                <p className="font-bold text-foreground/90">Máx: {turma.max_alunos ?? 0}</p>
                <p className="text-xs text-muted-foreground">Mínimo: {turma.min_alunos ?? 0} alunos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-950 rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cadastros</p>
                <p className="font-bold text-foreground/90">Matriculados: {turma.matriculados ?? 0}</p>
                <p className="text-xs text-muted-foreground">Interessados: {turma.interessados ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lists Tabs */}
      <Tabs defaultValue="enrolled" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 h-12 bg-slate-100/80 dark:bg-slate-900/50 p-1 rounded-2xl mb-6">
          <TabsTrigger value="enrolled" className="rounded-xl font-bold">
            Matriculados ({turma.matriculados ?? 0})
          </TabsTrigger>
          <TabsTrigger value="interested" className="rounded-xl font-bold">
            Interessados ({turma.interessados ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enrolled" className="space-y-6 m-0 outline-none">
          <Card className="border-none shadow-sm bg-white dark:bg-slate-950 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Alunos Matriculados</CardTitle>
                  <CardDescription>Estudantes vinculados a esta turma (não interessados)</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={enrolledSearch}
                      onChange={(e) => { setEnrolledSearch(e.target.value); setEnrolledPage(1); }}
                      className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-none w-full"
                      placeholder="Buscar por nome ou email..."
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
                    <Select value={enrolledStatus} onValueChange={(v) => { setEnrolledStatus(v); setEnrolledPage(1); }}>
                      <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-medium text-xs">
                        <SelectValue placeholder="Situação" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">Todas as situações</SelectItem>
                        {situations.map((sit: any) => (
                          <SelectItem key={sit.id} value={String(sit.id)}>{sit.name || sit.label || sit.post_title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <EnrollmentTable
                items={enrolledResp?.data ?? []}
                isLoading={isEnrolledLoading}
                isFetching={isEnrolledFetching}
                resolveAmountBRL={(item) => formatBRL(item.total ?? item.subtotal ?? item.amount_brl)}
                onToggleActive={handleToggleActive}
                onDelete={handleDeleteEnrollment}
                onView={(enroll) => navigate(`/admin/school/enrollments/view/${enroll.id}`, { state: { returnTo } })}
                onEdit={(enroll, tab) => {
                  const query = tab ? `?tab=${tab}` : '';
                  navigate(`/admin/sales/proposals/edit/${enroll.id}${query}`, { state: { returnTo } });
                }}
              />

              {/* Pagination */}
              {enrolledResp && enrolledResp.last_page > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Total: {enrolledResp.total} matrículas
                  </span>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-1 shadow-sm">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setEnrolledPage(p => Math.max(1, p - 1))} disabled={enrolledPage <= 1 || isEnrolledFetching}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-bold px-2">
                      Página {enrolledPage} de {enrolledResp.last_page}
                    </span>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setEnrolledPage(p => Math.min(enrolledResp.last_page, p + 1))} disabled={enrolledPage >= enrolledResp.last_page || isEnrolledFetching}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interested" className="space-y-6 m-0 outline-none">
          <Card className="border-none shadow-sm bg-white dark:bg-slate-950 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Interessados / Leads</CardTitle>
                  <CardDescription>Registros em estágio de captação (situação "int")</CardDescription>
                </div>
                <div className="relative w-full md:w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={interestedSearch}
                    onChange={(e) => { setInterestedSearch(e.target.value); setInterestedPage(1); }}
                    className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-none w-full"
                    placeholder="Buscar interessados..."
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <EnrollmentTable
                items={interestedResp?.data ?? []}
                isLoading={isInterestedLoading}
                isFetching={isInterestedFetching}
                resolveAmountBRL={(item) => formatBRL(item.total ?? item.subtotal ?? item.amount_brl)}
                onToggleActive={handleToggleActive}
                onDelete={handleDeleteEnrollment}
                onView={(enroll) => navigate(`/admin/school/enrollments/view/${enroll.id}`, { state: { returnTo } })}
                onEdit={(enroll, tab) => {
                  const query = tab ? `?tab=${tab}` : '';
                  navigate(`/admin/sales/proposals/edit/${enroll.id}${query}`, { state: { returnTo } });
                }}
              />

              {/* Pagination */}
              {interestedResp && interestedResp.last_page > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Total: {interestedResp.total} interessados
                  </span>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-1 shadow-sm">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setInterestedPage(p => Math.max(1, p - 1))} disabled={interestedPage <= 1 || isInterestedFetching}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-bold px-2">
                      Página {interestedPage} de {interestedResp.last_page}
                    </span>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setInterestedPage(p => Math.min(interestedResp.last_page, p + 1))} disabled={interestedPage >= interestedResp.last_page || isInterestedFetching}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
