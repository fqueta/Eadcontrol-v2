import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { coursesService } from '@/services/coursesService';
import { usersService } from '@/services/usersService';
import type { TurmaPayload, TurmaRecord } from '@/types/turmas';
import { Loader2, Save, X, Calendar, Clock, DollarSign, Settings, Info, Users, BookOpen } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const simNao = z.enum(['s', 'n']).nullable().optional().transform(v => v ?? 'n');
const simNaoAtivo = z.enum(['s', 'n']).nullable().optional().transform(v => v ?? 's');

const classSchema = z.object({
  id_curso: z.coerce.number().min(1, 'Selecione um curso'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  token: z.string().nullable().optional(),
  inicio: z.string().nullable().optional(),
  fim: z.string().nullable().optional(),
  professor: z.string().nullable().optional(),
  Pgto: z.string().nullable().optional(),
  Valor: z.coerce.number().nullable().optional(),
  Matricula: z.coerce.number().nullable().optional(),
  hora_inicio: z.string().nullable().optional(),
  hora_fim: z.string().nullable().optional(),
  duracao: z.coerce.number().nullable().optional(),
  unidade_duracao: z.string().nullable().optional().default('Hrs'),
  dia1: simNao,
  dia2: simNao,
  dia3: simNao,
  dia4: simNao,
  dia5: simNao,
  dia6: simNao,
  dia7: simNao,
  TemHorario: simNao,
  Quadro: z.string().nullable().optional(),
  autor: z.coerce.number().nullable().optional(),
  ativo: simNaoAtivo,
  ordenar: z.coerce.number().nullable().optional(),
  obs: z.string().nullable().optional(),
  config: z.any().optional(),
});

const toSlug = (text: string) => {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export function ClassForm({
  initialData,
  onSubmit,
  isSubmitting,
}: {
  initialData?: TurmaRecord | TurmaPayload | null;
  onSubmit: (data: TurmaPayload) => Promise<void> | void;
  isSubmitting?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('info');

  const formValues = useMemo(() => {
    if (!initialData) return undefined;
    let parsedConfig = initialData.config;
    if (typeof parsedConfig === 'string') {
      try { parsedConfig = JSON.parse(parsedConfig); } catch { parsedConfig = {}; }
    }
    return {
      ...initialData,
      config: parsedConfig || {},
      inicio: initialData.inicio ? String(initialData.inicio).substring(0, 10) : '',
      fim: initialData.fim ? String(initialData.fim).substring(0, 10) : '',
      professor: initialData.professor ? String(initialData.professor) : "0",
      id_curso: initialData.id_curso ? Number(initialData.id_curso) : 0,
      autor: initialData.autor ? Number(initialData.autor) : 0,
    } as TurmaPayload;
  }, [initialData]);

  const form = useForm<TurmaPayload>({
    resolver: zodResolver(classSchema),
    values: formValues,
    defaultValues: {
      token: '',
      id_curso: 0,
      nome: '',
      inicio: '',
      fim: '',
      professor: "0",
      Pgto: '',
      Valor: 0,
      Matricula: 0,
      hora_inicio: '',
      hora_fim: '',
      duracao: 0,
      unidade_duracao: 'Hrs',
      dia1: 'n',
      dia2: 'n',
      dia3: 'n',
      dia4: 'n',
      dia5: 'n',
      dia6: 'n',
      dia7: 'n',
      TemHorario: 'n',
      Quadro: '',
      autor: 0,
      ativo: 's',
      ordenar: 0,
      config: {},
    },
  });

  const coursesQuery = useQuery({
    queryKey: ['cursos', 'list', 200],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 200 }),
  });
  
  const courseOptions = useMemo(
    () => (coursesQuery.data?.data ?? []).map((c: any) => ({ 
      id: String(c.id), 
      nome: c.titulo || c.nome || String(c.id),
      valor: c.valor || c.Valor || 0,
      matricula: c.matricula || c.Matricula || 0
    })),
    [coursesQuery.data]
  );

  const professorsQuery = useQuery({
    queryKey: ['users', 'professors'],
    queryFn: async () => usersService.listUsers({ permission_id: 6, per_page: 200 }),
  });

  const professorOptions = useMemo(
    () => (professorsQuery.data?.data ?? []).map((u: any) => ({ id: String(u.id), nome: u.name ?? u.email ?? String(u.id) })),
    [professorsQuery.data]
  );

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'nome' && !value.token) {
        form.setValue('token', toSlug(value.nome || ''), { shouldValidate: true });
      }
      if (name === 'token' && value.token) {
        const slugified = toSlug(value.token);
        if (slugified !== value.token) {
          form.setValue('token', slugified, { shouldValidate: true });
        }
      }
      if (name === 'id_curso' && value.id_curso) {
        const selectedCourse = courseOptions.find(c => c.id === String(value.id_curso));
        if (selectedCourse) {
          if (!form.getValues('Valor')) form.setValue('Valor', selectedCourse.valor);
          if (!form.getValues('Matricula')) form.setValue('Matricula', selectedCourse.matricula);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, courseOptions]);

  const handleSubmit = async (values: TurmaPayload) => {
    const payload = { ...values };
    
    // Normalize optional fields to null if they are empty
    if (payload.professor === "0" || payload.professor === "") payload.professor = null;
    if (payload.inicio === "") payload.inicio = null;
    if (payload.fim === "") payload.fim = null;
    if (payload.hora_inicio === "") payload.hora_inicio = null;
    if (payload.hora_fim === "") payload.hora_fim = null;
    if (payload.Pgto === "") payload.Pgto = null;
    if (payload.Quadro === "") payload.Quadro = null;
    if (payload.token === "") payload.token = null;

    await onSubmit(payload);
  };

  const handleValidationErrors = (errors: any) => {
    console.log("Erro de validação:", errors);
    toast({
      title: 'Atenção aos campos',
      description: 'Verifique se há campos obrigatórios vazios ou com formato incorreto.',
      variant: 'destructive',
    });
  };

  const diasSemana = [
    { key: 'dia1', label: 'Segunda' },
    { key: 'dia2', label: 'Terça' },
    { key: 'dia3', label: 'Quarta' },
    { key: 'dia4', label: 'Quinta' },
    { key: 'dia5', label: 'Sexta' },
    { key: 'dia6', label: 'Sábado' },
    { key: 'dia7', label: 'Domingo' },
  ] as const;

  return (
    <div className="space-y-4">
      <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit, handleValidationErrors)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-14 bg-slate-100/80 dark:bg-slate-900/50 p-1 rounded-2xl mb-6">
            <TabsTrigger value="info" className="rounded-xl font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950">
              <Info className="w-4 h-4 mr-2" /> Informações
            </TabsTrigger>
            <TabsTrigger value="schedule" className="rounded-xl font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950">
              <Calendar className="w-4 h-4 mr-2" /> Horários
            </TabsTrigger>
            <TabsTrigger value="payment" className="rounded-xl font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950">
              <DollarSign className="w-4 h-4 mr-2" /> Valores
            </TabsTrigger>
            <TabsTrigger value="config" className="rounded-xl font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950">
              <Settings className="w-4 h-4 mr-2" /> Configurações
            </TabsTrigger>
          </TabsList>

          <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <TabsContent value="info" className="space-y-6 m-0 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="id_curso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Curso Vinculado *</FormLabel>
                      {coursesQuery.isLoading ? (
                        <div className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 flex items-center px-3">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60 mr-2" />
                          <span className="text-sm text-muted-foreground">Carregando cursos...</span>
                        </div>
                      ) : (
                        <Select value={field.value ? String(field.value) : undefined} onValueChange={(v) => field.onChange(Number(v))}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200">
                              <SelectValue placeholder="Selecione um curso..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            {courseOptions.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Nome da Turma *</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900" placeholder="Ex: Turma A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Token (URL)</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono" placeholder="slug-da-turma" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="professor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Professor</FormLabel>
                      {professorsQuery.isLoading ? (
                        <div className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 flex items-center px-3">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60 mr-2" />
                          <span className="text-sm text-muted-foreground">Carregando professores...</span>
                        </div>
                      ) : (
                        <Select value={field.value ? String(field.value) : "0"} onValueChange={(v) => field.onChange(v)}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900">
                              <SelectValue placeholder="Selecione um professor..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="0">Nenhum professor</SelectItem>
                            {professorOptions.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-8 m-0 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="inicio"
                  render={({ field }) => (
                    <FormItem><FormLabel className="font-bold">Data de Início</FormLabel><FormControl><Input type="date" className="h-11 rounded-xl" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fim"
                  render={({ field }) => (
                    <FormItem><FormLabel className="font-bold">Data de Término</FormLabel><FormControl><Input type="date" className="h-11 rounded-xl" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )}
                />
              </div>
              <div className="pt-6 border-t">
                <FormLabel className="font-bold mb-4 block">Dias da Semana</FormLabel>
                <div className="flex flex-wrap gap-3">
                  {diasSemana.map(({ key, label }) => (
                    <FormField key={key} control={form.control} name={key as any} render={({ field }) => (
                      <Button type="button" variant={field.value === 's' ? "default" : "outline"} className="rounded-xl font-bold" onClick={() => field.onChange(field.value === 's' ? 'n' : 's')}>{label}</Button>
                    )} />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-6 m-0 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="Valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Valor do Curso (BRL)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">R$</span>
                          <Input 
                            className="h-12 pl-10 rounded-xl bg-slate-50 dark:bg-slate-900 text-lg font-bold text-primary" 
                            type="text"
                            value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(field.value || 0)}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^\d]/g, '');
                              field.onChange(Number(val) / 100);
                            }}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Matricula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Taxa de Matrícula (BRL)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">R$</span>
                          <Input 
                            className="h-12 pl-10 rounded-xl bg-slate-50 dark:bg-slate-900 text-lg font-bold text-primary" 
                            type="text"
                            value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(field.value || 0)}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^\d]/g, '');
                              field.onChange(Number(val) / 100);
                            }}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>

            <TabsContent value="config" className="space-y-6 m-0 animate-in fade-in duration-300">
              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 bg-slate-50/50">
                    <FormLabel className="font-bold">Turma Ativa</FormLabel>
                    <FormControl><Switch checked={field.value === 's'} onCheckedChange={(c) => field.onChange(c ? 's' : 'n')} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="obs"
                render={({ field }) => (
                  <FormItem><FormLabel className="font-bold">Obs</FormLabel><FormControl><Textarea className="min-h-[100px] rounded-xl" {...field} value={field.value || ''} /></FormControl></FormItem>
                )}
              />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center justify-end gap-3 pt-6">
          <Button type="button" variant="ghost" onClick={() => navigate('/admin/school/classes')} className="h-12 px-6 rounded-xl font-bold">Cancelar</Button>
          <Button type="submit" disabled={isSubmitting} className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Turma</>}
          </Button>
        </div>
      </form>
    </Form>
    </div>
  );
}
