import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Users, 
  UserPlus, 
  Eraser,
  Sparkles,
  LayoutGrid,
  Target
} from 'lucide-react';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { useQuery } from '@tanstack/react-query';
import { coursesService } from '@/services/coursesService';
import { useTurmasList } from '@/hooks/turmas';
import { useDebounce } from '@/hooks/useDebounce';
import { useEnrollmentsList, useDeleteEnrollment, useUpdateEnrollment } from '@/hooks/enrollments';
import { useEnrollmentSituationsList } from '@/hooks/enrollmentSituations';
import { toast } from '@/hooks/use-toast';
import EnrollmentTable from '@/components/enrollments/EnrollmentTable';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Enroll
 * pt-BR: Página de listagem de matrículas modernizada com visual premium.
 * en-US: Modernized Enrollments listing page with premium visuals.
 */
export default function Enroll() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search || ''}`;
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [studentFilter, setStudentFilter] = useState<string>('');
  
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [courseSearch, setCourseSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [selectedSituationId, setSelectedSituationId] = useState<string>('');

  /**
   * situationsQuery
   */
  const { data: situationsData, isLoading: isLoadingSituations } =
    useEnrollmentSituationsList({
      page: 1,
      per_page: 200,
      skip_first: true,
      order_by: 'ID',
      order: 'asc',
    } as any);

  const situationOptions = useMemo(() => {
    const arr = (situationsData?.data || []) as any[];
    const list = arr.map((s) => ({ 
      value: String(s?.id ?? s?.value ?? s?.sigla ?? ''), 
      label: s?.label || s?.name || s?.nome || s?.description || `Situação ${String(s?.id ?? '')}`
    }));
    return list.length ? list : [
      { value: 'mat', label: 'Matriculados' },
      { value: 'int', label: 'Interessados' },
    ];
  }, [situationsData]);

  const resolveSituationLabel = (id?: string) => {
    const opt = situationOptions.find((o) => o.value === id);
    return opt ? opt.label : id || '-';
  };

  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');

  const debouncedSearch = useDebounce(search, 300);

  const clearFilters = () => {
    setSelectedCourseId('');
    setSelectedClassId('');
    setCourseSearch('');
    setClassSearch('');
    setStudentFilter('');
    setSearch('');
    setSelectedSituationId('');
    setPage(1);
  };

  const listParams = useMemo(() => ({ 
    page, 
    per_page: perPage, 
    search: debouncedSearch || undefined,
    id_curso: selectedCourseId ? Number(selectedCourseId) : undefined,
    id_turma: selectedClassId ? Number(selectedClassId) : undefined,
    student: studentFilter || undefined,
    situacao_id: selectedSituationId || undefined,
  }), [page, perPage, debouncedSearch, selectedCourseId, selectedClassId, studentFilter, selectedSituationId]);

  const { data: enrollmentsResp, isLoading, isFetching, error } = useEnrollmentsList(listParams, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const deleteMutation = useDeleteEnrollment({
    onSuccess: () => {
      toast({ title: 'Matrícula excluída', description: 'A matrícula foi removida com sucesso.' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    },
  });

  const updateMutation = useUpdateEnrollment({
    onSuccess: () => {
      toast({ title: 'Matrícula atualizada', description: 'Dados salvos com sucesso.' });
      setEditOpen(false);
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar', description: err?.message || 'Verifique os campos.', variant: 'destructive' });
    },
  });

  const formatBRL = (v?: number | string | null) => {
    if (v === undefined || v === null) return '-';
    if (typeof v === 'number') {
      return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    const s = String(v).trim();
    if (!s) return '-';
    // If it has a comma, assume pt-BR format (e.g. 1.234,56 or 150,00)
    if (s.includes(',')) {
      const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
      return isNaN(n) ? '-' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    // If no comma, assume standard float (e.g. 1234.56 or 150)
    const n = parseFloat(s);
    return isNaN(n) ? '-' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const resolveAmountBRL = (enroll: any) => {
    const amount = enroll?.meta?.gera_valor_preco ?? enroll?.total ?? enroll?.subtotal ?? null;
    return formatBRL(amount);
  };

  const coursesQuery = useQuery({
    queryKey: ['cursos', 'list', 200, courseSearch],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 200, search: courseSearch }),
    staleTime: 5 * 60 * 1000,
  });
  const courseItems = (coursesQuery.data?.data || []) as any[];
  const courseOptions = useComboboxOptions(courseItems, 'id', 'nome', undefined, (c: any) => String(c?.titulo || ''));

  const classesQuery = useTurmasList({ page: 1, per_page: 200, search: classSearch, id_curso: selectedCourseId ? Number(selectedCourseId) : undefined }, {
    staleTime: 5 * 60 * 1000,
  });
  const classItems = (classesQuery.data?.data || []) as any[];
  const classOptions = useComboboxOptions(classItems, 'id', 'nome', undefined, (t: any) => String(t?.token || ''));

  const enrollments = useMemo(() => enrollmentsResp?.data || [], [enrollmentsResp]);
  const currentPage = enrollmentsResp?.current_page ?? 1;
  const lastPage = enrollmentsResp?.last_page ?? 1;
  const total = enrollmentsResp?.total ?? enrollments.length;

  const buildFiltersLegend = () => {
    const parts: string[] = [];
    if (selectedSituationId) parts.push(resolveSituationLabel(selectedSituationId));
    if (selectedCourseId) parts.push('Curso ativo');
    if (selectedClassId) parts.push('Turma ativa');
    if (studentFilter?.trim()) parts.push(`Aluno: ${studentFilter}`);
    return parts.length ? parts.join(' • ') : 'Nenhum filtro aplicado';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground/60">
            <Users className="h-3 w-3" />
            Escola
            <span className="text-primary/40">•</span>
            <span className="text-primary italic">Matrículas</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            Gestão de Alunos
          </h1>
          <p className="text-sm font-medium text-muted-foreground">Monitore o desempenho e status acadêmico da sua instituição.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full lg:w-auto items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/school/interested')}
            className="h-12 w-full sm:w-auto rounded-xl border-slate-200 font-bold px-6 hover:bg-slate-50 transition-all gap-2"
          >
            <UserPlus className="h-4 w-4 text-primary" />
            Interessados
          </Button>
          <div className="relative group w-full lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Pesquisar por aluno, curso ou ID..."
              className="h-12 pl-11 rounded-xl border-slate-200 bg-white/40 group-hover:bg-white focus:bg-white transition-all shadow-sm focus:ring-4 focus:ring-primary/10 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="space-y-6">
        {/* Filters Card */}
        <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <Filter className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-black tracking-tight">Filtros Avançados</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{buildFiltersLegend()}</CardDescription>
                </div>
              </div>
              {(selectedSituationId || selectedCourseId || selectedClassId || studentFilter || search) && (
                <Button variant="ghost" size="sm" className="h-9 px-4 rounded-lg font-bold text-xs text-red-500 hover:text-red-600 hover:bg-red-50 transition-all gap-2" onClick={clearFilters}>
                  <Eraser className="h-3.5 w-3.5" />
                  Limpar Todos
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Situação */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Situação</Label>
                <Select
                  value={selectedSituationId || undefined}
                  onValueChange={(v) => { setSelectedSituationId(v === '__all__' ? '' : v); setPage(1); }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white/40 hover:bg-white transition-all font-bold">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="Todas as situações" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="__all__" className="font-bold">Todas as situações</SelectItem>
                    {situationOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="font-bold">{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Curso */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Curso</Label>
                <Combobox
                  options={courseOptions}
                  value={selectedCourseId}
                  onValueChange={(val) => { 
                    setSelectedCourseId(val); 
                    setSelectedClassId(''); 
                    setPage(1); 
                  }}
                  placeholder="Selecione o curso"
                  disabled={coursesQuery.isLoading}
                  className="h-11 rounded-xl border-slate-200 bg-white/40 hover:bg-white transition-all"
                />
              </div>

              {/* Turma */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Turma</Label>
                <Combobox
                  options={classOptions}
                  value={selectedClassId}
                  onValueChange={(val) => { setSelectedClassId(val); setPage(1); }}
                  placeholder={selectedCourseId ? 'Turmas do curso' : 'Selecione a turma'}
                  disabled={classesQuery.isLoading}
                  className="h-11 rounded-xl border-slate-200 bg-white/40 hover:bg-white transition-all"
                />
              </div>

              {/* Aluno */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identificação do Aluno</Label>
                <div className="relative group">
                   <Input 
                    placeholder="Nome ou Email..." 
                    value={studentFilter} 
                    onChange={(e) => setStudentFilter(e.target.value)} 
                    className="h-11 pl-10 rounded-xl border-slate-200 bg-white/40 hover:bg-white transition-all font-bold"
                  />
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary" />
              <span className="text-sm font-black uppercase tracking-widest text-foreground/80">Resultados da Listagem</span>
              <Badge variant="outline" className="ml-2 bg-primary/5 text-primary border-none font-bold text-[10px]">{total} registros</Badge>
            </div>
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary/40" />}
          </div>

          <EnrollmentTable
            items={enrollments}
            isLoading={isLoading}
            resolveAmountBRL={resolveAmountBRL}
            onProgress={(enroll: any) => {
              const courseId = String(selectedCourseId || enroll?.id_curso || enroll?.course_id || '');
              navigate(`/admin/school/courses/${courseId || 'curso'}/progress`);
            }}
            onView={(enroll: any) => navigate(`/admin/sales/proposals/view/${String(enroll.id)}`, { state: { returnTo } })}
            onEdit={(enroll: any) => navigate(`/admin/sales/proposals/edit/${String(enroll.id)}`, { state: { returnTo } })}
            onGenerateCertificate={(enroll: any) => navigate(`/admin/school/certificados/gerar?id=${String(enroll?.id ?? '')}`)}
            onDelete={(enroll: any) => { setSelected(enroll); setDeleteOpen(true); }}
          />

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 px-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || isFetching}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="px-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Página <span className="text-foreground">{currentPage}</span> de {lastPage}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all"
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  disabled={currentPage >= lastPage || isFetching}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Exibição</span>
                <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-10 w-24 rounded-xl border-slate-200 font-bold bg-white/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="10" className="font-bold">10 itens</SelectItem>
                    <SelectItem value="20" className="font-bold">20 itens</SelectItem>
                    <SelectItem value="50" className="font-bold">50 itens</SelectItem>
                    <SelectItem value="100" className="font-bold">100 itens</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete alert */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-8">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-red-600">Excluir Matrícula?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium text-muted-foreground">
              Esta ação removerá todos os registros associados à matrícula <span className="text-foreground font-bold">#{selected?.id}</span>. Este processo é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 rounded-xl border-slate-200 font-bold px-6">Manter Registro</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selected?.id) return;
                deleteMutation.mutate(String(selected.id), {
                  onSettled: () => setDeleteOpen(false),
                });
              }}
              className="h-12 rounded-xl bg-red-600 hover:bg-red-700 font-black px-8 shadow-lg shadow-red-200 transition-all active:scale-95"
            >
              Excluir Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}