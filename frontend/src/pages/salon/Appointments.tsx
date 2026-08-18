import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InputMask, format as formatMask } from '@react-input/mask';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2, Plus, UserPlus, Wrench, Pencil, MessageCircle, Copy } from 'lucide-react';
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useUpdateAppointmentStatus,
  useDeleteAppointment,
} from '@/hooks/appointments';
import { useServiceOrderUsers, useSearchClients, useSearchServices } from '@/hooks/serviceOrders';
import { usePermissionsList } from '@/hooks/permissions';
import { servicesService } from '@/services/servicesService';
import { currencyApplyMask, currencyRemoveMaskToNumber } from '@/lib/masks/currency';
import { usersService } from '@/services/usersService';
import { clientsService } from '@/services/clientsService';
import { Combobox } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import type { AppointmentRecord } from '@/types/appointments';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS } from '@/types/appointments';
import type { Service } from '@/types/services';

const OPEN_HOUR = 9;
const CLOSE_HOUR = 18;
const HOUR_HEIGHT = 72;
const TOTAL_MINUTES = (CLOSE_HOUR - OPEN_HOUR) * 60;
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR + 1 }, (_, i) => OPEN_HOUR + i);
const HOUR_LABELS = HOURS.slice(0, -1);
const SLOT_MINUTES = 30;

const PROFESSIONAL_COLORS = ['#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function professionalColor(key: string | null | undefined): string {
  if (!key) return '#8b5cf6';
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return PROFESSIONAL_COLORS[Math.abs(hash) % PROFESSIONAL_COLORS.length];
}

function toTop(start: string): number {
  const d = new Date(start);
  const minutes = (d.getHours() - OPEN_HOUR) * 60 + d.getMinutes();
  return Math.max(0, (minutes / TOTAL_MINUTES) * (TOTAL_MINUTES / 60) * HOUR_HEIGHT);
}

function toHeight(duration?: number | null): number {
  return Math.max(28, (((duration ?? 30) / TOTAL_MINUTES) * (TOTAL_MINUTES / 60)) * HOUR_HEIGHT);
}

/**
 * pt-BR: Mostra um toast de aviso (amarelo) quando há conflito de horário (409),
 * e um toast de erro padrão para as demais falhas.
 */
function showAppointmentError(e: (Error & { status?: number }) | undefined, fallback: string) {
  if (e?.status === 409) {
    toast.warning(e?.message || 'Conflito de horário para este profissional.');
    return;
  }
  toast.error(e?.message || fallback);
}

/**
 * Appointments — Agenda do salão (painel).
 * pt-BR: Grade semanal de horários com criação, edição e transição de status.
 */
