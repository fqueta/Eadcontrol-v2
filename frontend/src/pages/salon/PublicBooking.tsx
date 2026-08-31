import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InputMask, format as formatMask } from '@react-input/mask';
import {
  Search,
  CheckCircle2,
  Loader2,
  Calendar,
  Clock,
  User,
  ChevronLeft,
  Check,
  ArrowRight,
  Scissors,
  Sparkles,
  Phone,
  Mail,
  FileText,
  UserCheck,
} from 'lucide-react';
import {
  usePublicBooking,
  usePublicProfessionals,
  usePublicServices,
  usePublicSlots,
} from '@/hooks/appointments';
import BrandLogo from '@/components/branding/BrandLogo';
import {
  getInstitutionName,
  getInstitutionNameAsync,
  getInstitutionSlogan,
  hydrateBrandingFromPublicApi,
} from '@/lib/branding';

/**
 * PublicBooking — Página pública de agendamento do salão (Mobile-First Wizard).
 * pt-BR: Experiência em 4 passos lógicos com navegação fluida, otimizada para dispositivos móveis.
 */
export default function PublicBooking() {
  const [searchParams] = useSearchParams();
  const lockedProfessional = searchParams.get('profissional') || '';

  // Passo atual: 1 (Profissional), 2 (Serviço), 3 (Data e Horário), 4 (Dados e Confirmação)
  const [step, setStep] = useState<number>(1);

  const [serviceId, setServiceId] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [professionalId, setProfessionalId] = useState(lockedProfessional);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [slot, setSlot] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);

  const { data: services = [], isLoading: isLoadingServices } = usePublicServices();
  const { data: professionals = [], isLoading: isLoadingProfessionals } = usePublicProfessionals();

  const [institutionName, setInstitutionName] = useState<string>(() => getInstitutionName());
  const [institutionSlogan, setInstitutionSlogan] = useState<string>(() => getInstitutionSlogan());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { name } = await hydrateBrandingFromPublicApi({ persist: true });
        const finalName = name || (await getInstitutionNameAsync());
        if (!cancelled) {
          setInstitutionName(finalName);
          setInstitutionSlogan(getInstitutionSlogan());
        }
      } catch {
        if (!cancelled) {
          setInstitutionName(getInstitutionName());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Validação e bloqueio de profissional por parâmetro de URL (?profissional=X)
  const lockedProfessionalLower = lockedProfessional.toLowerCase();
  const lockProfessional = Boolean(
    lockedProfessional &&
      professionals.some((p) => String(p.id).toLowerCase() === lockedProfessionalLower)
  );
  const lockedPro = professionals.find((p) => String(p.id).toLowerCase() === lockedProfessionalLower);
  const selectableProfessionals = useMemo(
    () => professionals.filter((p) => p.public),
    [professionals]
  );

  const effectiveProfessionalId = lockProfessional ? lockedProfessional : professionalId;
  const selectedProfessionalObj = useMemo(
    () => professionals.find((p) => String(p.id) === String(effectiveProfessionalId)),
    [professionals, effectiveProfessionalId]
  );

  useEffect(() => {
    if (!lockProfessional && lockedProfessional && professionalId === lockedProfessional) {
      setProfessionalId('');
    }
  }, [lockProfessional, lockedProfessional, professionalId]);

  // Se houver trava de profissional via URL e o usuário estiver na etapa 1, avança automaticamente
  useEffect(() => {
    if (lockProfessional && step === 1) {
      setStep(2);
    }
  }, [lockProfessional, step]);

  // Filtro de serviços
  const filteredServices = useMemo(
    () => services.filter((s) => s.name.toLowerCase().includes(serviceSearch.trim().toLowerCase())),
    [services, serviceSearch]
  );

  const selectedService = useMemo(
    () => services.find((s) => String(s.id) === serviceId),
    [services, serviceId]
  );
  const duration = selectedService?.duration ?? 30;

  // Busca de horários vagos
  const { data: slotsData, isLoading: isLoadingSlots } = usePublicSlots({
    date: selectedDate,
    serviceId: selectedService?.id,
    assignedTo: effectiveProfessionalId || undefined,
    duration,
  });

  const slots = useMemo(
    () =>
      (slotsData?.data ?? []).map((s) =>
        new Date(s.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      ),
    [slotsData]
  );

  // Agrupamento dos horários por período (Manhã, Tarde, Noite)
  const categorizedSlots = useMemo(() => {
    const morning: string[] = [];
    const afternoon: string[] = [];
    const evening: string[] = [];

    slots.forEach((s) => {
      const hour = parseInt(s.split(':')[0], 10);
      if (hour < 12) {
        morning.push(s);
      } else if (hour < 18) {
        afternoon.push(s);
      } else {
        evening.push(s);
      }
    });

    return { morning, afternoon, evening };
  }, [slots]);

  // Gera os próximos 14 dias para o carrossel de datas
  const daysList = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(today, i);
      return {
        dateStr: format(d, 'yyyy-MM-dd'),
        dayName: format(d, 'EEE', { locale: ptBR }).replace('.', ''),
        dayNum: format(d, 'dd'),
        monthName: format(d, 'MMM', { locale: ptBR }).replace('.', ''),
        isToday: i === 0,
      };
    });
  }, []);

  const mutation = usePublicBooking({
    onSuccess: () => {
      toast.success('Solicitação de agendamento enviada com sucesso!');
      setDone(true);
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao enviar agendamento.'),
  });

  const handleSubmit = () => {
    if (done) return;
    if (!slot) {
      toast.error('Escolha um horário para continuar.');
      setStep(3);
      return;
    }
    if (!clientName.trim()) {
      toast.error('Informe seu nome.');
      return;
    }
    if (!clientPhone.trim()) {
      toast.error('Informe seu WhatsApp/Telefone.');
      return;
    }

    mutation.mutate({
      start: new Date(`${selectedDate}T${slot}:00`).toISOString(),
      duration,
      serviceId: selectedService?.id ?? null,
      assignedTo: effectiveProfessionalId || null,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim() || null,
      notes: notes.trim() || null,
    });
  };

  const handleNext = () => {
    if (step === 1 && !lockProfessional) {
      setStep(2);
    } else if (step === 2) {
      if (!serviceId) {
        toast.error('Selecione um serviço para continuar.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!slot) {
        toast.error('Selecione um horário disponível.');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (step === 2 && lockProfessional) {
      // Se tiver profissional fixado, não faz sentido voltar para a escolha de profissional
      return;
    }
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const resetForm = () => {
    setStep(lockProfessional ? 2 : 1);
    setServiceId('');
    setSlot('');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setNotes('');
    setDone(false);
  };

  // Tela de sucesso pós-agendamento
  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Solicitação Enviada!</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Recebemos seu pedido de agendamento. Entraremos em contato via WhatsApp para confirmar seu horário.
          </p>

          <div className="mt-6 rounded-xl border bg-muted/30 p-4 text-left space-y-2.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Serviço:</span>
              <span>{selectedService?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Profissional:</span>
              <span>{selectedProfessionalObj?.name || 'Qualquer profissional'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Data e Horário:</span>
              <span className="font-semibold text-primary">
                {format(parseISO(selectedDate), 'dd/MM/yyyy')} às {slot}
              </span>
            </div>
          </div>

          <Button className="mt-6 w-full rounded-xl" size="lg" onClick={resetForm}>
            Realizar outro agendamento
          </Button>
        </div>
      </div>
    );
  }

  const stepsInfo = [
    { num: 1, title: 'Profissional', icon: User },
    { num: 2, title: 'Serviço', icon: Scissors },
    { num: 3, title: 'Data e Hora', icon: Calendar },
    { num: 4, title: 'Seus Dados', icon: UserCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-28 pt-6 px-3 sm:px-6 dark:bg-slate-950 flex flex-col justify-between">
      <div className="mx-auto w-full max-w-xl space-y-5">
        {/* Cabeçalho da Instituição */}
        <header className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 shadow-sm border border-primary/20">
            <BrandLogo
              alt={institutionName}
              fallbackSrc="/logo.png"
              className="h-10 w-10 object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{institutionName}</h1>
            {institutionSlogan && (
              <p className="text-xs text-muted-foreground">{institutionSlogan}</p>
            )}
          </div>
        </header>

        {/* Indicador de Etapas / Stepper */}
        <div className="rounded-2xl border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between relative px-2">
            {stepsInfo.map((s, idx) => {
              const Icon = s.icon;
              const isCompleted = step > s.num || (lockProfessional && s.num === 1);
              const isActive = step === s.num;
              const isClickable = s.num < step && !(lockProfessional && s.num === 1);

              return (
                <div key={s.num} className="flex flex-col items-center z-10">
                  <button
                    disabled={!isClickable}
                    onClick={() => isClickable && setStep(s.num)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl font-semibold text-xs transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20 scale-105'
                        : isCompleted
                        ? 'bg-emerald-500 text-white dark:bg-emerald-600'
                        : 'bg-muted text-muted-foreground border'
                    } ${isClickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </button>
                  <span className={`mt-1.5 text-[10px] sm:text-xs font-medium ${isActive ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                    {s.title}
                  </span>
                </div>
              );
            })}
            {/* Linha de progresso por trás */}
            <div className="absolute top-5 left-8 right-8 -z-0 h-0.5 bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${((step - 1) / (stepsInfo.length - 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Card Principal de Conteúdo do Passo */}
        <main className="rounded-2xl border bg-card p-5 shadow-sm space-y-5 animate-in fade-in-50 duration-200">
          {/* Resumo rápido do que já foi selecionado se estiver nos passos mais avançados */}
          {step > 1 && (
            <div className="flex flex-wrap gap-2 rounded-xl bg-muted/40 p-2.5 text-xs text-muted-foreground border border-border/50">
              {effectiveProfessionalId && (
                <span className="flex items-center gap-1 font-medium text-foreground bg-background px-2.5 py-1 rounded-lg border">
                  <User className="h-3 w-3 text-primary" />
                  {selectedProfessionalObj?.name || 'Profissional'}
                </span>
              )}
              {selectedService && (
                <span className="flex items-center gap-1 font-medium text-foreground bg-background px-2.5 py-1 rounded-lg border">
                  <Scissors className="h-3 w-3 text-primary" />
                  {selectedService.name}
                </span>
              )}
              {slot && step === 4 && (
                <span className="flex items-center gap-1 font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(selectedDate), 'dd/MM')} às {slot}
                </span>
              )}
            </div>
          )}

          {/* PASSO 1: Profissional */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Escolha o Profissional
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Selecione quem irá lhe atender ou escolha qualquer profissional.
                </p>
              </div>

              {isLoadingProfessionals ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Opção Qualquer Profissional */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfessionalId('');
                      setSlot('');
                      setStep(2);
                    }}
                    className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all hover:border-primary hover:shadow-sm ${
                      !professionalId
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'bg-card'
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">Qualquer profissional</p>
                      <p className="text-xs text-muted-foreground truncate">Maior disponibilidade de horários</p>
                    </div>
                    {!professionalId && <Check className="h-5 w-5 text-primary shrink-0" />}
                  </button>

                  {/* Lista de Profissionais Públicos */}
                  {selectableProfessionals.map((p) => {
                    const isSelected = String(p.id) === String(professionalId);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setProfessionalId(String(p.id));
                          setSlot('');
                          setStep(2);
                        }}
                        className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all hover:border-primary hover:shadow-sm ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'bg-card'
                        }`}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 text-foreground font-bold text-sm">
                          {p.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">Profissional do Salão</p>
                        </div>
                        {isSelected && <Check className="h-5 w-5 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PASSO 2: Serviço */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-primary" />
                  Selecione o Serviço
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Escolha o procedimento desejado para ver as opções de horário.
                </p>
              </div>

              {/* Busca por serviço */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Buscar serviço pelo nome..."
                  className="pl-9 rounded-xl text-sm"
                />
              </div>

              {isLoadingServices ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : services.length === 0 ? (
                <p className="text-sm text-center py-6 text-muted-foreground">Nenhum serviço disponível no momento.</p>
              ) : (
                <div className="max-h-[50vh] overflow-y-auto space-y-2.5 pr-1">
                  {filteredServices.length === 0 && (
                    <p className="text-sm text-center py-6 text-muted-foreground">
                      Nenhum serviço encontrado para &quot;{serviceSearch}&quot;.
                    </p>
                  )}
                  {filteredServices.map((s) => {
                    const isSelected = String(s.id) === serviceId;
                    const priceFormatted = s.price
                      ? `R$ ${Number(s.price).toFixed(2).replace('.', ',')}`
                      : 'Grátis';

                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setServiceId(String(s.id));
                          setSlot('');
                        }}
                        className={`group flex items-center justify-between gap-3 rounded-xl border p-3.5 cursor-pointer transition-all hover:border-primary/60 ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                            : 'bg-card hover:bg-accent/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground/40 group-hover:border-primary'
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <Clock className="h-3 w-3 shrink-0" />
                              {durationLabel(s.duration)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-primary">{priceFormatted}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PASSO 3: Data e Horário */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Escolha o Dia e Horário
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Selecione a melhor data e escolha um horário livre disponível.
                </p>
              </div>

              {/* Carrossel Horizontal de Dias */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Selecione o Dia</Label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
                  {daysList.map((d) => {
                    const isSelected = d.dateStr === selectedDate;
                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        onClick={() => {
                          setSelectedDate(d.dateStr);
                          setSlot('');
                        }}
                        className={`flex flex-col items-center justify-center min-w-[62px] h-[72px] rounded-xl border p-2 snap-start transition-all ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground shadow-md scale-105'
                            : 'bg-card hover:bg-accent text-foreground'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-semibold opacity-80">{d.dayName}</span>
                        <span className="text-base font-extrabold">{d.dayNum}</span>
                        <span className="text-[9px] capitalize opacity-70">{d.monthName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seletor de Horários */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">Horários Livres</Label>
                  <span className="text-xs text-primary font-medium">
                    {format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>

                {isLoadingSlots ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : slots.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center">
                    <Clock className="mx-auto h-8 w-8 text-muted-foreground/60" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Nenhum horário disponível para esta data.
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1">
                      Por favor, escolha outro dia acima.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                    {categorizedSlots.morning.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Manhã
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {categorizedSlots.morning.map((s) => (
                            <Button
                              key={s}
                              type="button"
                              variant={slot === s ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSlot(s)}
                              className={`rounded-xl text-xs font-semibold py-2 transition-all ${
                                slot === s ? 'shadow-sm ring-2 ring-primary/30' : ''
                              }`}
                            >
                              {s}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {categorizedSlots.afternoon.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Tarde
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {categorizedSlots.afternoon.map((s) => (
                            <Button
                              key={s}
                              type="button"
                              variant={slot === s ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSlot(s)}
                              className={`rounded-xl text-xs font-semibold py-2 transition-all ${
                                slot === s ? 'shadow-sm ring-2 ring-primary/30' : ''
                              }`}
                            >
                              {s}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {categorizedSlots.evening.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Noite
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {categorizedSlots.evening.map((s) => (
                            <Button
                              key={s}
                              type="button"
                              variant={slot === s ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSlot(s)}
                              className={`rounded-xl text-xs font-semibold py-2 transition-all ${
                                slot === s ? 'shadow-sm ring-2 ring-primary/30' : ''
                              }`}
                            >
                              {s}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASSO 4: Dados e Confirmação */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Seus Dados de Contato
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Preencha seus dados para finalizarmos o agendamento.
                </p>
              </div>

              {/* Card Resumo do Agendamento */}
              <div className="rounded-xl border bg-primary/5 border-primary/20 p-3.5 space-y-2 text-xs">
                <p className="font-bold text-primary text-xs uppercase tracking-wider">Resumo do Agendamento</p>
                <div className="grid grid-cols-2 gap-2 pt-1 text-foreground">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Serviço</span>
                    <span className="font-semibold">{selectedService?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Valor</span>
                    <span className="font-bold text-primary">
                      {selectedService?.price
                        ? `R$ ${Number(selectedService.price).toFixed(2).replace('.', ',')}`
                        : 'Grátis'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Profissional</span>
                    <span className="font-semibold">{selectedProfessionalObj?.name || 'Qualquer profissional'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Data & Horário</span>
                    <span className="font-bold text-primary">
                      {format(parseISO(selectedDate), 'dd/MM/yyyy')} às {slot}
                    </span>
                  </div>
                </div>
              </div>

              {/* Formulário de Identificação */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs">Seu nome completo *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Digite seu nome completo"
                      className="pl-9 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">WhatsApp / Celular *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                      <InputMask
                        component="input"
                        mask="(__) _____-____"
                        replacement={{ _: /\d/ }}
                        value={
                          clientPhone
                            ? formatMask(clientPhone, { mask: '(__) _____-____', replacement: { _: /\d/ } })
                            : ''
                        }
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="flex h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">E-mail (opcional)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="pl-9 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Observações (opcional)</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Prefiro atendimento silencioso, tenho alergia a produtos com sulfato..."
                      rows={2}
                      className="pl-9 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Barra de Ação Fixa Inferior (Sticky Bottom Bar Mobile-First) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 p-3.5 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          {step > 1 && !(step === 2 && lockProfessional) ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handlePrev}
              className="rounded-xl px-4 text-xs font-semibold"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            size="lg"
            onClick={handleNext}
            disabled={mutation.isPending}
            className="flex-1 rounded-xl font-bold shadow-md text-sm transition-all"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : step === 4 ? (
              <>
                Solicitar Agendamento
                <Check className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function durationLabel(minutes?: number): string {
  if (!minutes) return '';
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }
  return `${minutes}min`;
}