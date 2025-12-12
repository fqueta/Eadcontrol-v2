import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { coursesService } from '@/services/coursesService';
import type { TurmaPayload, TurmaRecord, SimNao } from '@/types/turmas';

/**
 * ClassForm
 * pt-BR: Formulário em abas para criar/editar turmas.
 * en-US: Tabbed form to create/edit classes.
 */
export function ClassForm({
  initialData,
  onSubmit,
  isSubmitting,
}: {
  initialData?: TurmaRecord | TurmaPayload | null;
  onSubmit: (data: TurmaPayload) => Promise<void> | void;
  isSubmitting?: boolean;
}) {
  /**
   * location/navigate
   * pt-BR: Integra com o roteador para refletir `?tab=` e permitir histórico.
   * en-US: Integrates with router to reflect `?tab=` and allow history.
   */
  const navigate = useNavigate();
  /**
   * getClassFormTabStorageKey
   * pt-BR: Gera a chave de storage para guardar/restaurar a aba ativa da Turma.
   *        Usa o ID/TOKEN da turma quando disponível, senão 'new'.
   * en-US: Generates storage key to persist/restore active tab of the Class form.
   *        Uses class ID/TOKEN when available, otherwise 'new'.
   */
  const getClassFormTabStorageKey = () => {
    const id = (initialData as any)?.id ?? (initialData as any)?.token ?? 'new';
    return `classform:activeTab:${String(id)}`;
  };

  /**
   * activeTab
   * pt-BR: Controla a aba ativa de forma controlada e persiste em sessionStorage.
   *        Lê `?tab=` do URL, depois sessionStorage, por fim usa 'info'.
   * en-US: Controls active tab and persists to sessionStorage.
   *        Reads `?tab=` from URL, then sessionStorage, finally defaults to 'info'.
   */
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const urlTab = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('tab')
        : null;
      if (urlTab) return urlTab;
      const stored = typeof window !== 'undefined'
        ? window.sessionStorage.getItem(getClassFormTabStorageKey())
        : null;
      return stored || 'info';
    } catch {
      return 'info';
    }
  });

  /**
   * pt-BR: Reflete mudança da aba em sessionStorage e no URL (replaceState),
   *        mantendo histórico limpo.
   * en-US: Reflects tab changes into sessionStorage and URL (replaceState),
   *        keeping history tidy.
   */
  useEffect(() => {
    try {
      const key = getClassFormTabStorageKey();
      window.sessionStorage.setItem(key, activeTab);
      const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
      const currentTab = new URLSearchParams(currentSearch).get('tab');
      if (currentTab !== activeTab) {
        const params = new URLSearchParams(currentSearch);
        params.set('tab', activeTab);
        navigate({ search: `?${params.toString()}` }, { replace: false });
      }
    } catch {}
  }, [activeTab, initialData, navigate]);
  /**
   * classSchema
   * pt-BR: Valida campos principais, datas/horários, pagamento e configuração.
   * en-US: Validates core fields, dates/times, payment and configuration.
   */
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
    // pt-BR: Configurações adicionais guardadas no objeto config
    // en-US: Additional settings stored inside config object
    config: z.any().optional(),
  });

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

  /**
   * applyInitialData
   * pt-BR: Preenche o formulário quando em modo de edição.
   * en-US: Populates the form when in edit mode.
   */
  useEffect(() => {
    if (!initialData) return;
    form.reset({
      ...(initialData as TurmaRecord),
    });
  }, [initialData]);

  /**
   * autoTokenFromName
   * pt-BR: Gera token automaticamente a partir do nome quando vazio.
   * en-US: Auto-generates token from name when empty.
   */
  useEffect(() => {
    const nome = form.watch('nome');
    const token = form.watch('token');
    if (!token && nome) {
      const slug = String(nome)
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      form.setValue('token', slug);
    }
  }, [form.watch('nome')]);

  /**
   * coursesQuery
   * pt-BR: Lista cursos para seleção (id_curso).
   * en-US: Lists courses for selection (id_curso).
   */
  const coursesQuery = useQuery({
    queryKey: ['cursos', 'list', 200],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 200 }),
  });
  const courseOptions = useMemo(
    () => (coursesQuery.data?.data ?? []).map((c: any) => ({ id: String(c.id), nome: c.nome ?? String(c.id) })),
    [coursesQuery.data]
  );

  /**
   * handleSubmit
   * pt-BR: Encaminha valores do formulário ao callback externo.
   * en-US: Forwards form values to the external callback.
   */
  const handleSubmit = async () => {
    const values = form.getValues();
    await onSubmit(values);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="schedule">Datas/Horários</TabsTrigger>
          <TabsTrigger value="payment">Pagamento</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>

        {/* Informações */}
        <TabsContent value="info" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Nome do curso (select) */}
              <div>
                <Label>Nome do curso</Label>
                <Select value={String(form.watch('id_curso') ?? '')} onValueChange={(v) => form.setValue('id_curso', Number(v))}>
                  <SelectTrigger><SelectValue placeholder="-- Selecione --" /></SelectTrigger>
                  <SelectContent>
                    {courseOptions.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nome da Turma */}
              <div>
                <Label>Nome da Turma</Label>
                <Input {...form.register('nome')} placeholder="Nome da Turma" />
              </div>

              {/* Ativar: Sim/Não */}
              <div className="flex items-center gap-3">
                <Label>Ativar</Label>
                <Switch checked={form.watch('ativo') === 's'} onCheckedChange={(checked) => form.setValue('ativo', checked ? 's' : 'n')} />
                <span className="text-xs text-muted-foreground">{form.watch('ativo') === 's' ? 'Sim' : 'Não'}</span>
              </div>

              {/* Link da turma no cavok */}
              <div className="md:col-span-3">
                <Label>Link da turma no cavok</Label>
                <Input {...form.register('config.link_cavok')} placeholder="Link da turma no cavok" />
              </div>

              {/* Min/Max/Meta alunos */}
              <div>
                <Label>Min de alunos</Label>
                <Input type="number" {...form.register('min_alunos', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Máx de alunos</Label>
                <Input type="number" {...form.register('max_alunos', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Meta de alunos</Label>
                <Input type="number" {...form.register('config.meta_alunos', { valueAsNumber: true })} />
              </div>

              {/* Datas e duração */}
              <div>
                <Label>Data Início</Label>
                <Input type="date" {...form.register('inicio')} />
              </div>
              <div>
                <Label>Carga horária</Label>
                <Input type="number" {...form.register('duracao', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Unidade de duração</Label>
                <Select value={String(form.watch('unidade_duracao') ?? '')} onValueChange={(v) => form.setValue('unidade_duracao', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Seg">Segundo(s)</SelectItem>
                    <SelectItem value="Min">Minuto(s)</SelectItem>
                    <SelectItem value="Hrs">Hora(s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Hora início */}
              <div>
                <Label>Hora início</Label>
                <Input type="time" {...form.register('hora_inicio')} />
              </div>

              {/* Data fim */}
              <div>
                <Label>Data fim</Label>
                <Input type="date" {...form.register('fim')} />
              </div>

              {/* Dias da semana */}
              <div className="md:col-span-3">
                <Label>Dia(s) da semana em que será realizado</Label>
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {([
                    { key: 'dia1', label: 'Seg' },
                    { key: 'dia2', label: 'Ter' },
                    { key: 'dia3', label: 'Qua' },
                    { key: 'dia4', label: 'Qui' },
                    { key: 'dia5', label: 'Sex' },
                    { key: 'dia6', label: 'Sáb' },
                    { key: 'dia7', label: 'Dom' },
                  ] as const).map(({ key, label }) => (
                    <Button
                      key={key}
                      type="button"
                      variant={form.watch(key as keyof TurmaPayload) === 's' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => form.setValue(key as any, form.watch(key as any) === 's' ? 'n' : 's')}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div className="md:col-span-3">
                <Label>Observações</Label>
                <Textarea {...form.register('obs')} placeholder="Observações" />
              </div>

              {/* Configurações Adicionais */}
              <div className="md:col-span-3 border-t pt-4 mt-2">
                <Label className="block mb-2">Configurações Adicionais</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Turma de fim de semana?</Label>
                    <Select value={String(form.watch('config.fim_semana') ?? 'n')} onValueChange={(v) => form.setValue('config.fim_semana' as any, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="n">Não</SelectItem>
                        <SelectItem value="s">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Porcentagem de Entrada</Label>
                    <Input type="number" step="1" {...form.register('config.percentual_entrada', { valueAsNumber: true })} placeholder="Ex: 30" />
                  </div>
                  <div>
                    <Label>Professor (ID)</Label>
                    <Input type="number" {...form.register('professor', { valueAsNumber: true })} />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Datas/Horários */}
        <TabsContent value="schedule" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Início</Label>
                <Input type="date" {...form.register('inicio')} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="date" {...form.register('fim')} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.watch('TemHorario') === 's'} onCheckedChange={(checked) => form.setValue('TemHorario', checked ? 's' : 'n')} />
                <Label>Horário definido</Label>
              </div>
              <div>
                <Label>Hora Início</Label>
                <Input type="time" {...form.register('hora_inicio')} />
              </div>
              <div>
                <Label>Hora Fim</Label>
                <Input type="time" {...form.register('hora_fim')} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-7 gap-4 pt-2">
              {(['dia1','dia2','dia3','dia4','dia5','dia6','dia7'] as const).map((d) => (
                <div key={d} className="flex items-center gap-3">
                  <Switch checked={form.watch(d) === 's'} onCheckedChange={(c) => form.setValue(d, c ? 's' : 'n')} />
                  <Label>{d.toUpperCase()}</Label>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Pagamento */}
        <TabsContent value="payment" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Método Pgto</Label>
                <Input {...form.register('Pgto')} placeholder="Ex.: cartão, pix" />
              </div>
              <div>
                <Label>Valor</Label>
                <Input type="number" step="0.01" {...form.register('Valor', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Matrícula</Label>
                <Input type="number" step="0.01" {...form.register('Matricula', { valueAsNumber: true })} />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Configuração */}
        <TabsContent value="config" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <Label>Quadro</Label>
              <Textarea {...form.register('Quadro')} placeholder="Estrutura/Quadro da turma" />
            </div>
            <div>
              <Label>Config (JSON)</Label>
              <Textarea {...form.register('config')} placeholder="Objeto de configuração em JSON" />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => form.reset()}>Limpar</Button>
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>Salvar</Button>
      </div>
    </div>
  );
}