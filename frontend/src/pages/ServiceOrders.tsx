import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, RefreshCw, Zap } from "lucide-react";
import ServiceOrderTable from "@/components/serviceOrders/ServiceOrderTable";
import {
  useServiceOrdersList,
  useDeleteServiceOrder,
  useUpdateServiceOrderStatus
} from "@/hooks/serviceOrders";
import { ServiceOrderStatus } from "@/types/serviceOrders";

/**
 * Página de listagem de ordens de serviço
 * Permite visualizar, filtrar, editar e excluir ordens de serviço
 */
export default function ServiceOrders() {
  const navigate = useNavigate();
  
  // Estados para filtros e paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  
  // Debounce do termo de busca para evitar muitas requisições
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Parâmetros memoizados para evitar re-renderizações desnecessárias
  const queryParams = useMemo(() => ({
    page: currentPage,
    limit: 50,
    search: debouncedSearchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    doc_type: docTypeFilter !== "all" ? docTypeFilter : undefined
  }), [currentPage, debouncedSearchTerm, statusFilter, priorityFilter, docTypeFilter]);
  
  // Hooks para gerenciar dados
  const {
    data: serviceOrdersData,
    isLoading,
    error,
    refetch
  } = useServiceOrdersList(queryParams);

  const deleteServiceOrderMutation = useDeleteServiceOrder();
  const updateStatusMutation = useUpdateServiceOrderStatus();

  // Dados da resposta paginada
  // console.log('serviceOrdersData:', serviceOrdersData);
  const serviceOrders = Array.isArray(serviceOrdersData?.data) ? serviceOrdersData.data : [];
  const totalPages = serviceOrdersData?.last_page || 1;
  const totalItems = serviceOrdersData?.total || 0;

  // Navega para a página de visualização
  const handleView = (id: string) => {
    navigate(`/service-orders/show/${id}`);
  };

  // Navega para a página de edição
  const handleEdit = (id: string) => {
    navigate(`/service-orders/update/${id}`);
  };

  // Exclui uma ordem de serviço
  const handleDelete = async (id: string) => {
    try {
      await deleteServiceOrderMutation.mutateAsync(id);
      toast.success("Ordem de serviço excluída com sucesso!");
      refetch();
    } catch (error) {
      console.error("Erro ao excluir ordem de serviço:", error);
      
      // Função para determinar mensagem de erro específica
      const getErrorMessage = () => {
        const errorWithStatus = error as Error & { status?: number };
        
        switch (errorWithStatus.status) {
          case 400:
            return "Não é possível excluir esta ordem de serviço. Verifique se não há dependências.";
          case 404:
            return "Ordem de serviço não encontrada. Pode ter sido removida por outro usuário.";
          case 409:
            return "Ordem de serviço não pode ser excluída pois possui registros vinculados.";
          case 500:
            return "Erro interno do servidor. Tente novamente em alguns minutos.";
          case 403:
            return "Você não tem permissão para excluir esta ordem de serviço.";
          case 401:
            return "Sua sessão expirou. Faça login novamente.";
          default:
            return (error as Error).message || "Ocorreu um erro inesperado ao excluir a ordem de serviço.";
        }
      };
      
      toast.error(getErrorMessage());
    }
  };

  // Atualiza o status de uma ordem de serviço
  const handleStatusChange = async (id: string, newStatus: ServiceOrderStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: newStatus });
      toast.success("Status atualizado com sucesso!");
      refetch();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      
      // Função para determinar mensagem de erro específica
      const getErrorMessage = () => {
        const errorWithStatus = error as Error & { status?: number };
        
        switch (errorWithStatus.status) {
          case 400:
            return "Status inválido ou transição não permitida.";
          case 404:
            return "Ordem de serviço não encontrada. Pode ter sido removida por outro usuário.";
          case 409:
            return "Não é possível alterar o status devido ao estado atual da ordem de serviço.";
          case 422:
            return "Dados não processáveis. Verifique se o status é válido.";
          case 500:
            return "Erro interno do servidor. Tente novamente em alguns minutos.";
          case 403:
            return "Você não tem permissão para alterar o status desta ordem de serviço.";
          case 401:
            return "Sua sessão expirou. Faça login novamente.";
          default:
            return (error as Error).message || "Ocorreu um erro inesperado ao atualizar o status.";
        }
      };
      
      toast.error(getErrorMessage());
    }
  };

  // Navega para a página de criação
  const handleCreate = () => {
    navigate("/admin/service-orders/create");
  };

  // Atualiza a página atual
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Atualiza o termo de busca com callback memoizado
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset para primeira página ao buscar
  }, []);

  // Atualiza o filtro de status com callback memoizado
  const handleStatusFilterChange = useCallback((status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset para primeira página ao filtrar
  }, []);

  // Atualiza o filtro de prioridade com callback memoizado
  const handlePriorityFilterChange = useCallback((priority: string) => {
    setPriorityFilter(priority);
    setCurrentPage(1); // Reset para primeira página ao filtrar
  }, []);

  // Atualiza o filtro de tipo de documento com callback memoizado
  const handleDocTypeFilterChange = useCallback((docType: string) => {
    setDocTypeFilter(docType);
    setCurrentPage(1); // Reset para primeira página ao filtrar
  }, []);

  // Recarrega os dados
  const handleRefresh = () => {
    refetch();
    toast.success("Dados atualizados!");
  };

  // Exibe erro se houver
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Erro ao Carregar Dados</CardTitle>
            <CardDescription>
              Ocorreu um erro ao carregar as ordens de serviço. Tente novamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Ordem
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Ordens de Serviço</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Gerencie todas as ordens de serviço do sistema
            {totalItems > 0 && (
              <span className="ml-2">({totalItems} {totalItems === 1 ? 'item' : 'itens'})</span>
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
            <span className="sm:hidden">Atualizar</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/service-orders/quick-create")}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700 w-full sm:w-auto text-xs sm:text-sm"
          >
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Cadastro Rápido</span>
            <span className="sm:hidden">Rápido</span>
          </Button>
          <Button onClick={handleCreate} className="w-full sm:w-auto text-xs sm:text-sm">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Nova Ordem</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Ordens de Serviço</CardTitle>
          <CardDescription>
            Visualize, edite e gerencie todas as ordens de serviço cadastradas no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceOrderTable
            serviceOrders={serviceOrders}
            isLoading={isLoading}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={handlePriorityFilterChange}
            docTypeFilter={docTypeFilter}
            onDocTypeFilterChange={handleDocTypeFilterChange}
          />
        </CardContent>
      </Card>

      {/* Estatísticas Rápidas */}
      {!isLoading && serviceOrders.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-4">
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-blue-600">
                  {serviceOrders.filter(so => so.status === 'pending').length}
                </p>
                <p className="text-xs md:text-sm text-gray-600">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-4">
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-yellow-600">
                  {serviceOrders.filter(so => so.status === 'in_progress').length}
                </p>
                <p className="text-xs md:text-sm text-gray-600">Em Andamento</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-4">
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-green-600">
                  {serviceOrders.filter(so => so.status === 'completed').length}
                </p>
                <p className="text-xs md:text-sm text-gray-600">Concluídas</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-4">
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-red-600">
                  {serviceOrders.filter(so => so.priority === 'urgent').length}
                </p>
                <p className="text-xs md:text-sm text-gray-600">Urgentes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estado Vazio */}
      {!isLoading && serviceOrders.length === 0 && searchTerm === "" && statusFilter === "all" && priorityFilter === "all" && docTypeFilter === "all" && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                <Plus className="h-12 w-12 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Nenhuma ordem de serviço encontrada</h3>
                <p className="text-gray-600 mt-2">
                  Comece criando sua primeira ordem de serviço para organizar e gerenciar os trabalhos.
                </p>
              </div>
              <Button onClick={handleCreate} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Ordem
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}