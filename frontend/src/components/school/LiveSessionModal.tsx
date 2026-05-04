import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Video, Link2, Clock, Calendar, AlignLeft, Palette } from 'lucide-react';
import type { LiveSessionPayload, LiveSessionRecord } from '@/types/liveSessions';

// ─── Validação ────────────────────────────────────────────────────────────────
const sessionSchema = z.object({
  titulo:           z.string().min(1, 'Título é obrigatório'),
  link:             z.string().url('URL inválida').optional().or(z.literal('')),
  duracao_minutos:  z.coerce.number().min(1).max(1440).optional(),
  inicio:           z.string().min(1, 'Data de início é obrigatória'),
  fim:              z.string().optional(),
  descricao:        z.string().optional(),
  cor:              z.string().optional().default('#6366f1'),
});

type FormValues = z.infer<typeof sessionSchema>;

// ─── Paleta de cores do calendário ───────────────────────────────────────────
const COLOR_PRESETS = [
  { value: '#6366f1', label: 'Índigo'  },
  { value: '#0ea5e9', label: 'Azul'    },
  { value: '#10b981', label: 'Verde'   },
  { value: '#f59e0b', label: 'Âmbar'  },
  { value: '#ef4444', label: 'Vermelho'},
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa'    },
  { value: '#14b8a6', label: 'Teal'    },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface LiveSessionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: LiveSessionPayload) => Promise<void>;
  isSaving?: boolean;
  /** Prefil data for the selected date */
  defaultDate?: string;
  /** Record being edited (if editing) */
  editRecord?: LiveSessionRecord | null;
  /** Course info for header display */
  courseNome?: string;
  /** Class group info */
  turmaNome?: string;
  idCurso?: number | null;
  idTurma?: number | null;
}

/**
 * LiveSessionModal — Modal para criar/editar uma sessão ao vivo.
 * pt-BR: Formulário Zod-validated com campos de data/hora, link e cor.
 * en-US: Zod-validated form with datetime, link and color pickers.
 */
export function LiveSessionModal({
  open, onClose, onSave, isSaving = false,
  defaultDate, editRecord,
  courseNome, turmaNome,
  idCurso, idTurma,
}: LiveSessionModalProps) {
  const isEditing = !!editRecord;

  const defaultInicio = defaultDate
    ? `${defaultDate.substring(0, 10)}T09:00`
    : '';
  const defaultFim = defaultDate
    ? `${defaultDate.substring(0, 10)}T10:00`
    : '';

  const form = useForm<FormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      titulo:          '',
      link:            '',
      duracao_minutos: 60,
      inicio:          defaultInicio,
      fim:             defaultFim,
      descricao:       '',
      cor:             '#6366f1',
    },
  });

  // Preenche o form com os dados do registro em edição
  useEffect(() => {
    if (editRecord) {
      form.reset({
        titulo:          editRecord.titulo,
        link:            editRecord.link ?? '',
        duracao_minutos: editRecord.duracao_minutos ?? 60,
        inicio:          editRecord.inicio.substring(0, 16),
        fim:             editRecord.fim ? editRecord.fim.substring(0, 16) : '',
        descricao:       editRecord.descricao ?? '',
        cor:             editRecord.cor ?? '#6366f1',
      });
    } else if (defaultDate) {
      form.reset({
        titulo: '',
        link: '',
        duracao_minutos: 60,
        inicio: defaultInicio,
        fim: defaultFim,
        descricao: '',
        cor: '#6366f1',
      });
    }
  }, [editRecord, defaultDate, open]);

  const handleSubmit = async (values: FormValues) => {
    const payload: LiveSessionPayload = {
      titulo: values.titulo,
      inicio: values.inicio,
      duracao_minutos: values.duracao_minutos,
      descricao: values.descricao,
      cor: values.cor,
      id_curso: idCurso ?? null,
      id_turma: idTurma ?? null,
      link: values.link || null,
      fim: values.fim || null,
    };
    await onSave(payload);
  };

  const selectedCor = form.watch('cor');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
        {/* ── Header com gradiente ── */}
        <div
          className="px-6 py-5"
          style={{ background: `linear-gradient(135deg, ${selectedCor}20, ${selectedCor}08)` }}
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: selectedCor }}
              >
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-foreground/90">
                  {isEditing ? 'Editar Aula ao Vivo' : 'Adicionar Atividade ao Vivo'}
                </DialogTitle>
                {(courseNome || turmaNome) && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {courseNome && <span className="font-semibold">{courseNome}</span>}
                    {courseNome && turmaNome && <span className="mx-2 opacity-40">·</span>}
                    {turmaNome && <span>{turmaNome}</span>}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* ── Formulário ── */}
        <div className="px-6 py-5 overflow-y-auto max-h-[65vh]">
          <Form {...form}>
            <form id="live-session-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">

              {/* Nome da Aula */}
              <FormField
                control={form.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Nome da Aula *</FormLabel>
                    <FormControl>
                      <Input
                        className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900"
                        placeholder="Ex: Aula Inaugural — Fundamentos"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Link + Duração */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-primary" /> Link
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900"
                          placeholder="https://meet.google.com/..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duracao_minutos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" /> Duração (minutos)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={1440}
                          className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900"
                          placeholder="60"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Início + Fim */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" /> Início *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fim"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" /> Fim
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Descrição */}
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold flex items-center gap-2">
                      <AlignLeft className="w-4 h-4 text-primary" /> Descrição
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[90px] rounded-xl bg-slate-50 dark:bg-slate-900 resize-none"
                        placeholder="Pauta da aula, conteúdo abordado..."
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Cor do Evento */}
              <FormField
                control={form.control}
                name="cor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" /> Cor no Calendário
                    </FormLabel>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          title={c.label}
                          onClick={() => field.onChange(c.value)}
                          className={`w-8 h-8 rounded-full border-2 transition-all duration-150 hover:scale-110 ${
                            field.value === c.value
                              ? 'border-white ring-2 ring-offset-2 scale-110'
                              : 'border-transparent'
                          }`}
                          style={{
                            backgroundColor: c.value,
                            '--tw-ring-color': c.value,
                          } as any}
                        />
                      ))}
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl font-bold"
            disabled={isSaving}
          >
            Fechar
          </Button>
          <Button
            type="submit"
            form="live-session-form"
            disabled={isSaving}
            className="h-11 px-8 rounded-xl font-bold shadow-lg"
            style={{ backgroundColor: selectedCor }}
          >
            {isSaving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Save className="w-4 h-4 mr-2" /> Salvar</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
