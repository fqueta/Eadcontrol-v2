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
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { coursesService } from '@/services/coursesService';
import { usersService } from '@/services/usersService';
import type { TurmaPayload, TurmaRecord } from '@/types/turmas';
import { Loader2, Save, X, Calendar, Clock, DollarSign, Settings, Info, Users, BookOpen } from 'lucide-react';

const simNao = z.enum(['s', 'n']);
const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/; // HH:mm[:ss]
const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

const classSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  id_curso: z.coerce.number().int('Curso inválido'),
  nome: z.string().optional(),
  inicio: z.string().regex(dateRegex, 'Data inválida (YYYY-MM-DD)').optional().or(z.literal('').optional()),
  fim: z.string().regex(dateRegex, 'Data inválida (YYYY-MM-DD)').optional().or(z.literal('').optional()),
  professor: z.coerce.number().int('Professor inválido'),
  Pgto: z.string().optional(),
  Valor: z.coerce.number().min(0).optional(),
  Matricula: z.coerce.number().min(0).optional(),
  hora_inicio: z.string().regex(timeRegex, 'Hora inválida (HH:mm)').optional().or(z.literal('').optional()),
  hora_fim: z.string().regex(timeRegex, 'Hora inválida (HH:mm)').optional().or(z.literal('').optional()),
  duracao: z.coerce.number().int('Duração deve ser inteiro').optional(),
  unidade_duracao: z.string().min(1, 'Unidade é obrigatória'),
  dia1: simNao.default('n'),
  dia2: simNao.default('n'),
  dia3: simNao.default('n'),
  dia4: simNao.default('n'),
  dia5: simNao.default('n'),
  dia6: simNao.default('n'),
  dia7: simNao.default('n'),
  TemHorario: simNao.default('n'),
  Quadro: z.string().optional(),
  autor: z.coerce.number().int('Autor inválido'),
  ativo: simNao.default('s'),
  ordenar: z.coerce.number().int().optional(),
  Cidade: z.string().optional(),
  QuemseDestina: z.string().optional(),
  Novo: z.string().length(1).optional(),
  obs: z.string().optional(),
  max_alunos: z.coerce.number().int('Inteiro').min(0, '>= 0').optional(),
  min_alunos: z.coerce.number().int('Inteiro').min(0, '>= 0').optional(),
  config: z.any().optional(),
});

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

  const getClassFormTabStorageKey = () => {
    const id = (initialData as any)?.id ?? (initialData as any)?.token ?? 'new';
    return `classform:activeTab:${String(id)}`;
  };

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const urlTab = new URLSearchParams(location.search).get('tab');
      if (urlTab) return urlTab;
      const stored = window.sessionStorage.getItem(getClassFormTabStorageKey());
      return stored || 'info';
    } catch {
      return 'info';
    }
  });

  useEffect(() => {
    try {
      const key = getClassFormTabStorageKey();
      window.sessionStorage.setItem(key, activeTab);
      const params = new URLSearchParams(location.search);
      if (params.get('tab') !== activeTab) {
        params.set('tab', activeTab);
        navigate({ search: params.toString() }, { replace: true });
      }
    } catch {}
  }, [activeTab, location.search, navigate]);

  const form = useForm<TurmaPayload>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      token: '',
      id_curso: 0,
      nome: '',
      inicio: '',
      fim: '',
      professor: 0,
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
      Cidade: '',
      QuemseDestina: '',
      Novo: '',
      obs: '',
      max_alunos: 0,
      min_alunos: 0,
      config: {},
    },
  });

  useEffect(() => {
    if (!initialData) return;
    
    // Tratamento para JSON no config se vier como string do banco
    let parsedConfig = initialData.config;
    if (typeof parsedConfig === 'string') {
      try { parsedConfig = JSON.parse(parsedConfig); } catch { /* ignore */ }
    }
    
    form.reset({
      ...initialData,
      config: parsedConfig || {},
      inicio: initialData.inicio ? initialData.inicio.split('T')[0] : '', // garante YYYY-MM-DD
      fim: initialData.fim ? initialData.fim.split('T')[0] : '',
    } as any);
  }, [initialData, form]);

  useEffect(() => {
    const nome = form.watch('nome');
    const token = form.watch('token');
    if (!token && nome) {
      const slug = String(nome)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      form.setValue('token', slug, { shouldValidate: true });
    }
  }, [form.watch('nome')]);

  const coursesQuery = useQuery({
    queryKey: ['cursos', 'list', 200],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 200 }),
  });
  
  const courseOptions = useMemo(
    () => (coursesQuery.data?.data ?? []).map((c: any) => ({ id: String(c.id), nome: c.nome ?? String(c.id) })),
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

  const handleSubmit = async (values: TurmaPayload) => {
    // Preparar config de volta para string se for necessário pelo backend ou manter objeto
    const payloadToSubmit = { ...values };
    await onSubmit(payloadToSubmit);
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-14 bg-slate-100/80 dark:bg-slate-900/50 p-1 rounded-2xl mb-6">
            <TabsTrigger value="info" className="rounded-xl font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">
              <Info className="w-4 h-4 mr-2" /> Informações
            </TabsTrigger>
            <TabsTrigger value="schedule" className="rounded-xl font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">
              <Calendar className="w-4 h-4 mr-2" /> Horários
            </TabsTrigger>
            <TabsTrigger value="payment" className="rounded-xl font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">
              <DollarSign className="w-4 h-4 mr-2" /> Valores
            </TabsTrigger>
            <TabsTrigger value="config" className="rounded-xl font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">
              <Settings className="w-4 h-4 mr-2" /> Configurações
            </TabsTrigger>
          </TabsList>

          <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            {/* INFORMAÇÕES */}
            <TabsContent value="info" className="space-y-6 m-0 animate-in fade-in zoom-in-95 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="id_curso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Curso Vinculado</FormLabel>
                      <Select value={String(field.value || '')} onValueChange={(v) => field.onChange(Number(v))}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <SelectValue placeholder="Selecione um curso..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {courseOptions.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold flex items-center gap-2">Nome da Turma</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" placeholder="Ex: Turma A - Manhã" {...field} />
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
                      <FormLabel className="font-bold">Token (Identificador Único)</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono text-sm" placeholder="turma-a-manha" {...field} />
                      </FormControl>
                      <FormDescription>Usado em URLs e referências do sistema.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="professor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Professor</FormLabel>
                      <Select value={field.value ? String(field.value) : "0"} onValueChange={(v) => field.onChange(Number(v))}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <SelectValue placeholder="Selecione um professor..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl max-h-[300px]">
                          <SelectItem value="0">Nenhum professor</SelectItem>
                          {professorOptions.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <FormField
                  control={form.control}
                  name="min_alunos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Mínimo de Alunos</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-11 rounded-xl" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="max_alunos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Máximo de Alunos</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-11 rounded-xl" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="config.meta_alunos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Meta de Alunos</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-11 rounded-xl" {...field} value={field.value || ''} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <FormField
                  control={form.control}
                  name="obs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Observações Internas</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[100px] rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" placeholder="Anotações sobre a turma..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>

            {/* HORÁRIOS E DATAS */}
            <TabsContent value="schedule" className="space-y-8 m-0 animate-in fade-in zoom-in-95 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Data de Início</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900" {...field} />
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
                      <FormLabel className="font-bold">Data de Término</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800/60">
                <FormField
                  control={form.control}
                  name="duracao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Carga Horária Total</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input type="number" className="h-11 rounded-xl flex-1 bg-slate-50 dark:bg-slate-900" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormField
                          control={form.control}
                          name="unidade_duracao"
                          render={({ field: uf }) => (
                            <Select value={uf.value} onValueChange={uf.onChange}>
                              <SelectTrigger className="w-[140px] h-11 rounded-xl bg-slate-50 dark:bg-slate-900">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="Seg">Segundos</SelectItem>
                                <SelectItem value="Min">Minutos</SelectItem>
                                <SelectItem value="Hrs">Horas</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="TemHorario"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-bold">Horário Definido?</FormLabel>
                          <FormDescription>Habilite se as aulas possuírem horário fixo</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value === 's'} onCheckedChange={(c) => field.onChange(c ? 's' : 'n')} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('TemHorario') === 's' && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                      <FormField
                        control={form.control}
                        name="hora_inicio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-sm">Hora Início</FormLabel>
                            <FormControl>
                              <Input type="time" className="h-10 rounded-lg" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hora_fim"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-sm">Hora Fim</FormLabel>
                            <FormControl>
                              <Input type="time" className="h-10 rounded-lg" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800/60">
                <FormLabel className="font-bold mb-4 block">Dias da Semana</FormLabel>
                <div className="flex flex-wrap gap-3">
                  {diasSemana.map(({ key, label }) => (
                    <FormField
                      key={key}
                      control={form.control}
                      name={key as any}
                      render={({ field }) => {
                        const isActive = field.value === 's';
                        return (
                          <FormItem>
                            <FormControl>
                              <Button
                                type="button"
                                variant={isActive ? "default" : "outline"}
                                className={`rounded-xl h-10 px-4 font-bold transition-all ${isActive ? 'shadow-md shadow-primary/20' : 'bg-slate-50 dark:bg-slate-900'}`}
                                onClick={() => field.onChange(isActive ? 'n' : 's')}
                              >
                                {label}
                              </Button>
                            </FormControl>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* PAGAMENTO */}
            <TabsContent value="payment" className="space-y-6 m-0 animate-in fade-in zoom-in-95 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="Pgto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Método de Pagamento</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900" placeholder="Ex: Cartão, Boleto, Pix..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Valor do Curso (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 font-medium text-lg" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Matricula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Taxa de Matrícula (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 font-medium text-lg" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>

            {/* CONFIGURAÇÕES */}
            <TabsContent value="config" className="space-y-6 m-0 animate-in fade-in zoom-in-95 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="ativo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-bold">Turma Ativa</FormLabel>
                        <FormDescription>Define se a turma está visível e operante no sistema</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value === 's'} onCheckedChange={(c) => field.onChange(c ? 's' : 'n')} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="config.fim_semana"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-bold">Turma de Fim de Semana?</FormLabel>
                        <FormDescription>Configuração especial para turmas intensivas</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value === 's'} onCheckedChange={(c) => field.onChange(c ? 's' : 'n')} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <FormField
                  control={form.control}
                  name="config.link_cavok"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Link da Turma (Cavok)</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900" placeholder="https://..." {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="config.percentual_entrada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Percentual de Entrada (%)</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900" placeholder="Ex: 30" {...field} value={field.value || ''} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="Quadro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Estrutura / Quadro da Turma</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[100px] rounded-xl bg-slate-50 dark:bg-slate-900" placeholder="Detalhes do quadro..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center justify-end gap-3 pt-6">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => navigate('/admin/school/classes')} 
            className="h-12 px-6 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <X className="w-4 h-4 mr-2" /> Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20 text-md"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Salvar Turma
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}