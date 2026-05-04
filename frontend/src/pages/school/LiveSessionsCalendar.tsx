import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, ChevronRight, Plus, Loader2, Video, ExternalLink,
  Pencil, Trash2, CalendarDays, BookOpen, Users, Copy, Eye, ClipboardCheck
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { coursesService } from '@/services/coursesService';
import { turmasService } from '@/services/turmasService';
import { liveSessionsService } from '@/services/liveSessionsService';
import { LiveSessionModal } from '@/components/school/LiveSessionModal';
import { CloneLiveSessionsModal } from '@/components/school/CloneLiveSessionsModal';
import { AttendanceModal } from '@/components/school/AttendanceModal';
import type { LiveSessionRecord, LiveSessionPayload } from '@/types/liveSessions';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function getDaysInMonth(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days: Date[] = [];
  // Padding início
  for (let i = 0; i < first.getDay(); i++) {
    const d = new Date(year, month, -i);
    days.unshift(d);
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  // Padding fim (completar 6 semanas = 42 células)
  while (days.length < 42) {
    const last_ = days[days.length - 1];
    days.push(new Date(last_.getTime() + 86400000));
  }
  return days;
}

function toLocalDateStr(date: Date) {
  return date.toISOString().substring(0, 10);
}

function formatTime(iso: string) {
  return iso.substring(11, 16);
}

const STATUS_STYLES: Record<string, string> = {
  agendado:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  ao_vivo:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  encerrado: 'bg-slate-100 text-slate-500',
  cancelado: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  agendado:  'Agendado',
  ao_vivo:   'Ao Vivo',
  encerrado: 'Encerrado',
  cancelado: 'Cancelado',
};

/**
 * LiveSessionsCalendar — Calendário de aulas ao vivo para o administrador.
 * pt-BR: Seleciona curso e turma, exibe grade mensal e permite CRUD de sessões.
 * en-US: Selects course and class group, shows monthly grid and allows session CRUD.
 */
export default function LiveSessionsCalendar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Estado do calendário ─────────────────────────────────────────────────
  const today    = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // ── Filtros ──────────────────────────────────────────────────────────────
  const [selectedCurso, setSelectedCurso] = useState<string>('');
  const [selectedTurma, setSelectedTurma] = useState<string>('');

  // ── Modal ────────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]       = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [editRecord, setEditRecord]     = useState<LiveSessionRecord | null>(null);
  const [clickedDate, setClickedDate]   = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<LiveSessionRecord | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<LiveSessionRecord | null>(null);

  // ── Navegar mês ──────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else                 { setViewMonth(m => m - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else                  { setViewMonth(m => m + 1); }
  };

  // ── Queries ──────────────────────────────────────────────────────────────
  const coursesQuery = useQuery({
    queryKey: ['cursos', 'list', 200],
    queryFn: () => coursesService.listCourses({ page: 1, per_page: 200 }),
  });

  const turmasQuery = useQuery({
    queryKey: ['turmas', 'list', selectedCurso],
    queryFn: () => turmasService.listTurmas({ id_curso: Number(selectedCurso), per_page: 200 }),
    enabled: !!selectedCurso,
  });

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay  = new Date(viewYear, viewMonth + 1, 0);

  const sessionsQuery = useQuery({
    queryKey: ['live-sessions', viewYear, viewMonth, selectedCurso, selectedTurma],
    queryFn: () => liveSessionsService.listSessions({
      id_curso: selectedCurso || undefined,
      id_turma: selectedTurma || undefined,
      de: firstDay.toISOString().substring(0, 10),
      ate: lastDay.toISOString().substring(0, 10) + 'T23:59:59',
      per_page: 200,
    }),
  });

  // ── Map: data → sessões ──────────────────────────────────────────────────
  const sessionsByDate = useMemo(() => {
    const map: Record<string, LiveSessionRecord[]> = {};
    (sessionsQuery.data?.data ?? []).forEach(s => {
      const day = s.inicio.substring(0, 10);
      if (!map[day]) map[day] = [];
      map[day].push(s);
    });
    return map;
  }, [sessionsQuery.data]);

  // ── Mutations ────────────────────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['live-sessions'] });

  const createMutation = useMutation({
    mutationFn: (data: LiveSessionPayload) => liveSessionsService.createSession(data),
    onSuccess: () => { toast({ title: '✅ Aula criada com sucesso!' }); invalidate(); setModalOpen(false); },
    onError:   (e: any) => toast({ title: 'Erro ao criar aula', description: e?.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: LiveSessionPayload }) =>
      liveSessionsService.updateSession(id, data),
    onSuccess: () => { toast({ title: '✅ Aula atualizada!' }); invalidate(); setModalOpen(false); setEditRecord(null); },
    onError:   (e: any) => toast({ title: 'Erro ao atualizar', description: e?.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => liveSessionsService.deleteSession(id),
    onSuccess: () => { toast({ title: 'Aula removida.' }); invalidate(); setDeleteTarget(null); },
    onError:   (e: any) => toast({ title: 'Erro ao excluir', description: e?.message, variant: 'destructive' }),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDayClick = useCallback((dateStr: string) => {
    setEditRecord(null);
    setClickedDate(dateStr);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((s: LiveSessionRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditRecord(s);
    setClickedDate(s.inicio.substring(0, 10));
    setModalOpen(true);
  }, []);

  const handleSave = async (data: LiveSessionPayload) => {
    if (editRecord) {
      await updateMutation.mutateAsync({ id: editRecord.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Dados para os selects ─────────────────────────────────────────────────
  const courseOptions = useMemo(
    () => (coursesQuery.data?.data ?? []).map((c: any) => ({ id: String(c.id), nome: c.nome ?? String(c.id) })),
    [coursesQuery.data]
  );

  const turmaOptions = useMemo(
    () => (turmasQuery.data?.data ?? []).map((t: any) => ({ id: String(t.id), nome: t.nome ?? String(t.id) })),
    [turmasQuery.data]
  );

  const selectedCourseNome = courseOptions.find(c => c.id === selectedCurso)?.nome;
  const selectedTurmaNome  = turmaOptions.find(t => t.id === selectedTurma)?.nome;

  // ── Grade do calendário ───────────────────────────────────────────────────
  const calDays = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayStr = toLocalDateStr(today);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ─── Cabeçalho ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90 flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-primary" />
            Agenda de Aulas ao Vivo
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Selecione o curso e a turma para visualizar e gerenciar as aulas agendadas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCurso && (
            <Link
              to={`/aluno/agenda-ao-vivo${selectedCurso ? `/${selectedCurso}` : ''}${selectedTurma && selectedTurma !== 'all' ? `/${selectedTurma}` : ''}`}
              target="_blank"
              className="inline-flex items-center justify-center whitespace-nowrap h-11 px-4 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Eye className="h-4 w-4 mr-2 text-indigo-500" />
              Visão do Aluno
            </Link>
          )}
          <Button
            onClick={() => { setEditRecord(null); setClickedDate(todayStr); setModalOpen(true); }}
            disabled={!selectedCurso}
            className="shadow-lg shadow-primary/20 font-bold h-11 px-6 rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" /> Nova Aula
          </Button>
        </div>
      </div>

      {/* ─── Filtros ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-white/60 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm backdrop-blur-sm">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" /> Curso
          </label>
          <Select
            value={selectedCurso}
            onValueChange={v => { setSelectedCurso(v); setSelectedTurma(''); }}
          >
            <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-900">
              <SelectValue placeholder="Selecione um curso..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {courseOptions.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 flex flex-col justify-end">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Turma
            </label>
            {selectedTurma && selectedTurma !== 'all' && (
              <button
                onClick={() => setCloneModalOpen(true)}
                className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full"
                title="Clonar aulas para outra turma"
              >
                <Copy className="w-3 h-3" /> Clonar Agenda
              </button>
            )}
          </div>
          <Select
            value={selectedTurma}
            onValueChange={setSelectedTurma}
            disabled={!selectedCurso}
          >
            <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-900">
              <SelectValue placeholder={selectedCurso ? 'Selecione uma turma...' : 'Selecione um curso primeiro'} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todas as turmas</SelectItem>
              {turmaOptions.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── Calendário ─────────────────────────────────────────────── */}
      <div className="bg-white/60 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden backdrop-blur-sm">

        {/* Navegação do mês */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-foreground/90">
              {MONTHS_PT[viewMonth]} {viewYear}
            </h2>
            {sessionsQuery.isFetching && <Loader2 className="w-4 h-4 animate-spin text-primary/50" />}
          </div>

          <button
            onClick={nextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Cabeçalho dos dias */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
          {DAYS_SHORT.map(d => (
            <div key={d} className="text-center text-xs font-extrabold uppercase tracking-widest py-3 text-muted-foreground/70">
              {d}
            </div>
          ))}
        </div>

        {/* Grade de dias */}
        <div className="grid grid-cols-7">
          {calDays.map((day, idx) => {
            const dateStr     = toLocalDateStr(day);
            const isToday     = dateStr === todayStr;
            const isCurMonth  = day.getMonth() === viewMonth;
            const daySessions = sessionsByDate[dateStr] ?? [];

            return (
              <div
                key={idx}
                onClick={() => isCurMonth && selectedCurso && handleDayClick(dateStr)}
                className={[
                  'min-h-[110px] p-2 border-b border-r border-slate-100 dark:border-slate-800/60 transition-colors relative group',
                  isCurMonth && selectedCurso
                    ? 'cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10'
                    : 'cursor-default',
                  !isCurMonth ? 'opacity-30 bg-slate-50/50 dark:bg-slate-900/20' : '',
                ].join(' ')}
              >
                {/* Número do dia */}
                <div className={[
                  'w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mb-1.5 transition-colors',
                  isToday
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                    : 'text-foreground/80',
                ].join(' ')}>
                  {day.getDate()}
                </div>

                {/* Hint de "+ Adicionar" no hover */}
                {isCurMonth && selectedCurso && daySessions.length === 0 && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-semibold text-primary/60 flex items-center gap-0.5">
                      <Plus className="w-2.5 h-2.5" /> Adicionar
                    </span>
                  </div>
                )}

                {/* Eventos do dia */}
                <div className="space-y-1 mt-0.5">
                  {daySessions.slice(0, 3).map(s => (
                    <div
                      key={s.id}
                      onClick={e => e.stopPropagation()}
                      className="group/ev relative rounded-lg px-2 py-1 text-xs font-semibold flex items-center gap-1.5 overflow-hidden cursor-default"
                      style={{ backgroundColor: s.cor + '22', color: s.cor }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.cor }}
                      />
                      <span className="truncate flex-1">{formatTime(s.inicio)} {s.titulo}</span>

                      <div className="hidden group-hover/ev:flex items-center gap-1 absolute right-0.5 top-0.5 bottom-0.5 px-1.5 rounded-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-sm border border-slate-200 dark:border-slate-700">
                        <button
                          onClick={e => { e.stopPropagation(); setAttendanceSession(s); }}
                          className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                          title="Lista de Presença"
                        >
                          <ClipboardCheck className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => handleEdit(s, e)}
                          className="p-1 rounded text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteTarget(s); }}
                          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {daySessions.length > 3 && (
                    <div className="text-[10px] font-semibold text-muted-foreground pl-1">
                      +{daySessions.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Lista de sessões do mês ─────────────────────────────────── */}
      {(sessionsQuery.data?.data ?? []).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground/70">
            Sessões em {MONTHS_PT[viewMonth]}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(sessionsQuery.data?.data ?? []).map(s => (
              <div
                key={s.id}
                className="flex items-start gap-4 p-4 bg-white/60 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow backdrop-blur-sm group"
              >
                {/* Color dot */}
                <div
                  className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm mt-0.5"
                  style={{ backgroundColor: s.cor + '20' }}
                >
                  <Video className="w-5 h-5" style={{ color: s.cor }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-sm text-foreground/90 truncate">{s.titulo}</p>
                    <Badge className={`text-[10px] font-bold px-2 py-0 flex-shrink-0 ${STATUS_STYLES[s.status]}`}>
                      {STATUS_LABELS[s.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(s.inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    {' às '}
                    {formatTime(s.inicio)}
                    {s.duracao_minutos ? ` · ${s.duracao_minutos} min` : ''}
                  </p>
                  {s.link && (
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary font-semibold flex items-center gap-1 mt-1 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Abrir link
                    </a>
                  )}
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => handleEdit(s, e)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(s)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Estado vazio ────────────────────────────────────────────── */}
      {!selectedCurso && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <CalendarDays className="w-14 h-14 mb-4 opacity-15" />
          <p className="font-bold text-base text-foreground/50">Selecione um curso para visualizar a agenda</p>
          <p className="text-sm opacity-70 mt-1">Escolha o curso e a turma nos filtros acima.</p>
        </div>
      )}

      {/* ─── Modal de criação/edição ─────────────────────────────────── */}
      <LiveSessionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditRecord(null); }}
        onSave={handleSave}
        isSaving={isSaving}
        defaultDate={clickedDate}
        editRecord={editRecord}
        courseNome={selectedCourseNome}
        turmaNome={selectedTurmaNome}
        idCurso={selectedCurso ? Number(selectedCurso) : null}
        idTurma={selectedTurma === 'all' || !selectedTurma ? null : Number(selectedTurma)}
      />

      {/* ─── Modal de Clonagem ──────────────────────────────────────── */}
      <CloneLiveSessionsModal
        open={cloneModalOpen}
        onClose={() => setCloneModalOpen(false)}
        idCurso={selectedCurso}
        idTurmaOrigem={selectedTurma}
        turmaOrigemNome={selectedTurmaNome}
      />

      {/* ─── Confirmação de exclusão ─────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aula ao vivo?</AlertDialogTitle>
            <AlertDialogDescription>
              A aula <strong>{deleteTarget?.titulo}</strong> será removida permanentemente da agenda.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-500 hover:bg-red-600"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AttendanceModal
        open={!!attendanceSession}
        onOpenChange={(open) => !open && setAttendanceSession(null)}
        session={attendanceSession}
      />
    </div>
  );
}
