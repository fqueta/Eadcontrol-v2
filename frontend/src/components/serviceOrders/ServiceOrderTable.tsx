import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Calendar,
  User,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ServiceOrder, 
  SERVICE_ORDER_STATUSES, 
  SERVICE_ORDER_PRIORITIES,
  ServiceOrderStatus,
  ServiceOrderPriority
} from "@/types/serviceOrders";

interface ServiceOrderTableProps {
  serviceOrders: ServiceOrder[];
  isLoading: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, status: ServiceOrderStatus) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (priority: string) => void;
  docTypeFilter: string;
  onDocTypeFilterChange: (docType: string) => void;
}

/**
 * Componente de tabela para exibição e gerenciamento de ordens de serviço
 * Inclui filtros, paginação e ações de CRUD
 */
export default function ServiceOrderTable({
  serviceOrders,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  currentPage,
  totalPages,
  onPageChange,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  docTypeFilter,
  onDocTypeFilterChange
}: ServiceOrderTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceOrderToDelete, setServiceOrderToDelete] = useState<string | null>(null);

  // Obtém a configuração de cor para o status
  const getStatusConfig = (status: ServiceOrderStatus) => {
    return SERVICE_ORDER_STATUSES.find(s => s.value === status) || SERVICE_ORDER_STATUSES[0];
  };

  // Obtém a configuração de cor para a prioridade
  const getPriorityConfig = (priority: ServiceOrderPriority) => {
    return SERVICE_ORDER_PRIORITIES.find(p => p.value === priority) || SERVICE_ORDER_PRIORITIES[0];
  };

  // Formata a data para exibição
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  // Formata valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Confirma a exclusão
  const handleDeleteConfirm = () => {
    if (serviceOrderToDelete) {
      onDelete(serviceOrderToDelete);
      setServiceOrderToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // Abre o diálogo de confirmação de exclusão
  const handleDeleteClick = (id: string) => {
    setServiceOrderToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Altera o status da ordem de serviço
  const handleStatusChange = (id: string, newStatus: ServiceOrderStatus) => {
    if (onStatusChange) {
      onStatusChange(id, newStatus);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Skeleton dos filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="w-full sm:w-48">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="w-full sm:w-48">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        
        {/* Skeleton da tabela */}
        <div className="border rounded-lg">
          <div className="h-12 bg-gray-100 border-b" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b last:border-b-0 bg-white">
              <div className="flex items-center h-full px-4 space-x-4">
                <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  console.log('serviceOrders:', serviceOrders);
  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Busca */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por título, cliente ou descrição..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtro de Status */}
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {SERVICE_ORDER_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`bg-${status.color}-100 text-${status.color}-800`}>
                      {status.label}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Prioridade */}
        <div className="w-full sm:w-48">
          <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              {SERVICE_ORDER_PRIORITIES.map((priority) => (
                <SelectItem key={priority.value} value={priority.value}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`bg-${priority.color}-100 text-${priority.color}-800`}>
                      {priority.label}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Tipo de Documento */}
        <div className="w-full sm:w-48">
          <Select value={docTypeFilter} onValueChange={onDocTypeFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="os">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    O.S.
                  </Badge>
                </div>
              </SelectItem>
              <SelectItem value="orc">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    Orçamento
                  </Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px] sm:min-w-[1000px] lg:min-w-[1200px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] min-w-[60px] text-xs sm:text-sm">ID</TableHead>
                <TableHead className="w-[80px] min-w-[80px] text-xs sm:text-sm">Tipo</TableHead>
                <TableHead className="min-w-[120px] sm:min-w-[180px] text-xs sm:text-sm">Título</TableHead>
                <TableHead className="min-w-[100px] sm:min-w-[140px] text-xs sm:text-sm">Cliente</TableHead>
                <TableHead className="min-w-[90px] sm:min-w-[110px] text-xs sm:text-sm">Status</TableHead>
                <TableHead className="min-w-[90px] sm:min-w-[110px] text-xs sm:text-sm">Prioridade</TableHead>
                {/* <TableHead className="min-w-[120px] sm:min-w-[140px] hidden lg:table-cell text-xs sm:text-sm">Responsável</TableHead> */}
                <TableHead className="min-w-[100px] sm:min-w-[120px] hidden md:table-cell text-xs sm:text-sm">Data Criação</TableHead>
                <TableHead className="min-w-[90px] sm:min-w-[110px] text-xs sm:text-sm">Valor Total</TableHead>
                <TableHead className="text-right w-[80px] min-w-[80px] text-xs sm:text-sm">Ações</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {serviceOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <p className="text-gray-500">Nenhuma ordem de serviço encontrada</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              serviceOrders.map((serviceOrder) => {
                const statusConfig = getStatusConfig(serviceOrder.status);
                const priorityConfig = getPriorityConfig(serviceOrder.priority);
                
                return (
                  <TableRow key={serviceOrder.id}>
                    <TableCell className="font-medium text-xs sm:text-sm">
                      #{String(serviceOrder.id).slice(-6).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${serviceOrder.doc_type === 'os' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}
                      >
                        {serviceOrder.doc_type === 'os' ? 'O.S.' : 'Orc'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[120px] sm:max-w-[180px]">
                        <p className="font-medium truncate text-xs sm:text-sm">{serviceOrder.title}</p>
                        {serviceOrder.description && (
                          <p className="text-xs text-gray-500 truncate hidden sm:block">
                            {serviceOrder.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 hidden sm:block" />
                        <span className="truncate max-w-[100px] sm:max-w-[140px] text-xs sm:text-sm">
                          {serviceOrder.client?.name || serviceOrder.client_name || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {onStatusChange ? (
                        <Select
                          value={serviceOrder.status}
                          onValueChange={(value) => handleStatusChange(serviceOrder.id, value as ServiceOrderStatus)}
                        >
                          <SelectTrigger className="w-auto border-none p-0 h-auto">
                            <Badge 
                              variant="outline" 
                              className={`bg-${statusConfig.color}-100 text-${statusConfig.color}-800 cursor-pointer text-xs`}
                            >
                              {statusConfig.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_ORDER_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                <Badge 
                                  variant="outline" 
                                  className={`bg-${status.color}-100 text-${status.color}-800 text-xs`}
                                >
                                  {status.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge 
                          variant="outline" 
                          className={`bg-${statusConfig.color}-100 text-${statusConfig.color}-800 text-xs`}
                        >
                          {statusConfig.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`bg-${priorityConfig.color}-100 text-${priorityConfig.color}-800 text-xs`}
                      >
                        {priorityConfig.label}
                      </Badge>
                    </TableCell>
                    {/* <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                        <span className="truncate max-w-[100px] sm:max-w-[120px] text-xs sm:text-sm">
                          {serviceOrder.assigned_user?.name || "-"}
                        </span>
                      </div>
                    </TableCell> */}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                        <span className="text-xs sm:text-sm">
                          {formatDate(serviceOrder.created_at)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-xs sm:text-sm">
                        {formatCurrency(serviceOrder.total_amount || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onView(serviceOrder.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(serviceOrder.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(serviceOrder.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          </Table>
        </div>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}