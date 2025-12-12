import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Filter, Plus, X } from 'lucide-react';
import { AircraftForm } from '@/components/aircraft/AircraftForm';
import { AircraftTable } from '@/components/aircraft/AircraftTable';
import { useAircraftList, useCreateAircraft, useUpdateAircraft, useDeleteAircraft } from '@/hooks/aircraft';
import { useClientsList } from '@/hooks/clients';
import type { AircraftRecord, CreateAircraftInput, UpdateAircraftInput } from '@/types/aircraft';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useDebounce from '@/hooks/useDebounce';

// Schema de validação para o formulário
const aircraftSchema = z.object({
  client_id: z.string().min(1, 'Proprietário é obrigatório'),
  matricula: z.string().min(1, 'Matrícula é obrigatória'),
  config: z.string().optional().default(''),
  description: z.string().optional().default(''),
  active: z.boolean().default(true)
});

type AircraftFormData = z.infer<typeof aircraftSchema>;

/**
 * Página de gerenciamento de aeronaves
 */
/**
 * Aircraft — Listagem de aeronaves com painel de filtros.
 * pt-BR: Implementa filtros (busca, proprietário, ativo/inativo, per_page),
 *        persistência em URL e indicador visual de filtros ativos.
 * en-US: Implements filters (search, owner, active/inactive, per_page),
 *        URL persistence and visual active-filters indicator.
 */
