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
import { FileText, Plus, MoreHorizontal, CheckCircle, ExternalLink, Trash2, Calendar, CreditCard, Search } from 'lucide-react';
import { saasService } from '@/services/saasService';
import { SaasInvoice, SaasSubscription } from '@/types/saas';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  paid: 'bg-emerald-500',
  overdue: 'bg-red-500',
  cancelled: 'bg-gray-500',
  refunded: 'bg-blue-500',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Paga',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
};

export default function SaasInvoices() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<SaasInvoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<SaasSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SaasInvoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form states
  const [formData, setFormData] = useState({
    subscription_id: '',
    amount: '',
    due_date: '',
    notes: '',
  });

  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [paymentData, setPaymentData] = useState({
    payment_method: 'MANUAL',
    paid_amount: '',
  });

  const [chargeType, setChargeType] = useState('UNDEFINED');

  useEffect(() => {
    loadData();
  }, [page, filterStatus, search]);

  async function loadData() {
    try {
      setLoading(true);
      const [invRes, subsRes] = await Promise.all([
        saasService.getInvoices({ page, status: filterStatus || undefined, search: search || undefined }),
        saasService.getSubscriptions({ limit: 100 }),
      ]);
      setInvoices(invRes.data);
      setTotalPages(invRes.last_page);
      setSubscriptions(subsRes.data);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setFormData({
      subscription_id: '',
      amount: '',
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
      notes: '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.subscription_id || !formData.amount || !formData.due_date) {
      toast({ title: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const selectedSub = subscriptions.find(s => String(s.id) === formData.subscription_id);
      if (!selectedSub) throw new Error('Assinatura não encontrada');

      await saasService.createInvoice({
        subscription_id: parseInt(formData.subscription_id),
        tenant_id: selectedSub.tenant_id,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        notes: formData.notes,
      });
      toast({ title: 'Fatura criada com sucesso.' });
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleBatchGenerate() {
    setSaving(true);
    try {
      const res = await saasService.generateBatchInvoices(batchDate);
      toast({ title: 'Sucesso', description: `${res.generated} faturas geradas.` });
      setBatchDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function openPayDialog(invoice: SaasInvoice) {
    setSelectedInvoice(invoice);
    setPaymentData({
      payment_method: 'MANUAL',
      paid_amount: String(invoice.total),
    });
    setPayDialogOpen(true);
  }

  async function handleMarkPaid() {
    if (!selectedInvoice) return;
    setSaving(true);
    try {
      await saasService.markInvoicePaid(
        selectedInvoice.id,
        paymentData.payment_method,
        parseFloat(paymentData.paid_amount)
      );
      toast({ title: 'Fatura marcada como paga com sucesso.' });
      setPayDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function openChargeDialog(invoice: SaasInvoice) {
    setSelectedInvoice(invoice);
    setChargeType('UNDEFINED');
    setChargeDialogOpen(true);
  }

  async function handleCharge() {
    if (!selectedInvoice) return;
    setSaving(true);
    try {
      const res = await saasService.chargeInvoice(selectedInvoice.id, chargeType);
      toast({ title: 'Sucesso', description: res.message || 'Cobrança gerada no gateway.' });
      setChargeDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(invoice: SaasInvoice) {
    if (!confirm(`Remover fatura #${invoice.invoice_number}?`)) return;
    try {
      await saasService.deleteInvoice(invoice.id);
      toast({ title: 'Fatura removida.' });
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
            <FileText className="h-6 w-6 text-primary" />
            Faturas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle e emita cobranças para os tenants.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBatchDialogOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Faturamento em Lote
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Fatura
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por fatura ou tenant..."
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
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Paga</SelectItem>
            <SelectItem value="overdue">Vencida</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
            <SelectItem value="refunded">Reembolsada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Assinatura / Plano</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma fatura encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-xs">
                      #{invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{invoice.tenant?.name || invoice.tenant_id}</span>
                        {invoice.tenant?.domain && (
                          <p className="text-xs text-muted-foreground">{invoice.tenant.domain}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{invoice.subscription?.plan?.name || 'Manual'}</span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[invoice.status] || 'bg-gray-500'}>
                        {statusLabels[invoice.status] || invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.status === 'paid' ? (
                        <div className="text-xs">
                          <p className="font-medium">{invoice.payment_method_label || invoice.payment_method}</p>
                          <p className="text-muted-foreground">{formatDate(invoice.paid_at)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {invoice.gateway_invoice_url && (
                            <DropdownMenuItem asChild>
                              <a href={invoice.gateway_invoice_url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ver no Gateway
                              </a>
                            </DropdownMenuItem>
                          )}
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <>
                              <DropdownMenuItem onClick={() => openChargeDialog(invoice)}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Sincronizar / Cobrar Gateway
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openPayDialog(invoice)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marcar como Paga
                              </DropdownMenuItem>
                            </>
                          )}
                          {invoice.status !== 'paid' && (
                            <DropdownMenuItem onClick={() => handleDelete(invoice)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
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

      {/* Dialog Nova Fatura */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Fatura Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Assinatura / Tenant</Label>
              <Select value={formData.subscription_id} onValueChange={(v) => setFormData({ ...formData, subscription_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a assinatura do tenant" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.tenant?.name || s.tenant_id} - Plano {s.plan?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div>
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            <div>
              <Label>Observações / Notas</Label>
              <Input
                placeholder="Detalhes adicionais da cobrança"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Criando...' : 'Criar Fatura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Faturamento em Lote */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Faturamento em Lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esta ação irá verificar todas as assinaturas ativas e gerar faturas automáticas para aquelas cuja data de vencimento seja menor ou igual à data de referência selecionada.
            </p>
            <div>
              <Label>Data de Referência / Vencimento</Label>
              <Input
                type="date"
                value={batchDate}
                onChange={(e) => setBatchDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBatchGenerate} disabled={saving}>
              {saving ? 'Gerando...' : 'Gerar Faturas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Marcar como Paga */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Recebimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              Confirmar o pagamento manual da fatura <strong className="font-mono text-xs">#{selectedInvoice?.invoice_number}</strong> no valor de <strong>{selectedInvoice && formatCurrency(selectedInvoice.total)}</strong>.
            </p>
            <div>
              <Label>Meio de Pagamento</Label>
              <Select value={paymentData.payment_method} onValueChange={(v) => setPaymentData({ ...paymentData, payment_method: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Dinheiro / Transferência Manual</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                  <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor Pago (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentData.paid_amount}
                onChange={(e) => setPaymentData({ ...paymentData, paid_amount: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMarkPaid} disabled={saving}>
              {saving ? 'Confirmando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Sincronizar/Cobrar Gateway */}
      <Dialog open={chargeDialogOpen} onOpenChange={setChargeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Cobrança no Gateway</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              Enviar fatura <strong className="font-mono text-xs">#{selectedInvoice?.invoice_number}</strong> para o Asaas.
            </p>
            <div>
              <Label>Forma de Pagamento no Gateway</Label>
              <Select value={chargeType} onValueChange={(v) => setChargeType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNDEFINED">Usar Padrão do Cliente</SelectItem>
                  <SelectItem value="PIX">Apenas PIX</SelectItem>
                  <SelectItem value="BOLETO">Apenas Boleto</SelectItem>
                  <SelectItem value="CREDIT_CARD">Apenas Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCharge} disabled={saving}>
              {saving ? 'Gerando...' : 'Gerar/Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
