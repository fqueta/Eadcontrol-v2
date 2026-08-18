import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InputMask, format as formatMask } from '@react-input/mask';
import { Search, CheckCircle2, Loader2 } from 'lucide-react';
import { usePublicBooking, usePublicProfessionals, usePublicServices, usePublicSlots } from '@/hooks/appointments';
import BrandLogo from '@/components/branding/BrandLogo';
import {
  getInstitutionName,
  getInstitutionNameAsync,
  getInstitutionSlogan,
  hydrateBrandingFromPublicApi,
} from '@/lib/branding';

/**
 * PublicBooking — Página pública de agendamento do salão.
 * pt-BR: Cliente escolhe serviço, data e horário livre e envia a solicitação.
 */
export default function PublicBooking() {
  const [searchParams] = useSearchParams();
  const lockedProfessional = searchParams.get('profissional') || '';

  const [serviceId, setServiceId] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [professionalId, setProfessionalId] = useState(lockedProfessional);
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [slot, setSlot] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);

  const { data: services = [] } = usePublicServices();
  const { data: professionals = [] } = usePublicProfessionals();

  // pt-BR: Nome e slogan da instituição obtidos via endpoint público de branding.
  // en-US: Institution name and slogan resolved via the public branding endpoint.
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

  // pt-BR: Quando o link personalizado (?profissional=X) aponta para um profissional
  // válido, o seletor fica travado nele; caso contrário o link é ignorado.
  // en-US: When a personalized link (?profissional=X) points to a valid
  // professional, the selector is locked on it; otherwise the link is ignored.
  const lockedProfessionalLower = lockedProfessional.toLowerCase();
  const lockProfessional = Boolean(
    lockedProfessional &&
    professionals.some((p) => String(p.id).toLowerCase() === lockedProfessionalLower)
  );
  const lockedPro = professionals.find((p) => String(p.id).toLowerCase() === lockedProfessionalLower);

  // pt-BR: O seletor genérico só lista profissionais com agenda pública ativa.
  const selectableProfessionals = professionals.filter((p) => p.public);

  // pt-BR: Filtro de serviços por nome (busca).
  const filteredServices = useMemo(
    () => services.filter((s) => s.name.toLowerCase().includes(serviceSearch.trim().toLowerCase())),
    [services, serviceSearch]
  );

  const selectedService = services.find((s) => String(s.id) === serviceId);
  const duration = selectedService?.duration ?? 30;

  // pt-BR: Profissional efetivo: quando o link trava, usa o id do lock;
  // caso contrário, usa a seleção do usuário (nunca um id inválido da URL).
  const effectiveProfessionalId = lockProfessional ? lockedProfessional : professionalId;

  // pt-BR: Se o link traz um profissional inválido, descarta o valor inicial.
  useEffect(() => {
    if (!lockProfessional && lockedProfessional && professionalId === lockedProfessional) {
      setProfessionalId('');
    }
  }, [lockProfessional, lockedProfessional, professionalId]);

  const { data: slotsData } = usePublicSlots({
    date,
    serviceId: selectedService?.id,
    assignedTo: effectiveProfessionalId || undefined,
    duration,
  });
  const slots = useMemo(() => (slotsData?.data ?? []).map((s) =>
    new Date(s.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  ), [slotsData]);

  const mutation = usePublicBooking({
    onSuccess: () => {
      toast.success('Solicitação de agendamento enviada.');
      setDone(true);
      setTimeout(() => {
        setDate('');
        setSlot('');
        setClientName('');
        setClientPhone('');
        setClientEmail('');
        setNotes('');
        setDone(false);
      }, 3000);
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao enviar agendamento.'),
  });

  const handleSubmit = () => {
    if (done) return;
    if (!slot) { toast.error('Escolha um horário.'); return; }
    if (!clientName.trim()) { toast.error('Informe seu nome.'); return; }
    if (!clientPhone.trim()) { toast.error('Informe seu telefone.'); return; }

    mutation.mutate({
      start: new Date(`${date}T${slot}:00`).toISOString(),
      duration,
      serviceId: selectedService?.id ?? null,
      assignedTo: effectiveProfessionalId || null,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim() || null,
      notes: notes.trim() || null,
    });
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <h1 className="mt-4 text-2xl font-bold">Agendamento solicitado!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Recebemos sua solicitação. Verifique se há confirmação por telefone ou WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary/10">
            <BrandLogo
              alt={institutionName}
              fallbackSrc="/logo.png"
              className="h-10 w-10 object-contain"
            />
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{institutionName}</h1>
          {institutionSlogan && (
            <p className="mt-1 text-sm text-muted-foreground">{institutionSlogan}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">Escolha o serviço e o melhor momento.</p>
        </div>

        <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
          {lockProfessional ? (
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">Profissional</span>
              <span className="text-sm font-medium">
                {lockedPro?.name || 'Profissional'}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Profissional</Label>
              <select
                value={professionalId}
                onChange={(e) => { setProfessionalId(e.target.value); setSlot(''); }}
                className="w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none"
              >
                <option value="">Qualquer profissional</option>
                {selectableProfessionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Serviço</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Buscar serviço..."
                className="pl-8"
              />
            </div>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum serviço disponível no momento.</p>
            ) : (
              <RadioGroup value={serviceId} onValueChange={(v) => { setServiceId(v); setSlot(''); }} className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {filteredServices.length} {filteredServices.length === 1 ? 'serviço' : 'serviços'}
                </p>
                {filteredServices.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum serviço encontrado para a busca.</p>
                )}
                <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                  {filteredServices.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border p-3" style={{ cursor: 'pointer' }}>
                      <label htmlFor={`svc-${s.id}`} className="flex flex-1 items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem id={`svc-${s.id}`} value={String(s.id)} />
                          <span className="text-sm font-medium">{s.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {durationLabel(s.duration)} · {s.price ? `R$ ${Number(s.price).toFixed(2).replace('.', ',')}` : 'Grátis'}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </div>

          <div className="space-y-2">
            <Label>Dia</Label>
            <Input
              type="date"
              value={date}
              min={format(new Date(), 'yyyy-MM-dd')}
              max={format(addDays(new Date(), 13), 'yyyy-MM-dd')}
              onChange={(e) => { setDate(e.target.value); setSlot(''); }}
              className="w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Horário</Label>
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum horário livre neste dia.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                {slots.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={slot === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSlot(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label>Seu nome *</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>WhatsApp *</Label>
                <InputMask
                  mask="(__) _____-____"
                  replacement={{ _: /\d/ }}
                  type="tel"
                  inputMode="tel"
                  value={clientPhone ? formatMask(clientPhone, { mask: '(__) _____-____', replacement: { _: /\d/ } }) : ''}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="opcional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <Button size="lg" onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Solicitar agendamento
            </Button>
          </div>
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