import { useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InputMask, format as formatMask } from '@react-input/mask';
import { CalendarDays, CheckCircle2, Loader2 } from 'lucide-react';
import { usePublicBooking, usePublicProfessionals, usePublicServices, usePublicSlots } from '@/hooks/appointments';

/**
 * PublicBooking — Página pública de agendamento do salão.
 * pt-BR: Cliente escolhe serviço, data e horário livre e envia a solicitação.
 */
export default function PublicBooking() {
  const [serviceId, setServiceId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [slot, setSlot] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);

  const { data: services = [] } = usePublicServices();
  const { data: professionals = [] } = usePublicProfessionals();
  const selectedService = services.find((s) => String(s.id) === serviceId);
  const duration = selectedService?.duration ?? 30;

  const { data: slotsData } = usePublicSlots({
    date,
    serviceId: selectedService?.id,
    assignedTo: professionalId || undefined,
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

  const nextDays = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)), []);

  const handleSubmit = () => {
    if (done) return;
    if (!slot) { toast.error('Escolha um horário.'); return; }
    if (!clientName.trim()) { toast.error('Informe seu nome.'); return; }
    if (!clientPhone.trim()) { toast.error('Informe seu telefone.'); return; }

    mutation.mutate({
      start: new Date(`${date}T${slot}:00`).toISOString(),
      duration,
      serviceId: selectedService?.id ?? null,
      assignedTo: professionalId || null,
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Agende seu horário</h1>
          <p className="mt-1 text-sm text-muted-foreground">Escolha o serviço e o melhor momento.</p>
        </div>

        <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label>Profissional</Label>
            <select
              value={professionalId}
              onChange={(e) => { setProfessionalId(e.target.value); setSlot(''); }}
              className="w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none"
            >
              <option value="">Qualquer profissional</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Serviço</Label>
            <RadioGroup value={serviceId} onValueChange={(v) => { setServiceId(v); setSlot(''); }}>
              {services.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum serviço disponível no momento.</p>
              )}
              {services.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border p-3" style={{ cursor: 'pointer' }}>
                  <label htmlFor={`svc-${s.id}`} className="flex flex-1 items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id={`svc-${s.id}`} value={String(s.id)} />
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {durationLabel(s.duration)} · {s.price ? `R$ ${Number(s.price).toFixed(2).replace(',', '.')}` : 'Grátis'}
                    </span>
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Dia</Label>
            <select
              value={date}
              onChange={(e) => { setDate(e.target.value); setSlot(''); }}
              className="w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none"
            >
              {nextDays.map((d) => (
                <option key={format(d, 'yyyy-MM-dd')} value={format(d, 'yyyy-MM-dd')}>
                  {format(d, 'EEE, dd/MM', { locale: ptBR })}
                </option>
              ))}
            </select>
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