export default function Appointments() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [filterProfessional, setFilterProfessional] = useState<string>('');

  // pt-BR: Perfis acima de "Auxiliar Administrativo" (id > 3) só enxergam a própria agenda.
  // en-US: Profiles above "Auxiliar Administrativo" (id > 3) only see their own agenda.
  const isRestrictedAgenda = Number(user?.permission_id ?? 0) > 3;

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const from = format(days[0], 'yyyy-MM-dd');
  const to = format(days[6], 'yyyy-MM-dd');

  const { data: usersData } = useServiceOrderUsers();
  const professionals = usersData ?? [];

  const { data, isLoading } = useAppointments({
    from,
    to,
    assignedTo: isRestrictedAgenda ? undefined : (filterProfessional || undefined),
  });
  const appointments: AppointmentRecord[] = data?.data ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentRecord | null>(null);
  const [prefillDate, setPrefillDate] = useState<string>(from);

  const createMutation = useCreateAppointment({
    onSuccess: () => { toast.success('Agendamento criado.'); setDialogOpen(false); },
    onError: (e: any) => showAppointmentError(e, 'Erro ao criar agendamento.'),
  });
  const updateMutation = useUpdateAppointment({
    onSuccess: () => { toast.success('Agendamento atualizado.'); setDialogOpen(false); },
    onError: (e: any) => showAppointmentError(e, 'Erro ao atualizar agendamento.'),
  });
  const statusMutation = useUpdateAppointmentStatus({
    onSuccess: () => toast.success('Status atualizado.'),
    onError: (e: any) => toast.error(e?.message || 'Transição de status não permitida.'),
  });
  const deleteMutation = useDeleteAppointment({
    onSuccess: () => { toast.success('Agendamento removido.'); setDialogOpen(false); },
    onError: (e: any) => toast.error(e?.message || 'Erro ao remover agendamento.'),
  });

  const openCreate = (date: string, time = '09:00') => {
    setEditing(null);
    setPrefillDate(`${date}T${time}`);
    setDialogOpen(true);
  };

  const openEdit = (appointment: AppointmentRecord) => {
    setEditing(appointment);
    setDialogOpen(true);
  };

  const openCreateAt = (dayStr: string, e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    const minutes = Math.min(
      TOTAL_MINUTES - SLOT_MINUTES,
      Math.round((ratio * TOTAL_MINUTES) / SLOT_MINUTES) * SLOT_MINUTES
    );
    const d = new Date(`${dayStr}T${String(OPEN_HOUR).padStart(2, '0')}:00`);
    d.setMinutes(d.getMinutes() + minutes);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    openCreate(dayStr, time);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda do Salão</h1>
          <p className="text-sm text-muted-foreground">
            {format(weekStart, "dd 'de' MMMM", { locale: ptBR })} —{' '}
            {format(days[6], "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isRestrictedAgenda && (
            <select
              value={filterProfessional}
              onChange={(e) => setFilterProfessional(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm shadow-sm focus:outline-none"
            >
              <option value="">Todos os profissionais</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <Button variant="outline" onClick={() => setShareOpen(true)} aria-label="Compartilhar agenda">
            <MessageCircle className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Compartilhar</span>
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={() => openCreate(format(new Date(), 'yyyy-MM-dd'))} aria-label="Agendar">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 overflow-hidden rounded-xl border bg-card md:grid-cols-8">
        {/* Régua de horas */}
        <div className="hidden min-w-0 border-r border-border/60 md:block">
          <div className="flex h-[36px] items-center justify-between px-3" aria-hidden />
          <div className="relative" style={{ height: TOTAL_MINUTES / 60 * HOUR_HEIGHT }}>
            {HOUR_LABELS.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] leading-none text-muted-foreground"
                style={{ top: (h - OPEN_HOUR) * HOUR_HEIGHT }}
              >
                {`${String(h).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>
        </div>

        {days.map((day, dayIndex) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayAppointments = appointments.filter((a) => format(new Date(a.start), 'yyyy-MM-dd') === dayStr);
          const isToday = isSameDay(day, new Date());

          return (
            <div key={dayStr} className="min-w-0 border-b border-r last:border-r-0 md:border-b-0">
              <button
                onClick={() => openCreate(dayStr)}
                className={`flex w-full items-center justify-between gap-1 px-3 py-2 text-left hover:bg-accent ${
                  isToday ? 'bg-primary/10' : ''
                }`}
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className={`text-sm font-semibold ${isToday ? 'text-primary' : ''}`}>
                  {format(day, 'dd')}
                </span>
              </button>

              <div
                className="relative cursor-pointer"
                style={{ height: TOTAL_MINUTES / 60 * HOUR_HEIGHT }}
                onClick={(e) => openCreateAt(dayStr, e)}
              >
                {/* Linhas de grade por hora */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="pointer-events-none absolute inset-x-0 border-t border-border/60"
                    style={{ top: (h - OPEN_HOUR) * HOUR_HEIGHT }}
                  />
                ))}
                {/* Marcador da hora atual (hoje) */}
                {isToday && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-primary"
                    style={{ top: toTop(new Date().toISOString()) }}
                  >
                    <span className="absolute -top-[3px] left-0 h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
                {dayAppointments.map((a) => {
                  const top = toTop(a.start);
                  const height = toHeight(a.duration);
                  const color = a.assignedName
                    ? professionalColor(a.assignedTo)
                    : (a.color || APPOINTMENT_STATUS_COLORS[a.status]);
                  const timeText = `${format(new Date(a.start), 'HH:mm')} · ${APPOINTMENT_STATUS_LABELS[a.status]}`;
                  const nameText = a.clientName || a.title || 'Cliente';
                  const profText = a.assignedName ? ` · ${a.assignedName}` : '';

                  return (
                    <button
                      key={a.id}
                      onClick={(e) => { e.stopPropagation(); openEdit(a); }}
                      title={`${nameText}${profText} — ${timeText}`}
                      className="absolute left-1 right-1 overflow-hidden rounded-md border px-1 py-0.5 text-left text-[11px] leading-tight shadow-sm transition-transform hover:z-10 hover:scale-[1.02]"
                      style={{
                        top,
                        height,
                        borderColor: color,
                        backgroundColor: `${color}1a`,
                        color: '#1e293b',
                      }}
                    >
                      {height < 34 ? (
                        <span className="block truncate font-semibold">
                          {a.serviceOrderId ? '● ' : ''}{timeText}
                        </span>
                      ) : (
                        <>
                          <span className="block truncate font-semibold">
                            {nameText}
                            {a.serviceOrderId && (
                              <span
                                className="ml-1 inline-block rounded px-1 text-[9px] font-bold text-white"
                                style={{ backgroundColor: color }}
                              >
                                OS
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-muted-foreground">{timeText}{profText}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        prefillDate={prefillDate}
        defaultAssignedTo={isRestrictedAgenda ? String(user?.id ?? '') : filterProfessional}
        restrictToSelf={isRestrictedAgenda}
        isCreating={createMutation.isPending}
        isUpdating={updateMutation.isPending}
        createMutation={createMutation.mutate}
        updateMutation={updateMutation.mutate}
        statusMutation={statusMutation.mutate}
        deleteMutation={deleteMutation.mutate}
      />

      <ShareAgendaDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        restricted={isRestrictedAgenda}
      />
    </div>
  );
}

function AppointmentDialog({
  open,
  onOpenChange,
  editing,
  prefillDate,
  defaultAssignedTo,
  restrictToSelf = false,
  isCreating,
  isUpdating,
  createMutation,
  updateMutation,
  statusMutation,
  deleteMutation,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AppointmentRecord | null;
  prefillDate: string;
  defaultAssignedTo?: string;
  restrictToSelf?: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  createMutation: (data: any) => void;
  updateMutation: (args: { id: number | string; data: any }) => void;
  statusMutation: (args: { id: number | string; status: string }) => void;
  deleteMutation: (id: number | string) => void;
}) {
  const { data: users = [] } = useServiceOrderUsers();
  const servicesSearch = useSearchServices();
  const { user } = useAuth();
  const canAddProfessional = Number(user?.permission_id ?? 0) < 4;

  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState<string>('');
  const [serviceId, setServiceId] = useState<string>('');
  const [serviceName, setServiceName] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('agendado');
  const [genOs, setGenOs] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [ncName, setNcName] = useState('');
  const [ncEmail, setNcEmail] = useState('');
  const [ncPhone, setNcPhone] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const queryClient = useQueryClient();
  const { data: permissionsData } = usePermissionsList({ per_page: 100 });
  const permissions = permissionsData?.data ?? [];
  const clientsSearch = useSearchClients();

  const clientOptions = useMemo(() => {
    const rows = (clientsSearch.data ?? []) as any[];
    const opts = rows.map((c) => ({
      value: String(c.id),
      label: c.name || 'Sem nome',
      description: [c.email, c.config?.celular || c.config?.telefone_residencial].filter(Boolean).join(' • '),
    }));

    const newOption = { value: '__new__', label: 'Criar cadastro de cliente' };

    // Garante que o cliente já vinculado (edição) apareça mesmo fora da primeira página.
    if (clientId && !opts.some((o) => o.value === clientId)) {
      opts.unshift({ value: clientId, label: clientName || `Cliente #${clientId}`, description: '' });
    }

    return [newOption, ...opts];
  }, [clientsSearch.data, clientId, clientName]);

  const serviceOptions = useMemo(() => {
    const rows = servicesSearch.data ?? [];
    const opts = rows.map((s) => ({
      value: String(s.id),
      label: s.name || 'Sem nome',
      description: s.price != null
        ? `R$ ${Number(s.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : undefined,
    }));

    // Garante que o serviço já vinculado (edição) apareça mesmo fora dos resultados da busca.
    if (serviceId && serviceId !== '0' && !opts.some((o) => o.value === serviceId)) {
      opts.unshift({ value: serviceId, label: serviceName || `Serviço #${serviceId}`, description: '' });
    }

    return [
      { value: '__add_service', label: 'Adicionar serviço' },
      { value: '0', label: 'Sem serviço' },
      ...opts,
    ];
  }, [servicesSearch.data, serviceId, serviceName]);

  const [quickForm, setQuickForm] = useState<'service' | 'user' | null>(null);
  const [editForm, setEditForm] = useState<{ type: 'service' | 'user' | 'client'; id: string } | null>(null);
  const [clientDetail, setClientDetail] = useState<ClientRecord | null>(null);
  const [qsName, setQsName] = useState('');
  const [qsPrice, setQsPrice] = useState('');
  const [qsDuration, setQsDuration] = useState('30');
  const [qsActive, setQsActive] = useState(true);
  const [quName, setQuName] = useState('');
  const [quEmail, setQuEmail] = useState('');
  const [quPhone, setQuPhone] = useState('');
  const [quPassword, setQuPassword] = useState('123456');
  const [quPermission, setQuPermission] = useState('');
  const [quPublicAgenda, setQuPublicAgenda] = useState(false);

  const createServiceMutation = useMutation({
    mutationFn: (data: any) => servicesService.createService(data),
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ['available-services'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setServiceId(String(created.id));
      setQuickForm(null);
      toast.success('Serviço criado.');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao criar serviço.'),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => usersService.createUser(data),
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ['service-order-users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.setQueryData(['service-order-users'], (old: any[] | undefined) => {
        if (!Array.isArray(old)) return old;
        const base = old.find((u) => String(u.id) === String(created.id))
          ? old
          : [created, ...old];
        return base;
      });
      setAssignedTo(String(created.id));
      setQuickForm(null);
      toast.success('Profissional criado.');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao criar profissional.'),
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => servicesService.updateService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-services'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setEditForm(null);
      setQuickForm(null);
      toast.success('Serviço atualizado.');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao atualizar serviço.'),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-order-users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditForm(null);
      setQuickForm(null);
      toast.success('Profissional atualizado.');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao atualizar profissional.'),
  });

  // Sync fields when the dialog opens or the edited record changes
  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? '');
    setClientId(editing?.clientId ? String(editing.clientId) : '');
    setServiceId(editing?.serviceId ? String(editing.serviceId) : '');
    setServiceName(editing?.serviceName ?? '');
    setAssignedTo(editing?.assignedTo ?? defaultAssignedTo ?? '');
    setClientName(editing?.clientName ?? '');
    setClientPhone(editing?.clientPhone ?? '');
    setClientEmail(editing?.clientEmail ?? '');
    setStart(editing?.start ? toLocalInput(editing.start) : prefillDate);
    setDuration(editing?.duration ? String(editing.duration) : '30');
    setNotes(editing?.notes ?? '');
    setStatus(editing?.status ?? 'agendado');
    setGenOs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, prefillDate, defaultAssignedTo]);

  // Reset quick-create forms each time a create dialog opens (keep prefill when editing)
  useEffect(() => {
    if (editForm) return;
    if (quickForm === 'service') {
      setQsName('');
      setQsPrice('');
      setQsDuration('30');
      setQsActive(true);
    } else if (quickForm === 'user') {
      setQuName('');
      setQuEmail('');
      setQuPhone('');
      setQuPassword('123456');
      setQuPublicAgenda(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickForm, editForm]);

  // Pre-fills the first permission in the quick professional form
  useEffect(() => {
    if (quickForm === 'user' && !quPermission && permissions.length > 0) {
      setQuPermission(String(permissions[0].id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickForm, permissions]);

  const handleServiceChange = (value: string) => {
    if (value === '__add_service') { setQuickForm('service'); return; }
    setServiceId(value);
    const found = servicesSearch.data?.find((s) => String(s.id) === value);
    setServiceName(value === '0' ? '' : (found?.name ?? serviceName));
    if (value && value !== '0') {
      servicesService
        .getService(value)
        .then((res: Service) => {
          if (res?.estimatedDuration) {
            setDuration(String(res.estimatedDuration));
          }
        })
        .catch(() => {});
    }
  };

  const handleUserChange = (value: string) => {
    if (value === '__add_user') { setQuickForm('user'); return; }
    setAssignedTo(value);
  };

  const handleClientChange = (value: string) => {
    if (value === '__new__') { setNewClientOpen(true); return; }
    if (!value) {
      setClientId('');
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setClientDetail(null);
      setGenOs(false);
      return;
    }
    const found = (clientsSearch.data as any[]).find((c) => String(c.id) === value);
    setClientId(value);
    setClientName(found?.name ?? '');
    clientsService
      .getClient(value)
      .then((res) => {
        const rec = (res as unknown as { data?: ClientRecord }).data ?? (res as ClientRecord);
        setClientDetail(rec);
        setClientPhone(
          rec?.celular ||
          rec.config?.celular ||
          rec.config?.telefone_residencial ||
          rec.config?.telefone_comercial ||
          ''
        );
        setClientEmail(rec?.email ?? '');
      })
      .catch(() => {
        // mantém os campos vazios caso a busca detalhada falhe
      });
  };

  const openEditClient = () => {
    setNcName(clientDetail?.name ?? clientName ?? '');
    setNcEmail(clientDetail?.email ?? clientEmail ?? '');
    setNcPhone(
      clientDetail?.celular ||
      clientDetail?.config?.celular ||
      clientDetail?.config?.telefone_residencial ||
      clientDetail?.config?.telefone_comercial ||
      clientPhone ||
      ''
    );
    setEditForm({ type: 'client', id: clientId });
    setNewClientOpen(true);
  };

  const openEditService = () => {
    const svc = servicesSearch.data?.find((s) => String(s.id) === serviceId);
    setQsName(svc?.name ?? '');
    setQsPrice(svc?.price != null ? currencyApplyMask(String(Math.round(Number(svc.price) * 100)), 'pt-BR', 'BRL') : '');
    setQsDuration('30');
    servicesService
      .getService(String(serviceId))
      .then((res: any) => {
        const rec = res?.data ?? res;
        setQsName(rec?.name ?? qsName);
        setQsPrice(rec?.price != null ? currencyApplyMask(String(Math.round(Number(rec.price) * 100)), 'pt-BR', 'BRL') : qsPrice);
        setQsDuration(rec?.estimatedDuration ? String(rec.estimatedDuration) : qsDuration);
        setQsActive(rec?.active ?? true);
      })
      .catch(() => {});
    setEditForm({ type: 'service', id: serviceId });
    setQuickForm('service');
  };

  const openEditUser = () => {
    setQuName('');
    setQuEmail('');
    setQuPhone('');
    setQuPassword('');
    setQuPermission('');
    setQuPublicAgenda(false);
    const usr = users.find((u: any) => u.id === assignedTo);
    setQuName(usr?.name ?? '');
    usersService
      .getUser(String(assignedTo))
      .then((res: any) => {
        const rec = res?.data ?? res;
        setQuName(rec?.name ?? '');
        setQuEmail(rec?.email ?? '');
        setQuPhone(rec?.config?.celular || rec?.config?.telefone_residencial || '');
        setQuPermission(rec?.permission_id ? String(rec.permission_id) : '');
        setQuPublicAgenda(rec?.config?.agenda_publica === 's');
      })
      .catch(() => {});
    setEditForm({ type: 'user', id: assignedTo });
    setQuickForm('user');
  };

  const handleQuickClientSave = async () => {
    if (!ncName.trim()) return;
    setIsCreatingClient(true);
    try {
      if (editForm?.type === 'client') {
        await clientsService.updateClient(editForm.id, {
          name: ncName.trim(),
          email: ncEmail.trim() || '',
          config: {
            ...((clientDetail?.config ?? {}) as any),
            celular: ncPhone || '',
          },
        });
        setClientName(ncName.trim());
        setClientEmail(ncEmail.trim() || '');
        setClientPhone(ncPhone || '');
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['search-clients'] });
        setNewClientOpen(false);
        setEditForm(null);
        setNcName('');
        setNcEmail('');
        setNcPhone('');
        toast.success('Cliente atualizado.');
        return;
      }

      const created = await clientsService.createClient({
        name: ncName.trim(),
        email: ncEmail.trim() || '',
        telefone: ncPhone || '',
        tipo_pessoa: 'pf',
        config: {} as any,
        genero: 'ni',
        status: 'pre_registred',
      });
      setClientId(String(created.id));
      setClientName(created.name || ncName.trim());
      setClientPhone(ncPhone || created.config?.celular || '');
      setClientEmail(created.email || ncEmail.trim());
      setNewClientOpen(false);
      setNcName('');
      setNcEmail('');
      setNcPhone('');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['search-clients'] });
      toast.success('Cliente criado.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar cliente.');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleQuickServiceSave = () => {
    setDuration(String(Number(qsDuration) || 30));
    const data = {
      name: qsName.trim(),
      description: '',
      category: '',
      price: qsPrice ? currencyRemoveMaskToNumber(qsPrice) : 0,
      estimatedDuration: Number(qsDuration) || 30,
      unit: 'minutes',
      active: qsActive,
      requiresMaterials: false,
      skillLevel: 'basic' as const,
    };
    if (editForm?.type === 'service') {
      updateServiceMutation.mutate({ id: editForm.id, data });
    } else {
      createServiceMutation.mutate(data);
    }
  };

  const handleQuickUserSave = () => {
    const data = {
      name: quName.trim(),
      email: quEmail.trim() || '',
      permission_id: quPermission,
      config: {
        celular: quPhone || '',
        agenda_publica: quPublicAgenda ? 's' : 'n',
      } as any,
    };
    if (editForm?.type === 'user') {
      updateUserMutation.mutate({ id: editForm.id, data });
    } else {
      createUserMutation.mutate({
        ...data,
        tipo_pessoa: 'pf',
        token: '',
        password: quPassword,
        genero: 'ni',
        ativo: 's',
      });
    }
  };

  const handleSave = () => {
    const payload = {
      title: title || undefined,
      clientId: clientId || null,
      serviceId: serviceId === '0' ? null : (serviceId ? Number(serviceId) : null),
      assignedTo: assignedTo === 'none' ? null : (assignedTo || null),
      clientName: clientName || null,
      clientPhone: clientPhone || null,
      clientEmail: clientEmail || null,
      start: start ? new Date(start).toISOString() : undefined,
      duration: Number(duration) || 30,
      notes: notes || null,
      generateServiceOrder: genOs,
    };

    if (editing) {
      updateMutation({ id: editing.id, data: { ...payload, status } });
    } else {
      createMutation(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {editing ? `Agendamento #${editing.id}` : 'Novo agendamento'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {editing && (
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
                <Badge
                  key={value}
                  variant="outline"
                  className={`cursor-pointer ${status === value ? 'ring-2 ring-primary' : ''}`}
                  style={{ color: APPOINTMENT_STATUS_COLORS[value as keyof typeof APPOINTMENT_STATUS_COLORS] }}
                  onClick={() => statusMutation({ id: editing.id, status: value })}
                >
                  {label}
                </Badge>
              ))}
            </div>
          )}

          {editing?.serviceOrderId && (
            <div className="rounded-md border bg-green-50 px-3 py-2 text-sm text-green-800">
              Ordem de Serviço #{editing.serviceOrderId} gerada a partir deste agendamento.
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Cliente</Label>
              {clientId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
                  onClick={() => openEditClient()}
                >
                  <Pencil className="h-3 w-3" /> Editar cadastro
                </Button>
              )}
            </div>
            <Combobox
              options={clientOptions}
              value={clientId}
              onValueChange={handleClientChange}
              placeholder="Selecione ou crie um cliente"
              searchPlaceholder="Buscar cliente..."
              emptyText="Nenhum cliente encontrado."
              loading={clientsSearch.isLoading}
              onSearch={clientsSearch.search}
              searchTerm={clientsSearch.searchTerm}
            />
            {!clientId && (
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome do cliente (sem cadastro)"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <InputMask
                mask="(__) _____-____"
                replacement={{ _: /\d/ }}
                value={clientPhone ? formatMask(clientPhone, { mask: '(__) _____-____', replacement: { _: /\d/ } }) : ''}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Serviço</Label>
                {serviceId && serviceId !== '0' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
                    onClick={() => openEditService()}
                  >
                    <Pencil className="h-3 w-3" /> Editar cadastro
                  </Button>
                )}
              </div>
              <Combobox
                options={serviceOptions}
                value={serviceId}
                onValueChange={handleServiceChange}
                placeholder="Selecione um serviço"
                searchPlaceholder="Buscar serviço..."
                emptyText="Nenhum serviço encontrado."
                loading={servicesSearch.isLoading}
                onSearch={servicesSearch.search}
                searchTerm={servicesSearch.searchTerm}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data e hora</Label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Input type="number" min={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Profissional</Label>
              {assignedTo && assignedTo !== 'none' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
                  onClick={() => openEditUser()}
                >
                  <Pencil className="h-3 w-3" /> Editar cadastro
                </Button>
              )}
            </div>
            <Select value={assignedTo} onValueChange={handleUserChange} disabled={restrictToSelf}>
              <SelectTrigger>
                <SelectValue placeholder="Sem profissional" />
              </SelectTrigger>
                <SelectContent>
                  {canAddProfessional && (
                    <SelectItem value="__add_user">
                      <span className="inline-flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5" /> Adicionar profissional
                      </span>
                    </SelectItem>
                  )}
                  <SelectItem value="none">Sem profissional</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
            </Select>
          </div>
          {clientId && (
            <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3">
              <Checkbox checked={genOs} onCheckedChange={(v) => setGenOs(Boolean(v))} />
              <span className="text-sm font-medium">Gerar Ordem de Serviço ao salvar</span>
            </label>
          )}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex items-center justify-between pt-2">
            {editing && (
              <Button variant="ghost" className="text-destructive" onClick={() => deleteMutation(editing.id)}>
                Excluir
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isCreating || isUpdating}>
                {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      <Dialog open={quickForm === 'service'} onOpenChange={(v) => { if (!v) { setQuickForm(null); setEditForm(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {editForm?.type === 'service' ? 'Editar serviço' : 'Adicionar serviço'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={qsName}
                onChange={(e) => setQsName(e.target.value)}
                placeholder="Ex.: Corte de cabelo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={qsPrice}
                  onChange={(e) => setQsPrice(currencyApplyMask(e.target.value, 'pt-BR', 'BRL'))}
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input type="number" min={5} value={qsDuration} onChange={(e) => setQsDuration(e.target.value)} />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3">
              <Checkbox
                checked={qsActive}
                onCheckedChange={(v) => setQsActive(Boolean(v))}
              />
              <span className="text-sm font-medium">
                Disponibilizar para agendamento público
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setQuickForm(null); setEditForm(null); }}>Cancelar</Button>
              <Button
                onClick={handleQuickServiceSave}
                disabled={(editForm?.type === 'service' ? updateServiceMutation.isPending : createServiceMutation.isPending) || !qsName.trim()}
              >
                {(editForm?.type === 'service' ? updateServiceMutation.isPending : createServiceMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={quickForm === 'user'} onOpenChange={(v) => { if (!v) { setQuickForm(null); setEditForm(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {editForm?.type === 'user' ? 'Editar profissional' : 'Adicionar profissional'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={quName} onChange={(e) => setQuName(e.target.value)} placeholder="Nome do profissional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={quEmail} onChange={(e) => setQuEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <InputMask
                  mask="(__) _____-____"
                  replacement={{ _: /\d/ }}
                  value={quPhone ? formatMask(quPhone, { mask: '(__) _____-____', replacement: { _: /\d/ } }) : ''}
                  onChange={(e) => setQuPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{editForm?.type === 'user' ? 'Senha (opcional)' : 'Senha *'}</Label>
                <Input type="text" value={quPassword} onChange={(e) => setQuPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-2">
                <Label>Permissão *</Label>
                <Select value={quPermission} onValueChange={setQuPermission}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {permissions.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3">
              <Checkbox
                checked={quPublicAgenda}
                onCheckedChange={(v) => setQuPublicAgenda(Boolean(v))}
              />
              <span className="text-sm font-medium">
                Disponibilizar para agendamento público
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setQuickForm(null); setEditForm(null); }}>Cancelar</Button>
              <Button
                onClick={handleQuickUserSave}
                disabled={(editForm?.type === 'user' ? updateUserMutation.isPending : createUserMutation.isPending) || !quName.trim() || !quPermission}
              >
                {(editForm?.type === 'user' ? updateUserMutation.isPending : createUserMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newClientOpen} onOpenChange={(v) => { if (!v) { setNewClientOpen(false); setEditForm(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {editForm?.type === 'client' ? 'Editar cadastro de cliente' : 'Criar cadastro de cliente'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={ncName} onChange={(e) => setNcName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={ncEmail} onChange={(e) => setNcEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <InputMask
                mask="(__) _____-____"
                replacement={{ _: /\d/ }}
                value={ncPhone ? formatMask(ncPhone, { mask: '(__) _____-____', replacement: { _: /\d/ } }) : ''}
                onChange={(e) => setNcPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setNewClientOpen(false); setEditForm(null); }}>Cancelar</Button>
              <Button onClick={handleQuickClientSave} disabled={isCreatingClient || !ncName.trim()}>
                {isCreatingClient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function ShareAgendaDialog({
  open,
  onOpenChange,
  restricted = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  restricted?: boolean;
}) {
  const { data: users = [] } = useServiceOrderUsers();
  const { user } = useAuth();

  // pt-BR: Perfis restritos só compartilham a própria agenda; admins veem todos.
  const list = useMemo(() => {
    if (!restricted) return users;
    return users.filter((p) => String(p.id) === String(user?.id ?? ''));
  }, [restricted, users, user?.id]);

  const baseUrl = `${window.location.origin}/agendar`;

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  const shareWhatsApp = (url: string, text: string) => {
    const message = encodeURIComponent(`${text}\n${url}`);
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Compartilhar agenda
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">Link geral de agendamento</div>
              <div className="break-all text-xs text-muted-foreground">{baseUrl}</div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="icon" variant="ghost" onClick={() => copyLink(baseUrl)} aria-label="Copiar link geral">
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => shareWhatsApp(baseUrl, 'Olá! Agende seu horário pelo link:')}
                aria-label="Compartilhar link geral via WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {list.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum profissional disponível para compartilhar.
            </p>
          )}

          {list.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {list.length} {list.length === 1 ? 'profissional' : 'profissionais'}
              </p>
              <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                {list.map((p) => {
                  const url = `${baseUrl}?profissional=${encodeURIComponent(p.id)}`;
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="break-all text-xs text-muted-foreground">{url}</div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" onClick={() => copyLink(url)} aria-label={`Copiar link de ${p.name}`}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => shareWhatsApp(url, `Olá! Agende seu horário com ${p.name} pelo link:`)}
                          aria-label={`Compartilhar agenda de ${p.name} via WhatsApp`}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}