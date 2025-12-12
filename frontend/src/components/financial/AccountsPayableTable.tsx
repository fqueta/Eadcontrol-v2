/**
 * Tabela para exibição e gerenciamento de contas a pagar
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
import { toast } from 'react-hot-toast';
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
  AccountPayable,
  AccountStatus,
  PaymentMethod,
  FinancialCategory,
  AccountsFilter
} from '../../types/financial';
import { financialService } from '../../services/financialService';
import AccountPayableForm from './AccountPayableForm';

interface AccountsPayableTableProps {
  categories: FinancialCategory[];
}

/**
 * Componente de tabela para contas a pagar
 */
export const AccountsPayableTable: React.FC<AccountsPayableTableProps> = ({ categories }) => {
  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountPayable | undefined>();
  const [filters, setFilters] = useState<AccountsFilter>({
    page: 1,
    limit: 10,
    sortBy: 'dueDate',
    sortOrder: 'asc'
  });
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  /**
   * Carrega as contas a pagar
   */
  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await financialService.accountsPayable.getAll(filters);
      setAccounts(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error: any) {
      console.error('Erro ao carregar contas a pagar:', error);
      toast.error('Erro ao carregar contas a pagar');
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
      [AccountStatus.PAID]: { label: 'Pago', variant: 'default' as const },
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
  const handleEditAccount = (account: AccountPayable) => {
    setSelectedAccount(account);
    setIsFormOpen(true);
  };

  /**
   * Marca conta como paga
   */
  const handleMarkAsPaid = async (account: AccountPayable) => {
    try {
      const paymentDate = new Date().toISOString().split('T')[0];
      await financialService.accountsPayable.markAsPaid(
        account.id,
        paymentDate,
        account.paymentMethod || PaymentMethod.CASH
      );
      toast.success('Conta marcada como paga!');
      loadAccounts();
    } catch (error: any) {
      console.error('Erro ao marcar conta como paga:', error);
      toast.error('Erro ao marcar conta como paga');
    }
  };

  /**
   * Cancela conta
   */
  const handleCancelAccount = async (account: AccountPayable) => {
    if (confirm('Tem certeza que deseja cancelar esta conta?')) {
      try {
        await financialService.accountsPayable.cancel(account.id);
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
  const handleDeleteAccount = async (account: AccountPayable) => {
    if (confirm('Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.')) {
      try {
        await financialService.accountsPayable.delete(account.id);
        toast.success('Conta excluída!');
        loadAccounts();
      } catch (error: any) {
        console.error('Erro ao excluir conta:', error);
        toast.error('Erro ao excluir conta');
      }
    }
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
          <CardTitle>Contas a Pagar</CardTitle>
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
              placeholder="Buscar por descrição, fornecedor..."
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
              <SelectItem value={AccountStatus.PAID}>Pago</SelectItem>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead className="w-12">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {account.description}
                      {account.invoiceNumber && (
                        <div className="text-sm text-gray-500">
                          NF: {account.invoiceNumber}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{account.supplierName || '-'}</TableCell>
                    <TableCell>{formatCurrency(account.amount)}</TableCell>
                    <TableCell>{formatDate(account.dueDate)}</TableCell>
                    <TableCell>{getStatusBadge(account.status)}</TableCell>
                    <TableCell>{getCategoryName(account.category)}</TableCell>
                    <TableCell>
                      {account.paymentMethod ? getPaymentMethodLabel(account.paymentMethod) : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          
                          {account.status === AccountStatus.PENDING && (
                            <DropdownMenuItem onClick={() => handleMarkAsPaid(account)}>
                              <Check className="h-4 w-4 mr-2" />
                              Marcar como Pago
                            </DropdownMenuItem>
                          )}
                          
                          {account.status === AccountStatus.PENDING && (
                            <DropdownMenuItem onClick={() => handleCancelAccount(account)}>
                              <X className="h-4 w-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem 
                            onClick={() => handleDeleteAccount(account)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
      <AccountPayableForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
        account={selectedAccount}
        categories={categories}
      />
    </Card>
  );
};

export default AccountsPayableTable;