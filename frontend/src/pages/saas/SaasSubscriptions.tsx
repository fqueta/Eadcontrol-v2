import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, CreditCard, Pause, Play, XCircle, Search, Edit } from 'lucide-react';
import { saasService } from '@/services/saasService';
import { SaasSubscription, SaasPlan, SaasTenant } from '@/types/saas';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500',
  trial: 'bg-blue-500',
  past_due: 'bg-amber-500',
  suspended: 'bg-red-500',
  cancelled: 'bg-gray-500',
};

const statusLabels: Record<string, string> = {
  active: 'Ativa',
  trial: 'Trial',
  past_due: 'Em Atraso',
  suspended: 'Suspensa',
  cancelled: 'Cancelada',
};

export default function SaasSubscriptions() {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<SaasSubscription[]>([]);
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [tenants, setTenants] = useState<SaasTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingSub, setEditingSub] = useState<SaasSubscription | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNextBillingDate, setEditNextBillingDate] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    tenant_id: '',
    plan_id: '',
    billing_cycle: 'monthly',
    trial_days: '14',
    customer_name: '',
    customer_email: '',
    customer_cpf_cnpj: '',
    customer_phone: '',
    create_gateway_subscription: false,
  });

  useEffect(() => {
    loadData();
  }, [page, filterStatus, search]);

  async function loadData() {
    try {
      setLoading(true);
      const [subsRes, plansRes, tenantsRes] = await Promise.all([
        saasService.getSubscriptions({ page, status: filterStatus || undefined, search: search || undefined }),
        saasService.getAllPlans(),
        saasService.getTenants(),
      ]);
      setSubscriptions(subsRes.data);
      setTotalPages(subsRes.last_page);
      setPlans(plansRes.data);
      setTenants(tenantsRes.data);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingSub(null);
    setFormData({
      tenant_id: '',
      plan_id: '',
      billing_cycle: 'monthly',
      trial_days: '14',
      customer_name: '',
      customer_email: '',
      customer_cpf_cnpj: '',
      customer_phone: '',
      create_gateway_subscription: false,
    });
    setDialogOpen(true);
  }

  function openEdit(sub: SaasSubscription) {
    setEditingSub(sub);
    setFormData({
      tenant_id: sub.tenant_id,
      plan_id: String(sub.plan_id),
      billing_cycle: sub.billing_cycle,
      trial_days: '0',
      customer_name: '',
      customer_email: '',
      customer_cpf_cnpj: '',
      customer_phone: '',
      create_gateway_subscription: false,
    });
    setEditStatus(sub.status);
    setEditNextBillingDate(sub.next_billing_date ? sub.next_billing_date.split('T')[0] : '');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.tenant_id || !formData.plan_id) {
      toast({ title: 'Preencha o tenant e o plano.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editingSub) {
        await saasService.updateSubscription(editingSub.id, {
          plan_id: parseInt(formData.plan_id),
          billing_cycle: formData.billing_cycle,
          status: editStatus,
          next_billing_date: editNextBillingDate || null,
        });
        toast({ title: 'Assinatura atualizada com sucesso.' });
      } else {
        await saasService.createSubscription({
          ...formData,
          plan_id: parseInt(formData.plan_id),
          trial_days: parseInt(formData.trial_days),
        });
        toast({ title: 'Assinatura criada com sucesso.' });
      }
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSuspend(sub: SaasSubscription) {
    if (!confirm(`Suspender a assinatura do tenant "${sub.tenant?.name || sub.tenant_id}"? Isso irá desativar o acesso.`)) return;
    try {
      await saasService.suspendSubscription(sub.id, 'Suspensão manual');
      toast({ title: 'Assinatura suspensa.' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  async function handleReactivate(sub: SaasSubscription) {
    try {
      await saasService.reactivateSubscription(sub.id);
      toast({ title: 'Assinatura reativada.' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  async function handleCancel(sub: SaasSubscription) {
    if (!confirm(`Cancelar a assinatura do tenant "${sub.tenant?.name || sub.tenant_id}"?`)) return;
    try {
      await saasService.deleteSubscription(sub.id);
      toast({ title: 'Assinatura cancelada.' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  function formatDate(date: string | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Assinaturas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as assinaturas dos tenants.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Assinatura
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por tenant..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="past_due">Em Atraso</SelectItem>
            <SelectItem value="suspended">Suspensas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Próx. Cobrança</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma assinatura encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{sub.tenant?.name || sub.tenant_id}</span>
                        {sub.tenant?.domain && (
                          <p className="text-xs text-muted-foreground">{sub.tenant.domain}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{sub.plan?.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {sub.plan && formatCurrency(sub.plan.price_monthly)}/mês
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sub.billing_cycle === 'monthly' ? 'Mensal' : 'Anual'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[sub.status] || 'bg-gray-500'}>
                        {statusLabels[sub.status] || sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(sub.starts_at)}</TableCell>
                    <TableCell>{formatDate(sub.next_billing_date)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {['active', 'trial'].includes(sub.status) && (
                            <DropdownMenuItem onClick={() => handleSuspend(sub)}>
                              <Pause className="h-4 w-4 mr-2" />
                              Suspender
                            </DropdownMenuItem>
                          )}
                          {['suspended', 'past_due'].includes(sub.status) && (
                            <DropdownMenuItem onClick={() => handleReactivate(sub)}>
                              <Play className="h-4 w-4 mr-2" />
                              Reativar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openEdit(sub)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar / Alterar
                          </DropdownMenuItem>
                          {sub.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => handleCancel(sub)} className="text-destructive">
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span className="text-sm py-2 px-3">
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Próxima
          </Button>
        </div>
      )}

      {/* Dialog Nova / Editar Assinatura */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSub ? 'Editar Assinatura' : 'Nova Assinatura'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tenant</Label>
              <Select disabled={!!editingSub} value={formData.tenant_id} onValueChange={(v) => setFormData({ ...formData, tenant_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name || t.id} {t.domain && `(${t.domain})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Plano</Label>
              <Select value={formData.plan_id} onValueChange={(v) => setFormData({ ...formData, plan_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.filter((p) => p.active || (editingSub && String(p.id) === formData.plan_id)).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} - {formatCurrency(p.price_monthly)}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ciclo</Label>
                <Select value={formData.billing_cycle} onValueChange={(v) => setFormData({ ...formData, billing_cycle: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editingSub && (
                <div>
                  <Label>Dias de Trial</Label>
                  <Input
                    type="number"
                    value={formData.trial_days}
                    onChange={(e) => setFormData({ ...formData, trial_days: e.target.value })}
                  />
                </div>
              )}
            </div>

            {editingSub && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="past_due">Em Atraso</SelectItem>
                      <SelectItem value="suspended">Suspensa</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Próx. Cobrança</Label>
                  <Input
                    type="date"
                    value={editNextBillingDate}
                    onChange={(e) => setEditNextBillingDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {!editingSub && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-3">Dados para cobrança (opcional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={formData.customer_email} onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">CPF/CNPJ</Label>
                    <Input value={formData.customer_cpf_cnpj} onChange={(e) => setFormData({ ...formData, customer_cpf_cnpj: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone</Label>
                    <Input value={formData.customer_phone} onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (editingSub ? 'Salvando...' : 'Criando...') : (editingSub ? 'Salvar Alterações' : 'Criar Assinatura')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