export default function Aircraft() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<AircraftRecord | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const location = useLocation();
  
  /**
   * getInitialFiltersFromURL
   * pt-BR: Lê URLSearchParams e retorna filtros iniciais.
   * en-US: Reads URLSearchParams and returns initial filters.
   */
  const getInitialFiltersFromURL = () => {
    const qs = new URLSearchParams(location.search);
    const perPage = Number(qs.get('per_page') || 10);
    const activeQS = qs.get('active') || 'all';
    return {
      search: qs.get('search') || '',
      client_id: qs.get('client_id') || undefined,
      per_page: Number.isNaN(perPage) ? 10 : perPage,
      active: (activeQS === 'active' || activeQS === 'inactive' || activeQS === 'all') ? activeQS : 'all' as 'all' | 'active' | 'inactive',
    } as { search: string; client_id?: string; per_page: number; active: 'all' | 'active' | 'inactive' };
  };

  const [filters, setFilters] = useState<{ search: string; client_id?: string; per_page: number; active: 'all' | 'active' | 'inactive'}>(
    getInitialFiltersFromURL()
  );
  const navigate = useNavigate();

  // Hooks para aeronaves
  // Debounce para busca (evita excesso de requisições ao digitar)
  const debouncedSearch = useDebounce(filters.search, 400);

  // Monta parâmetros da lista com memoização para evitar recriações desnecessárias
  /**
   * buildListParams
   * pt-BR: Converte filtros locais em parâmetros para o hook de listagem.
   * en-US: Converts local filters to params for the list hook.
   */
  const listParams = useMemo(() => {
    const activeParam = filters.active === 'all' ? undefined : filters.active === 'active';
    return {
      search: debouncedSearch || undefined,
      client_id: filters.client_id || undefined,
      per_page: filters.per_page,
      active: activeParam,
    };
  }, [debouncedSearch, filters.client_id, filters.per_page, filters.active]);

  const { data: aircraft = [], isLoading: isLoadingAircraft, refetch } = useAircraftList(listParams);
  const createMutation = useCreateAircraft({
    onSuccess: () => {
      toast.success('Aeronave criada com sucesso!');
      setIsDialogOpen(false);
      refetch();
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao criar aeronave');
    }
  });
  const updateMutation = useUpdateAircraft({
    onSuccess: () => {
      toast.success('Aeronave atualizada com sucesso!');
      setIsDialogOpen(false);
      setEditingAircraft(null);
      refetch();
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao atualizar aeronave');
    }
  });
  const deleteMutation = useDeleteAircraft({
    onSuccess: () => {
      toast.success('Aeronave excluída com sucesso!');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao excluir aeronave');
    }
  });

  // Hook para clientes (proprietários)
  const { data: clients = [], isLoading: isLoadingClients } = useClientsList();

  // Formulário
  const form = useForm<AircraftFormData>({
    resolver: zodResolver(aircraftSchema),
    defaultValues: {
      client_id: '',
      matricula: '',
      config: '',
      description: '',
      active: true
    }
  });

  /**
   * Manipula o envio do formulário
   */
  const onSubmit = async (data: AircraftFormData) => {
    try {
      if (editingAircraft) {
        const updateData: UpdateAircraftInput = {
          client_id: data.client_id,
          matricula: data.matricula,
          config: data.config || '',
          description: data.description || '',
          active: data.active
        };
        await updateMutation.mutateAsync({ id: editingAircraft.id, data: updateData });
      } else {
        const createData: CreateAircraftInput = {
          client_id: data.client_id,
          matricula: data.matricula,
          config: data.config || '',
          description: data.description || '',
          active: data.active
        };
        await createMutation.mutateAsync(createData);
      }
    } catch (error) {
      // Erro já tratado nos hooks de mutação
    }
  };

  /**
   * Abre o diálogo para criar nova aeronave
   */
  const handleCreate = () => {
    setEditingAircraft(null);
    form.reset({
      client_id: '',
      matricula: '',
      config: '',
      description: '',
      active: true
    });
    setIsDialogOpen(true);
  };

  /**
   * Abre o diálogo para editar aeronave
   */
  const handleEdit = (aircraft: AircraftRecord) => {
    setEditingAircraft(aircraft);
    form.reset({
      client_id: aircraft.client_id,
      matricula: aircraft.matricula,
      config: aircraft.config || '',
      description: aircraft.description || '',
      active: aircraft.active
    });
    setIsDialogOpen(true);
  };

  /**
   * Exclui uma aeronave
   */
  const handleDelete = async (aircraft: AircraftRecord) => {
    try {
      await deleteMutation.mutateAsync(aircraft.id);
    } catch (error) {
      // Erro já tratado no hook de mutação
    }
  };

  /**
   * Cancela a edição/criação
   */
  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingAircraft(null);
    form.reset();
  };

  /**
   * updateURLWithFilters
   * pt-BR: Persiste filtros em URLSearchParams para compartilhamento do link.
   * en-US: Persists filters to URLSearchParams for shareable links.
   */
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search.trim()) params.set('search', filters.search);
    if (filters.client_id) params.set('client_id', filters.client_id);
    if (filters.per_page && filters.per_page !== 10) params.set('per_page', String(filters.per_page));
    if (filters.active && filters.active !== 'all') params.set('active', filters.active);
    navigate({ pathname: '/admin/aircrafts', search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
  }, [filters.search, filters.client_id, filters.per_page, filters.active, navigate]);

  const hasActiveFilters = (filters.search.trim() !== ''
    || !!filters.client_id
    || filters.per_page !== 10
    || filters.active !== 'all');

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gerenciamento de Aeronaves</CardTitle>
              <CardDescription>
                Cadastre e gerencie as aeronaves dos seus clientes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" title="Abrir filtros" className="relative">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtros
                    {hasActiveFilters && (
                      <span
                        className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500"
                        aria-label="Filtros ativos"
                        title="Filtros ativos"
                      />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-sm">
                  <SheetHeader>
                    <SheetTitle>Filtros de Aeronaves</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    {/* Busca (matrícula/descrição) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Busca</label>
                      <Input
                        placeholder="Pesquisar por matrícula ou descrição"
                        value={filters.search}
                        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">Digite para filtrar. Aplica automaticamente.</p>
                    </div>

                    {/* Proprietário */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Proprietário</label>
                      <Select
                        value={filters.client_id || undefined}
                        /**
                         * onValueChange
                         * pt-BR: Converte o valor especial "all" para `undefined` (sem filtro de proprietário).
                         * en-US: Converts special value "all" to `undefined` (no owner filter).
                         */
                        onValueChange={(val) => setFilters((f) => ({ ...f, client_id: val === 'all' ? undefined : val }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os proprietários" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {Array.isArray((clients as any).data) && (clients as any).data.map((client: any) => (
                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status (Ativo/Inativo) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select
                        value={filters.active}
                        onValueChange={(val: 'all' | 'active' | 'inactive') => setFilters((f) => ({ ...f, active: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Registros por página */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Registros por página</label>
                      <Select
                        value={String(filters.per_page)}
                        onValueChange={(val) => setFilters((f) => ({ ...f, per_page: Number(val) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 20, 50].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Ações do painel */}
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="secondary"
                        onClick={() => setFilters({ search: '', client_id: undefined, per_page: 10, active: 'all' })}
                        title="Limpar filtros"
                      >
                        Limpar filtros
                      </Button>
                      <SheetClose asChild>
                        <Button variant="default">
                          Fechar
                        </Button>
                      </SheetClose>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Aeronave
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AircraftTable
            aircraft={aircraft}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={(aircraft) => navigate(`/aircraft/${aircraft.id}`)}
            isLoading={isLoadingAircraft}
          />
        </CardContent>
      </Card>

      {/* Dialog para criar/editar aeronave */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAircraft ? 'Editar Aeronave' : 'Nova Aeronave'}
            </DialogTitle>
            <DialogDescription>
              {editingAircraft
                ? 'Atualize as informações da aeronave'
                : 'Preencha os dados para cadastrar uma nova aeronave'
              }
            </DialogDescription>
          </DialogHeader>
          <AircraftForm
            form={form}
            onSubmit={onSubmit}
            onCancel={handleCancel}
            editingAircraft={editingAircraft}
            clients={clients}
            isLoadingClients={isLoadingClients}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}