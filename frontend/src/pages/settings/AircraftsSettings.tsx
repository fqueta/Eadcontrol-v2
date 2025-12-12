import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aircraftService } from '@/services/aircraftService';
import { aircraftSettingsService } from '@/services/aircraftSettingsService';
import { AircraftSettingsPayload, AircraftPackage } from '@/types/aircraftSettings';
import { PaginatedResponse } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { currencyApplyMask, currencyRemoveMaskToString } from '@/lib/masks/currency';
import useDebounce from '@/hooks/useDebounce';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

type PackageForm = AircraftPackage & { label?: string };

/**
 * CURRENCY_OPTIONS — opções suportadas para seleção de moeda
 * pt-BR: Define as moedas disponíveis para pacotes.
 * en-US: Defines available currencies for packages.
 */
const CURRENCY_OPTIONS = ['BRL', 'USD'] as const;

/**
 * AircraftsSettings — Página de CRUD de cadastro de aeronaves
 * pt-BR: Página moderna com tabs e formulário tipado para o payload solicitado.
 * en-US: Modern page with tabs and a typed form for the requested payload.
 */
const AircraftsSettings = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [prefixInput, setPrefixInput] = useState('');
  const [packages, setPackages] = useState<PackageForm[]>([]);
  const [prefixes, setPrefixes] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * getInitialParamsFromURL
   * pt-BR: Lê `search`, `page` e `per_page` da URL para inicializar estados.
   * en-US: Reads `search`, `page`, and `per_page` from URL to initialize state.
   */
  const getInitialParamsFromURL = () => {
    const qs = new URLSearchParams(location.search);
    const search = qs.get('search') || '';
    const pageQS = Number(qs.get('page') || 1);
    const perQS = Number(qs.get('per_page') || 100);
    return {
      searchTerm: search,
      page: Number.isNaN(pageQS) ? 1 : pageQS,
      perPage: Number.isNaN(perQS) ? 100 : perQS,
    };
  };

  const init = getInitialParamsFromURL();
  const [perPage, setPerPage] = useState<number>(init.perPage);
  const [page, setPage] = useState<number>(init.page);
  const [searchTerm, setSearchTerm] = useState<string>(init.searchTerm);
  const [editingId, setEditingId] = useState<string | number | null>(null);

  /**
   * debouncedSearch
   * pt-BR: Debounce de 400ms para buscar por nome sem sobrecarregar o backend.
   * en-US: 400ms debounce to search by name without flooding the backend.
   */
  const debouncedSearch = useDebounce(searchTerm, 400);

  // Lista básica de aeronaves já existentes (para tabela)
  const listQuery = useQuery({
    queryKey: ['aeronaves', 'list', perPage, debouncedSearch, page],
    //
    // Lista as aeronaves do endpoint de configurações `/aeronaves`
    // pt-BR: Usa o serviço de settings para refletir os campos da imagem.
    // en-US: Uses settings service to reflect columns shown in the screenshot.
    /**
     * queryFn — lista aeronaves com suporte a paginação e busca.
     * pt-BR: Inclui `search` quando houver termo (busca por nome).
     * en-US: Includes `search` when a term exists (name search).
     */
    queryFn: async (): Promise<PaginatedResponse<any>> => {
      const params: any = { page, per_page: perPage };
      if (debouncedSearch?.trim()) params.search = debouncedSearch.trim();
      return aircraftSettingsService.list(params);
    },
  });

  /**
   * resetPageOnParamsChange
   * pt-BR: Reinicia a página para 1 quando filtros mudam (perPage ou busca).
   * en-US: Resets page to 1 when filters change (perPage or search).
   */
  useEffect(() => {
    setPage(1);
  }, [perPage, debouncedSearch]);

  /**
   * syncURLWithParams
   * pt-BR: Persiste `search`, `page` e `per_page` em URLSearchParams para links.
   * en-US: Persists `search`, `page`, and `per_page` in URLSearchParams for shareable links.
   */
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (page && page !== 1) params.set('page', String(page));
    if (perPage && perPage !== 100) params.set('per_page', String(perPage));
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
  }, [searchTerm, page, perPage, navigate, location.pathname]);

  // Formulário principal
  const form = useForm<AircraftSettingsPayload>({
    defaultValues: {
      nome: '',
      codigo: '',
      ativo: 's',
      tipo: '',
      descricao: '',
      hora_rescisao: '',
      pacotes: {},
      config: { combustivel: { consumo_hora: '', preco_litro: '', ativar: 's' }, prefixos: [] },
    },
    mode: 'onBlur',
  });

  // Mutação para salvar configurações
  const createMutation = useMutation({
    mutationFn: async (payload: AircraftSettingsPayload) => {
      return aircraftSettingsService.saveSettings(payload);
    },
    onSuccess: (res) => {
      toast({ title: 'Aeronave salva', description: res?.message || 'Configurações registradas com sucesso.' });
      setOpen(false);
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['aircrafts', 'list'] });
    },
    onError: (err: any) => {
      toast({ title: 'Falha ao salvar', description: err?.message || 'Verifique os dados e tente novamente.', variant: 'destructive' });
    },
  });

  /**
   * updateMutation — atualiza aeronave existente
   * pt-BR: Envia atualização pelo serviço de configurações.
   * en-US: Sends update via settings service.
   */
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string | number; payload: AircraftSettingsPayload }) => {
      return aircraftSettingsService.updateSettings(id, payload);
    },
    onSuccess: (res) => {
      toast({ title: 'Aeronave atualizada', description: res?.message || 'Configurações atualizadas com sucesso.' });
      setOpen(false);
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['aeronaves', 'list'] });
    },
    onError: (err: any) => {
      toast({ title: 'Falha ao atualizar', description: err?.message || 'Verifique os dados e tente novamente.', variant: 'destructive' });
    },
  });

  /**
   * deleteMutation — remove aeronave
   * pt-BR: Exclui cadastro pelo ID.
   * en-US: Deletes record by ID.
   */
  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      return aircraftSettingsService.deleteById(id);
    },
    onSuccess: () => {
      toast({ title: 'Aeronave removida', description: 'Registro excluído com sucesso.' });
      qc.invalidateQueries({ queryKey: ['aeronaves', 'list'] });
    },
    onError: (err: any) => {
      toast({ title: 'Falha ao remover', description: err?.message || 'Não foi possível excluir o registro.', variant: 'destructive' });
    },
  });

  /**
   * handleAddPackage — adiciona um pacote de horas ao formulário
   * pt-BR: Empilha um novo pacote com campos em BRL/USD e limite.
   * en-US: Adds a new package with BRL/USD fields and limit.
   */
  const handleAddPackage = () => {
    setPackages((prev) => ([...prev, { label: `Pacote ${prev.length + 1}`, moeda: 'BRL', limite: '1', "hora-seca": '', "hora-seca_dolar": '' }]));
  };

  /**
   * handleRemovePackage — remove um pacote pelo índice
   */
  const handleRemovePackage = (index: number) => {
    setPackages((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * handlePackageCurrencyChange — altera a moeda selecionada de um pacote
   * pt-BR: Atualiza o campo `moeda` do pacote pelo índice.
   * en-US: Updates the `moeda` field of the package by index.
   */
  const handlePackageCurrencyChange = (index: number, value: string) => {
    setPackages((prev) => prev.map((p, i) => (i === index ? { ...p, moeda: value } : p)));
  };

  /**
   * handleAddPrefix — adiciona prefixo ao array de prefixos
   */
  const handleAddPrefix = () => {
    const v = prefixInput.trim();
    if (!v) return;
    setPrefixes((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setPrefixInput('');
  };

  /**
   * handleRemovePrefix — remove um prefixo pelo valor
   */
  const handleRemovePrefix = (value: string) => {
    setPrefixes((prev) => prev.filter((p) => p !== value));
  };

  // Mantém sincronizado com o form config.prefixos
  useEffect(() => {
    form.setValue('config.prefixos', prefixes);
  }, [prefixes]);

  /**
   * buildPayload — monta o payload final respeitando a estrutura requerida
   * pt-BR: Converte a lista de packages em objeto numerado: { "1": { ... }, ... }.
   * en-US: Converts packages list into a numbered object: { "1": { ... }, ... }.
   */
  const buildPayload = (base: AircraftSettingsPayload): AircraftSettingsPayload => {
    const pacotesObj: Record<string, AircraftPackage> = {};
    packages.forEach((pkg, idx) => {
      const key = String(idx + 1);
      const { label, ...values } = pkg;
      // Converte possíveis campos monetários para string decimal
      pacotesObj[key] = {
        ...values,
        // BRL
        'hora-seca': values['hora-seca'] ? currencyRemoveMaskToString(String(values['hora-seca'])) : values['hora-seca'],
        // USD
        'hora-seca_dolar': values['hora-seca_dolar'] ? currencyRemoveMaskToString(String(values['hora-seca_dolar'])) : values['hora-seca_dolar'],
      };
    });
    // Normaliza consumo/preço do combustível e campos monetários gerais
    const consumo = String(base?.config?.combustivel?.consumo_hora ?? '')
      .replace(/[^\d,\.]/g, '')
      .replace(',', '.');
    const precoLitro = currencyRemoveMaskToString(String(base?.config?.combustivel?.preco_litro ?? ''));
    const horaRescisao = currencyRemoveMaskToString(String(base?.hora_rescisao ?? ''));

    return {
      ...base,
      hora_rescisao: horaRescisao,
      pacotes: pacotesObj,
      config: {
        ...(base.config || {}),
        combustivel: {
          ...(base.config?.combustivel || {}),
          consumo_hora: consumo,
          preco_litro: precoLitro,
        },
      },
    };
  };

  /**
   * onSubmit — envia o formulário para criação/atualização
   * pt-BR: Salva as configurações completas via serviço dedicado.
   * en-US: Saves full settings using the dedicated service.
   */
  /**
   * onSubmit — decide entre criar ou atualizar conforme contexto
   * pt-BR: Quando `editingId` estiver presente, faz update; caso contrário, cria.
   * en-US: If `editingId` is present, performs update; otherwise creates.
   */
  const onSubmit = (data: AircraftSettingsPayload) => {
    const payload = buildPayload(data);
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  /**
   * resolveAtivo — normaliza campo ativo
   * pt-BR: Aceita 's'/'n' ou booleanos.
   * en-US: Accepts 's'/'n' or booleans.
   */
  const resolveAtivo = (value: any): string => {
    if (value === 's' || value === true) return 'Sim';
    if (value === 'n' || value === false) return 'Não';
    return value ? 'Sim' : 'Não';
  };

  /**
   * resolvePublicar — tenta obter estado de publicação
   * pt-BR: Verifica chaves comuns: 'publicar', 'published', 'publish'.
   * en-US: Checks common keys: 'publicar', 'published', 'publish'.
   */
  const resolvePublicar = (item: any): string => {
    const v = item?.publicar ?? item?.published ?? item?.publish;
    if (v === undefined) return '-';
    if (v === 's' || v === true) return 'Sim';
    if (v === 'n' || v === false) return 'Não';
    return String(v);
  };

  /**
   * handleEdit — abre diálogo com dados para edição
   * pt-BR: Preenche formulário com campos principais do registro.
   * en-US: Prefills form with main fields from record.
   */
  const handleEdit = (row: any) => {
    setEditingId(row.id);
    // Prefill básicos
    form.reset({
      nome: row.nome ?? '',
      codigo: row.codigo ?? '',
      ativo: (row.ativo === 'n' || row.ativo === false) ? 'n' : 's',
      tipo: row.tipo ?? '',
      descricao: row.descricao ?? '',
      hora_rescisao: row.hora_rescisao ?? '',
      token: row.token ?? '',
      autor: row.autor ?? '',
      pacotes: row.pacotes ?? {},
      config: row.config ?? { combustivel: { consumo_hora: '', preco_litro: '', ativar: 's' }, prefixos: [] },
      id: row.id,
    });
    // Carregar pacotes no editor visual
    const pacs: PackageForm[] = [];
    const map = row.pacotes || {};
    Object.keys(map).forEach((k) => {
      const p = map[k];
      pacs.push({ label: `Pacote ${k}`, ...p });
    });
    setPackages(pacs);
    setPrefixes(row?.config?.prefixos || []);
    setOpen(true);
  };

  /**
   * handleDelete — exclui o registro selecionado
   */
  const handleDelete = (row: any) => {
    if (!row?.id) return;
    deleteMutation.mutate(row.id);
  };

  /**
   * handleView — exibe detalhes básicos via toast (placeholder)
   */
  const handleView = (row: any) => {
    toast({
      title: `Aeronave ${row?.codigo || row?.id}`,
      description: `Nome: ${row?.nome ?? '-'} | Código: ${row?.codigo ?? '-'}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Aeronaves</h1>
          <p className="text-sm text-muted-foreground">Cadastro e configurações de aeronaves</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>Novo cadastro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Nova aeronave</DialogTitle>
              <DialogDescription>Preencha os dados e salve para registrar</DialogDescription>
            </DialogHeader>

            <FormProvider {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="info" className="w-full">
                  <TabsList>
                    <TabsTrigger value="info">Informações</TabsTrigger>
                    <TabsTrigger value="packages">Pacotes de horas</TabsTrigger>
                    <TabsTrigger value="config">Configurações</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-4 pt-4">
                    <Card className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="nome">Nome</Label>
                          <Input id="nome" placeholder="Uirapuru - T-23" {...form.register('nome', { required: true })} />
                        </div>
                        <div>
                          <Label htmlFor="codigo">Código</Label>
                          <Input id="codigo" placeholder="T-23" {...form.register('codigo', { required: true })} />
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch checked={form.watch('ativo') === 's'} onCheckedChange={(val) => form.setValue('ativo', val ? 's' : 'n')} />
                          <Label>Ativar</Label>
                        </div>
                        <div>
                          <Label htmlFor="tipo">Tipo</Label>
                          <Input id="tipo" placeholder="" {...form.register('tipo')} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="descricao">Descrição</Label>
                        <Textarea id="descricao" rows={3} placeholder="Detalhes da aeronave" {...form.register('descricao')} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="hora_rescisao">Valor hora para rescisão</Label>
                          <Input
                            id="hora_rescisao"
                            placeholder="R$ 900,00"
                            value={form.watch('hora_rescisao') || ''}
                            onChange={(e) => {
                              const masked = currencyApplyMask(e.target.value, 'pt-BR', 'BRL');
                              form.setValue('hora_rescisao', masked, { shouldValidate: true });
                            }}
                          />
                        </div>
                        <div className="opacity-80">
                          <Label htmlFor="token">Token (opcional)</Label>
                          <Input id="token" placeholder="64d17cb86ff7b" {...form.register('token')} />
                        </div>
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="packages" className="space-y-4 pt-4">
                    <Card className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium">Gerenciar pacotes de horas</h3>
                          <p className="text-xs text-muted-foreground">Adicione valores BRL/USD por pacote</p>
                        </div>
                        <Button type="button" variant="secondary" onClick={handleAddPackage}>Adicionar pacote</Button>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        {packages.length === 0 && (
                          <p className="text-sm text-muted-foreground">Nenhum pacote adicionado</p>
                        )}
                        {packages.map((pkg, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                            <div className="md:col-span-2">
                              <Label>Nome do pacote</Label>
                              <Input value={pkg.label || ''} onChange={(e) => {
                                const v = e.target.value; setPackages((prev) => prev.map((p, i) => i === idx ? { ...p, label: v } : p));
                              }} placeholder={`Pacote ${idx + 1}`} />
                            </div>
                            <div>
                              <Label>Hora Seca (BRL)</Label>
                              <Input value={pkg["hora-seca"] || ''} onChange={(e) => {
                                const v = currencyApplyMask(e.target.value, 'pt-BR', 'BRL');
                                setPackages((prev) => prev.map((p, i) => i === idx ? { ...p, ["hora-seca"]: v } : p));
                              }} placeholder="R$ 600,00" />
                            </div>
                            <div>
                              <Label>Hora Seca (USD)</Label>
                              <Input value={pkg["hora-seca_dolar"] || ''} onChange={(e) => {
                                const v = currencyApplyMask(e.target.value, 'en-US', 'USD');
                                setPackages((prev) => prev.map((p, i) => i === idx ? { ...p, ["hora-seca_dolar"]: v } : p));
                              }} placeholder="$ 106.26" />
                            </div>
                            <div>
                              <Label>Moeda</Label>
                              <Select value={pkg.moeda || ''} onValueChange={(v) => handlePackageCurrencyChange(idx, v)}>
                                <SelectTrigger className="w-full h-10">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CURRENCY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>A partir de</Label>
                              <Input value={pkg.limite || ''} onChange={(e) => {
                                const v = e.target.value; setPackages((prev) => prev.map((p, i) => i === idx ? { ...p, limite: v } : p));
                              }} placeholder="1" />
                            </div>
                            <div className="flex md:justify-end">
                              <Button type="button" variant="destructive" onClick={() => handleRemovePackage(idx)}>Remover</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="config" className="space-y-4 pt-4">
                    <Card className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="consumo_hora">Consumo por hora</Label>
                          <Input
                            id="consumo_hora"
                            inputMode="decimal"
                            placeholder="25,00"
                            value={form.watch('config.combustivel.consumo_hora') || ''}
                            onChange={(e) => {
                              const raw = String(e.target.value || '').replace(/[^\d,\.]/g, '');
                              // Mantém apenas um separador decimal; normaliza para vírgula na UI
                              const normalized = raw
                                .replace(/\./g, ',')
                                .replace(/(,)(?=.*,)/g, '')
                                .replace(/(,\d{0,2}).*$/, '$1');
                              form.setValue('config.combustivel.consumo_hora', normalized, { shouldValidate: true });
                            }}
                            {...form.register('config.combustivel.consumo_hora', {
                              validate: (val) => {
                                if (!val) return true;
                                return /^(\d+)(?:[,\.]\d{1,2})?$/.test(String(val)) || 'Informe apenas números e até 2 decimais';
                              },
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="preco_litro">Preço por litro</Label>
                          <Input
                            id="preco_litro"
                            placeholder="R$ 0,00"
                            inputMode="numeric"
                            value={form.watch('config.combustivel.preco_litro') || ''}
                            onChange={(e) => {
                              const masked = currencyApplyMask(e.target.value, 'pt-BR', 'BRL');
                              form.setValue('config.combustivel.preco_litro', masked, { shouldValidate: true });
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch checked={form.watch('config.combustivel.ativar') === 's'} onCheckedChange={(val) => form.setValue('config.combustivel.ativar', val ? 's' : 'n')} />
                          <Label>Ativar combustível</Label>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        <Label>Prefixos</Label>
                        <div className="flex gap-2">
                          <Input value={prefixInput} onChange={(e) => setPrefixInput(e.target.value)} placeholder="PT-LMW" />
                          <Button type="button" variant="secondary" onClick={handleAddPrefix}>Adicionar</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {prefixes.map((p) => (
                            <Badge key={p} variant="outline" className="cursor-pointer" onClick={() => handleRemovePrefix(p)}>
                              {p} ✕
                            </Badge>
                          ))}
                          {prefixes.length === 0 && (
                            <p className="text-sm text-muted-foreground">Nenhum prefixo adicionado</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>

                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createMutation.isPending}>Salvar</Button>
                </div>
              </form>
            </FormProvider>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Aeronaves cadastradas</h2>
          <div className="flex items-center gap-3">
            {/* Busca por nome */}
            <div className="relative">
              {/* pt-BR: Campo de busca por nome; aplica debounce. */}
              {/* en-US: Name search field; applies debounce. */}
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[220px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Número de Linhas:</span>
              <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Navegação de páginas */}
            <div className="flex items-center gap-2">
              {/* pt-BR: Botões de navegação de páginas com estado desabilitado nas extremidades.
                  en-US: Page navigation buttons with disabled state at edges. */}
              <Button
                variant="outline"
                size="icon"
                title="Página anterior"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={(listQuery.data?.current_page ?? 1) <= 1 || listQuery.isFetching}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[120px] text-center">
                Página {listQuery.data?.current_page ?? page} de {listQuery.data?.last_page ?? '-'}
              </span>
              <Button
                variant="outline"
                size="icon"
                title="Próxima página"
                onClick={() => {
                  const last = listQuery.data?.last_page ?? page;
                  setPage((p) => Math.min(last, p + 1));
                }}
                disabled={(listQuery.data?.current_page ?? 1) >= (listQuery.data?.last_page ?? 1) || listQuery.isFetching}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">
              últimos {perPage} registros, {listQuery.data?.data?.length ?? 0} registros
            </span>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Codigo</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Publicar</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.data?.data?.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono">{a.id}</TableCell>
                <TableCell>{a.nome ?? '-'}</TableCell>
                <TableCell>{a.codigo ?? '-'}</TableCell>
                <TableCell>{resolveAtivo(a.ativo)}</TableCell>
                <TableCell>{resolvePublicar(a)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">Ação</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-40">
                      <DropdownMenuItem onClick={() => handleView(a)}>Ver</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(a)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(a)}>Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {!listQuery.data?.data?.length && (
              <TableRow>
                <TableCell colSpan={6}>
                  <p className="text-sm text-muted-foreground">Nenhuma aeronave encontrada</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AircraftsSettings;