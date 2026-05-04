import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Video, ExternalLink, Clock, CalendarDays, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { liveSessionsService } from '@/services/liveSessionsService';
import type { LiveSessionRecord } from '@/types/liveSessions';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function getDaysInMonth(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const days: Date[] = [];
  for (let i = 0; i < first.getDay(); i++) {
    days.unshift(new Date(year, month, -i));
  }
  const last = new Date(year, month + 1, 0);
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  while (days.length < 42) {
    days.push(new Date(days[days.length - 1].getTime() + 86400000));
  }
  return days;
}

function toLocalStr(d: Date) { return d.toISOString().substring(0, 10); }
function fmtTime(iso: string) { return iso.substring(11, 16); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });
}

/**
 * StudentLiveCalendar — Calendário de aulas ao vivo para alunos.
 * pt-BR: Exibe a agenda de sessões ao vivo de um curso/turma para o aluno.
 * en-US: Displays the live session schedule of a course/class for the student.
 */
export default function StudentLiveCalendar() {
  const { courseId, turmaId } = useParams<{ courseId?: string; turmaId?: string }>();

  const today    = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected]   = useState<string | null>(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else                 { setViewMonth(m => m - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else                  { setViewMonth(m => m + 1); }
  };

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay  = new Date(viewYear, viewMonth + 1, 0);

  const sessionsQuery = useQuery({
    queryKey: ['live-sessions', 'student', viewYear, viewMonth, courseId, turmaId],
    queryFn: () => liveSessionsService.listSessions({
      id_curso: courseId,
      id_turma: turmaId,
      de: firstDay.toISOString().substring(0, 10),
      ate: lastDay.toISOString().substring(0, 10) + 'T23:59:59',
      per_page: 200,
    }),
    staleTime: 2 * 60 * 1000,
  });

  const sessionsByDate = useMemo(() => {
    const map: Record<string, LiveSessionRecord[]> = {};
    (sessionsQuery.data?.data ?? []).forEach(s => {
      const day = s.inicio.substring(0, 10);
      if (!map[day]) map[day] = [];
      map[day].push(s);
    });
    return map;
  }, [sessionsQuery.data]);

  const calDays   = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayStr  = toLocalStr(today);
  const selectedSessions = selected ? (sessionsByDate[selected] ?? []) : [];

  return (
    <InclusiveSiteLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-black/50 py-8 transition-colors duration-500">
        <div className="container mx-auto max-w-5xl px-4 space-y-8">
          <div className="space-y-6 animate-in fade-in duration-500">

      {/* ─── Título ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground/90 flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-primary" />
            Agenda de Aulas ao Vivo
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Clique em um dia para ver as aulas agendadas.
          </p>
        </div>
        {sessionsQuery.isFetching && <Loader2 className="w-5 h-5 animate-spin text-primary/40" />}
      </div>

      {/* ─── Grid de Calendário ──────────────────────────────────────── */}
      <div className="bg-white/60 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden backdrop-blur-sm">

        {/* Navegação */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-xl">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-extrabold text-foreground/90">
            {MONTHS_PT[viewMonth]} {viewYear}
          </h3>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-xl">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Cabeçalhos */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
          {DAYS_SHORT.map(d => (
            <div key={d} className="text-center text-[11px] font-extrabold uppercase py-2 text-muted-foreground/60 tracking-widest">
              {d}
            </div>
          ))}
        </div>

        {/* Dias */}
        <div className="grid grid-cols-7">
          {calDays.map((day, idx) => {
            const dateStr    = toLocalStr(day);
            const isToday    = dateStr === todayStr;
            const isCurrent  = day.getMonth() === viewMonth;
            const isSelected = selected === dateStr;
            const hasSessions = (sessionsByDate[dateStr] ?? []).length > 0;

            return (
              <div
                key={idx}
                onClick={() => isCurrent && setSelected(isSelected ? null : dateStr)}
                className={[
                  'h-20 p-2 border-b border-r border-slate-100 dark:border-slate-800/60 transition-colors relative',
                  isCurrent ? 'cursor-pointer' : 'cursor-default opacity-25 bg-slate-50/30 dark:bg-slate-900/10',
                  isSelected ? 'bg-primary/10 dark:bg-primary/20' : isCurrent ? 'hover:bg-slate-50 dark:hover:bg-slate-900/50' : '',
                ].join(' ')}
              >
                <div className={[
                  'w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold',
                  isToday ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30' : 'text-foreground/80',
                  isSelected && !isToday ? 'ring-2 ring-primary ring-offset-1' : '',
                ].join(' ')}>
                  {day.getDate()}
                </div>

                {/* Indicadores de sessões */}
                {hasSessions && isCurrent && (
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {(sessionsByDate[dateStr] ?? []).slice(0, 3).map(s => (
                      <span
                        key={s.id}
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.cor }}
                        title={s.titulo}
                      />
                    ))}
                    {(sessionsByDate[dateStr] ?? []).length > 3 && (
                      <span className="text-[9px] font-bold text-muted-foreground">+{(sessionsByDate[dateStr] ?? []).length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Detalhe do dia selecionado ───────────────────────────────── */}
      {selected && (
        <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-3">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground/70 capitalize">
            {fmtDate(selected + 'T12:00:00')}
          </h3>

          {selectedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground bg-white/50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <CalendarDays className="w-10 h-10 mb-3 opacity-20" />
              <p className="font-semibold text-foreground/50">Nenhuma aula agendada neste dia.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedSessions.map(s => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Próximas sessões (lista resumida) ───────────────────────── */}
      {!selected && (
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground/70">
            Próximas Aulas em {MONTHS_PT[viewMonth]}
          </h3>
          {sessionsQuery.isLoading ? (
            <div className="flex items-center gap-3 py-4 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Carregando agenda...</span>
            </div>
          ) : (sessionsQuery.data?.data ?? []).filter(s => s.inicio >= todayStr).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground bg-white/50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <CalendarDays className="w-10 h-10 mb-3 opacity-20" />
              <p className="font-semibold text-foreground/50">Nenhuma aula agendada este mês.</p>
            </div>
          ) : (
            (sessionsQuery.data?.data ?? [])
              .filter(s => s.inicio.substring(0, 10) >= todayStr)
              .slice(0, 5)
              .map(s => <SessionCard key={s.id} session={s} />)
          )}
        </div>
      )}
    </div>
        </div>
      </div>
    </InclusiveSiteLayout>
  );
}

// ─── Sub-componente de card de sessão ─────────────────────────────────────────
function SessionCard({ session: s }: { session: LiveSessionRecord }) {
  const isLive = s.status === 'ao_vivo';
  const isFuture = new Date(s.inicio) > new Date();

  return (
    <div
      className="flex items-start gap-4 p-4 bg-white/70 dark:bg-slate-950/70 rounded-2xl border shadow-sm hover:shadow-md transition-all backdrop-blur-sm"
      style={{ borderColor: s.cor + '40' }}
    >
      {/* Ícone com cor */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
        style={{ backgroundColor: s.cor + '20' }}
      >
        {isLive
          ? <span className="relative flex"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ backgroundColor: s.cor }} /><span className="relative w-3 h-3 rounded-full" style={{ backgroundColor: s.cor }} /></span>
          : <Video className="w-6 h-6" style={{ color: s.cor }} />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-bold text-base text-foreground/90">{s.titulo}</span>
          {isLive && (
            <Badge className="bg-green-500 text-white text-[10px] font-bold animate-pulse">AO VIVO</Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            {new Date(s.inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            {' às '}{fmtTime(s.inicio)}
          </span>
          {s.duracao_minutos && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {s.duracao_minutos} min
            </span>
          )}
        </div>

        {s.descricao && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{s.descricao}</p>
        )}
      </div>

      {/* Botão de acesso */}
      {s.link && (isLive || isFuture) && (
        <a
          href={s.link}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
            isLive
              ? 'bg-green-500 text-white hover:bg-green-600 shadow-md shadow-green-500/30'
              : 'text-primary border-2 hover:bg-primary/10'
          }`}
          style={!isLive ? { borderColor: s.cor + '60', color: s.cor } : {}}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {isLive ? 'Entrar Agora' : 'Acessar Link'}
        </a>
      )}
    </div>
  );
}
