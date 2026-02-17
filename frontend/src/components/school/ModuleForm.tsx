import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  LayoutGrid, 
  Check, 
  Save, 
  RotateCcw, 
  BookOpen, 
  Clock, 
  FileType, 
  AlignLeft,
  Settings2,
  ChevronLeft
} from 'lucide-react';
import type { ModulePayload, ModuleRecord } from '@/types/modules';

const RequiredMark = () => (<span className="text-red-500 ml-1 font-bold">*</span>);

/**
 * ModuleForm
 * pt-BR: Formulário para criar/editar módulos do EAD com visual premium.
 * en-US: Form to create/edit EAD modules with premium visuals.
 */
export const ModuleForm = ({ 
  initialData, 
  onSubmit,
  isEditing = false
}: { 
  initialData?: Partial<ModuleRecord>; 
  onSubmit: (values: ModulePayload) => Promise<void> | void; 
  isEditing?: boolean;
}) => {
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

  const isActive = form.watch('active');

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
  }, [initialData, form]);

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
  const handleFormSubmit = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    
    const values = form.getValues();
    await onSubmit(values as ModulePayload);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl overflow-hidden rounded-3xl">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 p-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">{isEditing ? 'Configurações do Módulo' : 'Novo Módulo'}</CardTitle>
              <CardDescription className="font-medium">Preencha os detalhes fundamentais para organizar seu conteúdo.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Título e Nome Interno */}
            <div className="space-y-2.5">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                Título do Módulo <RequiredMark />
              </Label>
              <div className="relative group">
                <Input 
                  placeholder="Ex: Introdução ao curso..." 
                  {...form.register('title')} 
                  className={`h-12 rounded-xl transition-all border-slate-200 focus:ring-4 focus:ring-primary/10 pl-11 font-bold ${form.formState.errors?.title ? 'border-red-500 bg-red-50/30' : 'bg-white/40 group-hover:bg-white'}`} 
                />
                <LayoutGrid className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${form.formState.errors?.title ? 'text-red-400' : 'text-slate-400 group-focus-within:text-primary'}`} />
              </div>
              {form.formState.errors?.title && (<p className="text-[10px] font-black uppercase text-red-500 ml-1">{String(form.formState.errors.title.message)}</p>)}
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                Identificador Interno <RequiredMark />
              </Label>
              <Input 
                placeholder="Ex: introducao" 
                {...form.register('name')} 
                className={`h-12 rounded-xl border-slate-200 font-mono text-sm uppercase tracking-wider ${form.formState.errors?.name ? 'border-red-500 bg-red-50/30' : 'bg-white/40 hover:bg-white'}`} 
              />
              {form.formState.errors?.name && (<p className="text-[10px] font-black uppercase text-red-500 ml-1">{String(form.formState.errors.name.message)}</p>)}
            </div>

            {/* Duração */}
            <div className="space-y-2.5">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                Tipo de Duração
              </Label>
              <Select value={form.watch('tipo_duracao')} onValueChange={(v) => form.setValue('tipo_duracao', v as any)}>
                <SelectTrigger className="h-12 rounded-xl bg-white/40 border-slate-200 font-bold">
                  <div className="flex items-center gap-2">
                    <FileType className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="Selecione" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="seg" className="font-bold">Segundos</SelectItem>
                  <SelectItem value="min" className="font-bold">Minutos</SelectItem>
                  <SelectItem value="hrs" className="font-bold">Horas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                Duração Estimada <RequiredMark />
              </Label>
              <div className="relative group">
                <Input 
                  placeholder="Ex: 120" 
                  {...form.register('duration')} 
                  className={`h-12 rounded-xl transition-all border-slate-200 pl-11 font-black ${form.formState.errors?.duration ? 'border-red-500 bg-red-50/30' : 'bg-white/40 group-hover:bg-white'}`} 
                />
                <Clock className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${form.formState.errors?.duration ? 'text-red-400' : 'text-slate-400 group-focus-within:text-primary'}`} />
              </div>
              {form.formState.errors?.duration && (<p className="text-[10px] font-black uppercase text-red-500 ml-1">{String(form.formState.errors.duration.message)}</p>)}
            </div>

            {/* Descrição e Conteúdo */}
            <div className="space-y-2.5 md:col-span-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                <AlignLeft className="h-3 w-3" /> Descrição Curta
              </Label>
              <Textarea 
                rows={3} 
                placeholder="Uma breve apresentação sobre o que será aprendido neste módulo..." 
                {...form.register('description')} 
                className="rounded-2xl border-slate-200 bg-white/40 hover:bg-white focus:bg-white transition-all font-medium py-4 px-5"
              />
            </div>

            <div className="space-y-2.5 md:col-span-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                <Settings2 className="h-3 w-3" /> Conteúdo / Observações Admin
              </Label>
              <Textarea 
                rows={4} 
                placeholder="Instruções internas, links de referência ou observações técnicas..." 
                {...form.register('content')} 
                className="rounded-2xl border-slate-200 bg-white/40 hover:bg-white focus:bg-white transition-all font-medium py-4 px-5"
              />
            </div>

            {/* Ativar Switch */}
            <div 
              className={`flex items-center justify-between rounded-2xl border-2 p-5 transition-all duration-300 md:col-span-2 ${
                isActive 
                  ? 'border-green-500/30 bg-green-50/30 dark:bg-green-500/5' 
                  : 'border-slate-200 dark:border-slate-800 bg-white/30'
              }`}
            >
              <div className="space-y-1">
                <Label className="text-base font-black text-foreground/90 flex items-center gap-2">
                  Módulo Ativo
                  {isActive && <Check className="h-4 w-4 text-green-500" />}
                </Label>
                <p className="text-xs text-muted-foreground font-medium italic">Define se este módulo está visível para os alunos e disponível para seleção nos cursos.</p>
              </div>
              <Switch 
                checked={isActive} 
                onCheckedChange={(checked) => form.setValue('active', checked)} 
                className="data-[state=checked]:bg-green-500 scale-125"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex items-center justify-between gap-4 py-4 px-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => form.reset()}
          className="h-12 px-6 rounded-xl font-bold border-slate-200 hover:bg-slate-50 transition-all gap-2"
        >
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
          Restaurar
        </Button>
        <div className="flex items-center gap-3">
          <Button 
            type="button" 
            onClick={handleFormSubmit}
            className="h-12 px-10 rounded-xl font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95 gap-2"
          >
            <Save className="h-4 w-4" />
            {isEditing ? 'Salvar Alterações' : 'Criar Módulo'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModuleForm;