import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { ModulePayload, ModuleRecord } from '@/types/modules';

/**
 * ModuleForm
 * pt-BR: Formulário para criar/editar módulos do EAD.
 * en-US: Form to create/edit EAD modules.
 */
export const ModuleForm = ({ initialData, onSubmit }: { initialData?: Partial<ModuleRecord>; onSubmit: (values: ModulePayload) => Promise<void> | void; }) => {
  // Schema de validação com zod
  const moduleSchema = z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    name: z.string().min(1, 'Nome interno é obrigatório'),
    tipo_duracao: z.enum(['seg','min','hrs','']).default('hrs'),
    duration: z.coerce.string().min(1, 'Duração é obrigatória'),
    content: z.string().optional().default(''),
    description: z.string().optional().default(''),
    active: z.boolean().default(true),
  });

  const form = useForm<z.infer<typeof moduleSchema>>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: '',
      name: '',
      tipo_duracao: 'hrs',
      duration: '',
      content: '',
      description: '',
      active: true,
    },
  });

  /**
   * applyInitialData
   * pt-BR: Preenche o formulário quando em modo de edição.
   * en-US: Populates the form when in edit mode.
   */
  useEffect(() => {
    if (!initialData) return;
    form.reset({
      title: initialData.title ?? '',
      name: initialData.name ?? '',
      tipo_duracao: (initialData.tipo_duracao as any) ?? 'hrs',
      duration: String(initialData.duration ?? ''),
      content: initialData.content ?? '',
      description: initialData.description ?? '',
      active: normalizeActive(initialData.active),
    });
  }, [initialData]);

  /**
   * normalizeActive
   * pt-BR: Converte formatos variados para boolean.
   * en-US: Converts mixed formats to boolean.
   */
  function normalizeActive(val: ModuleRecord['active'] | undefined): boolean {
    if (typeof val === 'boolean') return val;
    if (val === 's' || val === 1) return true;
    if (val === 'n' || val === 0) return false;
    return Boolean(val);
  }

  /**
   * handleSubmit
   * pt-BR: Encaminha valores do formulário ao callback externo.
   * en-US: Forwards form values to the external callback.
   */
  const handleSubmit = async () => {
    const values = form.getValues();
    await onSubmit(values as ModulePayload);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input placeholder="Título (aluno)" {...form.register('title')} className={form.formState.errors?.title ? 'border-red-500' : ''} />
            {form.formState.errors?.title && (<p className="text-xs text-red-600">{String(form.formState.errors.title.message)}</p>)}
          </div>
          <div className="space-y-2">
            <Label>Nome interno</Label>
            <Input placeholder="Nome interno (admin)" {...form.register('name')} className={form.formState.errors?.name ? 'border-red-500' : ''} />
            {form.formState.errors?.name && (<p className="text-xs text-red-600">{String(form.formState.errors.name.message)}</p>)}
          </div>

          <div className="space-y-2">
            <Label>Tipo de duração</Label>
            <Select value={form.watch('tipo_duracao')} onValueChange={(v) => form.setValue('tipo_duracao', v as any)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="seg">Segundos</SelectItem>
                <SelectItem value="min">Minutos</SelectItem>
                <SelectItem value="hrs">Horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Duração</Label>
            <Input placeholder="Ex.: 2" {...form.register('duration')} className={form.formState.errors?.duration ? 'border-red-500' : ''} />
            {form.formState.errors?.duration && (<p className="text-xs text-red-600">{String(form.formState.errors.duration.message)}</p>)}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Descrição</Label>
            <Textarea rows={3} placeholder="Descrição do módulo" {...form.register('description')} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Conteúdo</Label>
            <Textarea rows={4} placeholder="Conteúdo, link, observações" {...form.register('content')} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
            <div className="space-y-0.5"><Label>Ativar</Label></div>
            <Switch checked={!!form.watch('active')} onCheckedChange={(checked) => form.setValue('active', checked)} />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => form.reset()}>Limpar</Button>
        <Button type="button" onClick={handleSubmit}>Salvar</Button>
      </div>
    </div>
  );
};

export default ModuleForm;