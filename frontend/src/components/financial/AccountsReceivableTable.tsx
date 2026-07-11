/**
 * Tabela para exibição e gerenciamento de contas a receber
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';
import {
  MoreHorizontal,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Download
} from 'lucide-react';
import {
  AccountReceivable,
  AccountStatus,
  PaymentMethod,
  FinancialCategory,
  AccountsFilter
} from '../../types/financial';
import { financialService } from '../../services/financialService';
import AccountReceivableForm from './AccountReceivableForm';

interface AccountsReceivableTableProps {
  categories: FinancialCategory[];
  clientId?: string;
  enrollmentId?: string;
  title?: string;
}

/**
 * Componente de tabela para contas a receber
 */
export const AccountsReceivableTable: React.FC<AccountsReceivableTableProps> = ({ categories, clientId, enrollmentId, title }) => {
  const [accounts, setAccounts] = useState<AccountReceivable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountReceivable | undefined>();
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<AccountsFilter>({
    page: 1,
    limit: 10,
    sortBy: 'dueDate',
    sortOrder: 'asc',
    client_id: clientId,
    matricula_id: enrollmentId,
  });
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  /**
   * Carrega as contas a receber
   */
  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const response: any = await financialService.accountsReceivable.getAll(filters);
      setAccounts(response?.data || []);
      setTotalPages(response?.last_page || response?.totalPages || 0);
      setTotal(response?.total || 0);
    } catch (error: any) {
      console.error('Erro ao carregar contas a receber:', error);
      toast.error('Erro ao carregar contas a receber');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Carrega dados quando filtros mudam
   */
  useEffect(() => {
    loadAccounts();
  }, [filters]);

  /**
   * Atualiza client_id se mudar externamente
   */
  useEffect(() => {
    if (clientId && clientId !== filters.client_id) {
      setFilters(prev => ({ ...prev, client_id: clientId }));
    }
  }, [clientId]);

  useEffect(() => {
    if (enrollmentId && enrollmentId !== filters.matricula_id) {
      setFilters(prev => ({ ...prev, matricula_id: enrollmentId }));
    }
  }, [enrollmentId]);

  /**
   * Formata valor monetário
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  /**
   * Formata data
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  /**
   * Retorna badge de status
   */
  const getStatusBadge = (status: AccountStatus) => {
    const statusConfig = {
      [AccountStatus.PENDING]: { label: 'Pendente', variant: 'secondary' as const },
      [AccountStatus.PAID]: { label: 'Recebido', variant: 'default' as const },
      [AccountStatus.OVERDUE]: { label: 'Vencido', variant: 'destructive' as const },
      [AccountStatus.CANCELLED]: { label: 'Cancelado', variant: 'outline' as const }
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  /**
   * Retorna nome da categoria
   */
  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Categoria não encontrada';
  };

  /**
   * Retorna label da forma de pagamento
   */
  const getPaymentMethodLabel = (method: PaymentMethod): string => {
    const labels = {
      [PaymentMethod.CASH]: 'Dinheiro',
      [PaymentMethod.CREDIT_CARD]: 'Cartão de Crédito',
      [PaymentMethod.DEBIT_CARD]: 'Cartão de Débito',
      [PaymentMethod.BANK_TRANSFER]: 'Transferência',
      [PaymentMethod.PIX]: 'PIX',
      [PaymentMethod.CHECK]: 'Cheque',
      [PaymentMethod.BOLETO]: 'Boleto'
    };
    return labels[method] || method;
  };

  /**
   * Abre formulário para nova conta
   */
  const handleNewAccount = () => {
    setSelectedAccount(undefined);
    setIsFormOpen(true);
  };

  /**
   * Abre formulário para editar conta
   */
  const handleEditAccount = (account: AccountReceivable) => {
    setSelectedAccount(account);
    setIsFormOpen(true);
  };

  /**
   * Marca conta como recebida
   */
  const handleMarkAsReceived = async (account: AccountReceivable) => {
    try {
      const receivedDate = new Date().toISOString().split('T')[0];
      await financialService.accountsReceivable.markAsReceived(
        account.id,
        receivedDate,
        account.paymentMethod || PaymentMethod.CASH
      );
      toast.success('Conta marcada como recebida!');
      loadAccounts();
    } catch (error: any) {
      console.error('Erro ao marcar conta como recebida:', error);
      toast.error('Erro ao marcar conta como recebida');
    }
  };

  /**
   * Cancela conta
   */
  const handleCancelAccount = async (account: AccountReceivable) => {
    if (confirm('Tem certeza que deseja cancelar esta conta?')) {
      try {
        await financialService.accountsReceivable.cancel(account.id);
        toast.success('Conta cancelada!');
        loadAccounts();
      } catch (error: any) {
        console.error('Erro ao cancelar conta:', error);
        toast.error('Erro ao cancelar conta');
      }
    }
  };

  /**
   * Remove conta
   */
  const handleDeleteAccount = async (account: AccountReceivable) => {
    if (confirm('Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.')) {
      try {
        await financialService.accountsReceivable.delete(account.id);
        toast.success('Conta excluída!');
        loadAccounts();
      } catch (error: any) {
        console.error('Erro ao excluir conta:', error);
        toast.error('Erro ao excluir conta');
      }
    }
  };

  /**
   * Gera cobrança
   */
  const handleGenerateCharge = async (account: AccountReceivable, billingType: string) => {
    const toastId = toast.loading(`Gerando cobrança via ${billingType}...`);
    try {
      await financialService.accountsReceivable.generateCharge(account.id, billingType);
      toast.success('Cobrança gerada com sucesso!', { id: toastId });
      loadAccounts();
    } catch (error: any) {
      console.error('Erro ao gerar cobrança:', error);
      toast.error(error.message || error.body?.message || 'Erro ao gerar cobrança', { id: toastId });
    }
  };

  /**
   * Toggle all checkboxes
   */
  const toggleSelectAll = () => {
    if (selectedAccountIds.size === accounts.length && accounts.length > 0) {
      setSelectedAccountIds(new Set());
    } else {
      setSelectedAccountIds(new Set(accounts.map(a => a.id)));
    }
  };

  /**
   * Toggle single checkbox
   */
  const toggleSelect = (id: string) => {
    const next = new Set(selectedAccountIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedAccountIds(next);
  };

  /**
   * Gera cobranças em massa
   */
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedAccountIds);
    if (ids.length === 0) return;

    if (!confirm(`Tem certeza que deseja excluir ${ids.length} ${ids.length === 1 ? 'fatura' : 'faturas'}? Esta ação não pode ser desfeita.`)) return;

    const toastId = toast.loading(`Excluindo ${ids.length} ${ids.length === 1 ? 'fatura' : 'faturas'}...`);
    let successCount = 0;
    for (const id of ids) {
      try {
        await financialService.accountsReceivable.delete(id);
        successCount++;
      } catch (error) {
        console.error(`Erro ao excluir fatura ${id}:`, error);
      }
    }

    if (successCount === ids.length) {
      toast.success(`${successCount} ${successCount === 1 ? 'fatura excluída' : 'faturas excluídas'} com sucesso!`, { id: toastId });
    } else if (successCount > 0) {
      toast.warning(`${successCount} excluídas, ${ids.length - successCount} falharam.`, { id: toastId });
    } else {
      toast.error('Falha ao excluir as faturas. Verifique o console.', { id: toastId });
    }

    setSelectedAccountIds(new Set());
    loadAccounts();
  };

  const handleGenerateBulkCharges = async (billingType: string) => {
    const ids = Array.from(selectedAccountIds);
    if (ids.length === 0) return;

    const accountsToProcess = accounts.filter(a => 
      ids.includes(a.id) && 
      a.status === AccountStatus.PENDING && 
      !a.config?.invoice_url
    );
    
    if (accountsToProcess.length === 0) {
      toast.error('Nenhuma fatura pendente e sem cobrança selecionada.');
      return;
    }

    const toastId = toast.loading(`Gerando cobrança via ${billingType} (0/${accountsToProcess.length})...`);
    
    let successCount = 0;
    for (let i = 0; i < accountsToProcess.length; i++) {
      const account = accountsToProcess[i];
      try {
        await financialService.accountsReceivable.generateCharge(account.id, billingType);
        successCount++;
        toast.loading(`Gerando cobrança via ${billingType} (${i + 1}/${accountsToProcess.length})...`, { id: toastId });
      } catch (error) {
        console.error(`Erro ao gerar cobrança para fatura ${account.id}:`, error);
      }
    }

    if (successCount === accountsToProcess.length) {
      toast.success(`${successCount} cobranças geradas com sucesso!`, { id: toastId });
    } else if (successCount > 0) {
      toast.warning(`${successCount} geradas, ${accountsToProcess.length - successCount} falharam.`, { id: toastId });
    } else {
      toast.error(`Falha ao gerar as cobranças. Verifique o console.`, { id: toastId });
    }
    
    setSelectedAccountIds(new Set());
    loadAccounts();
  };

  /**
   * Atualiza filtro de busca
   */
  const handleSearchChange = (search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }));
  };

  /**
   * Atualiza filtro de status
   */
  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: status === 'all' ? undefined : status as AccountStatus,
      page: 1
    }));
  };

  /**
   * Muda página
   */
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  /**
   * Callback de sucesso do formulário
   */
  const handleFormSuccess = () => {
    loadAccounts();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          {title !== null && (
            <CardTitle>{title || 'Contas a Receber'}</CardTitle>
          )}
          <Button onClick={handleNewAccount}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Buscar por descrição, cliente..."
              className="pl-10"
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          
          <Select onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value={AccountStatus.PENDING}>Pendente</SelectItem>
              <SelectItem value={AccountStatus.PAID}>Recebido</SelectItem>
              <SelectItem value={AccountStatus.OVERDUE}>Vencido</SelectItem>
              <SelectItem value={AccountStatus.CANCELLED}>Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">Carregando...</div>
          </div>
        ) : (
          <>
            {selectedAccountIds.size > 0 && (
              <div className="bg-primary/5 p-3 rounded-xl mb-4 flex items-center justify-between border border-primary/20">
                <span className="text-sm font-medium text-primary">
                  {selectedAccountIds.size} {selectedAccountIds.size === 1 ? 'fatura selecionada' : 'faturas selecionadas'}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleGenerateBulkCharges('BOLETO')} variant="default">
                    <Download className="h-4 w-4 mr-2" />
                    Gerar Boletos
                  </Button>
                  <Button size="sm" onClick={() => handleGenerateBulkCharges('PIX')} variant="default">
                    <Download className="h-4 w-4 mr-2" />
                    Gerar PIX
                  </Button>
                  <Button size="sm" onClick={handleBulkDelete} variant="destructive" className="shadow-sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Selecionadas
                  </Button>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={accounts.length > 0 && selectedAccountIds.size === accounts.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[60px] text-center">Ações</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <Checkbox 
                        checked={selectedAccountIds.has(account.id)}
                        onCheckedChange={() => toggleSelect(account.id)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-xl hover:bg-primary/5 focus-visible:ring-0">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[180px] rounded-xl border-slate-100 dark:border-slate-800 shadow-xl p-1">
                          <DropdownMenuItem onClick={() => handleEditAccount(account)} className="cursor-pointer gap-2 font-bold text-xs rounded-lg">
                            <Edit className="h-3.5 w-3.5 text-primary" /> Editar
                          </DropdownMenuItem>

                          {account.status === AccountStatus.PENDING && (
                            <>
                              <DropdownMenuItem onClick={() => handleMarkAsReceived(account)} className="cursor-pointer gap-2 font-bold text-xs rounded-lg">
                                <Check className="h-3.5 w-3.5 text-green-600" /> Receber
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCancelAccount(account)} className="cursor-pointer gap-2 font-bold text-xs rounded-lg">
                                <X className="h-3.5 w-3.5 text-orange-600" /> Cancelar
                              </DropdownMenuItem>
                            </>
                          )}

                          {account.status === AccountStatus.PENDING && !account.config?.invoice_url && (
                            <>
                              <DropdownMenuItem onClick={() => handleGenerateCharge(account, 'BOLETO')} className="cursor-pointer gap-2 font-bold text-xs rounded-lg">
                                <Download className="h-3.5 w-3.5 text-blue-600" /> Gerar Boleto
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGenerateCharge(account, 'PIX')} className="cursor-pointer gap-2 font-bold text-xs rounded-lg">
                                <Download className="h-3.5 w-3.5 text-blue-600" /> Gerar PIX
                              </DropdownMenuItem>
                            </>
                          )}

                          {account.config?.invoice_url && (
                            <DropdownMenuItem onClick={() => window.open(account.config.invoice_url, '_blank')} className="cursor-pointer gap-2 font-bold text-xs rounded-lg">
                              <Download className="h-3.5 w-3.5 text-blue-600" /> Ver Fatura
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem onClick={() => handleDeleteAccount(account)} className="cursor-pointer gap-2 font-bold text-xs rounded-lg text-red-600">
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{account.description}</span>
                        {account.invoiceNumber && (
                          <span className="text-sm text-gray-500">
                            NF: {account.invoiceNumber}
                          </span>
                        )}
                        {account.serviceOrderId && (
                          <span className="text-sm text-gray-500">
                            OS: {account.serviceOrderId}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{account.customerName || '-'}</TableCell>
                    <TableCell>{formatCurrency(account.amount)}</TableCell>
                    <TableCell>{formatDate(account.dueDate)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 items-start">
                        {getStatusBadge(account.status)}
                        {account.config?.invoice_url && (
                          <Badge 
                            variant="outline" 
                            className="text-[10px] py-0 px-1.5 border-primary/30 text-primary bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
                            onClick={() => window.open(account.config?.invoice_url, '_blank')}
                            title="Visualizar Fatura"
                          >
                            Boleto/Pix Gerado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryName(account.category)}</TableCell>
                    <TableCell>
                      {account.paymentMethod ? getPaymentMethodLabel(account.paymentMethod) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  Mostrando {accounts.length} de {total} registros
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(filters.page! - 1)}
                    disabled={filters.page === 1}
                  >
                    Anterior
                  </Button>
                  <span className="px-3 py-1 text-sm">
                    Página {filters.page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(filters.page! + 1)}
                    disabled={filters.page === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Formulário */}
      <AccountReceivableForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
        account={selectedAccount}
        categories={categories}
        clientId={clientId}
      />
    </Card>
  );
};

export default AccountsReceivableTable;