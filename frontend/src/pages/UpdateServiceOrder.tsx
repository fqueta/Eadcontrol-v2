import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import ServiceOrderForm from "@/components/serviceOrders/ServiceOrderForm";
import { serviceOrderSchema, type ServiceOrderFormData } from "@/components/serviceOrders/serviceOrderSchema";
import {
  useServiceOrder,
  useUpdateServiceOrder,
  useServiceOrderFormData
} from "@/hooks/serviceOrders";
import { ServiceOrderServiceItem, ServiceOrderProductItem } from "@/types/serviceOrders";
import { FormActionBar } from "@/components/common/FormActionBar";

/**
 * Página de atualização de ordem de serviço existente
 * Permite editar uma ordem com serviços e produtos
 */
export default function UpdateServiceOrder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // Hook para buscar ordem de serviço
  const {
    data: serviceOrder,
    isLoading: isLoadingServiceOrder,
    error: serviceOrderError
  } = useServiceOrder(id!);
  
  // Hook para atualizar ordem de serviço
  const updateServiceOrderMutation = useUpdateServiceOrder();
  // console.log('serviceOrder', serviceOrder);
  
  // Hook para dados do formulário (clientes, usuários, aeronaves, serviços, produtos)
  const {
    clients,
    users,
    aircraft,
    services,
    products,
    isLoadingClients,
    isLoadingUsers,
    isLoadingAircraft,
    isLoadingServices,
    isLoadingProducts,
    searchClients,
    searchUsers,
    searchAircraft,
    searchServices,
    searchProducts,
    clientsSearchTerm,
    usersSearchTerm,
    aircraftSearchTerm,
    servicesSearchTerm,
    productsSearchTerm,
  } = useServiceOrderFormData();

  // Configuração do formulário
  const form = useForm<ServiceOrderFormData>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: {
      doc_type: "os",
      title: "",
      description: "",
      client_id: "",
      aircraft_id: "",
      status: "draft",
      priority: "medium",
      estimated_start_date: "",
      estimated_end_date: "",
      notes: "",
      internal_notes: "",
      assigned_to: ""
    }
  });

  // Preenche o formulário quando os dados da ordem são carregados
  useEffect(() => {
    if (serviceOrder) {
      form.reset({
        doc_type: serviceOrder.doc_type || "os",
        title: serviceOrder.title,
        description: serviceOrder.description || "",
        client_id: serviceOrder.client_id,
        aircraft_id: serviceOrder.aircraft_id || "",
        status: serviceOrder.status,
        priority: serviceOrder.priority,
        estimated_start_date: serviceOrder.estimated_start_date 
          ? serviceOrder.estimated_start_date.split('T')[0] 
          : "",
        estimated_end_date: serviceOrder.estimated_end_date 
          ? serviceOrder.estimated_end_date.split('T')[0] 
          : "",
        notes: serviceOrder.notes || "",
        internal_notes: serviceOrder.internal_notes || "",
        assigned_to: serviceOrder.assigned_to || ""
      });
    }
  }, [serviceOrder, form]);

  // Submete o formulário
  /**
   * handleSubmit
   * Submete alterações da ordem existente e retorna à listagem.
   * English: Submits edits to the existing order and returns to the list.
   */
  const handleSubmit = async (data: ServiceOrderFormData & { 
    services: ServiceOrderServiceItem[]; 
    products: ServiceOrderProductItem[] 
  }) => {
    if (!id) return;
    console.log('handleSubmit',data);
    
    try {
      // Prepara os dados para envio
      const serviceOrderData = {
        title: data.title,
        description: data.description || null,
        client_id: data.client_id,
        aircraft_id: data.aircraft_id || null,
        status: data.status,
        priority: data.priority,
        doc_type: data.doc_type,
        estimated_start_date: data.estimated_start_date || null,
        estimated_end_date: data.estimated_end_date || null,
        notes: data.notes || null,
        internal_notes: data.internal_notes || null,
        assigned_to: data.assigned_to || null,
        services: data.services.map(service => ({
          service_id: service.service_id,
          quantity: service.quantity,
          unit_price: service.unit_price,
          total_price: service.total_price,
          notes: service.notes || null
        })),
        products: data.products.map(product => ({
          product_id: product.product_id,
          quantity: product.quantity,
          unit_price: product.unit_price,
          total_price: product.total_price,
          notes: product.notes || null
        }))
      };

      await updateServiceOrderMutation.mutateAsync({ id, data: serviceOrderData });
      
      toast.success("Ordem de serviço atualizada com sucesso!");
      
      // Redireciona para a página de visualização da ordem atualizada
      // navigate(`/service-orders/show/${id}`);
      navigate(`/service-orders`);
    } catch (error) {
      console.error("Erro ao atualizar ordem de serviço:", error);
      toast.error("Erro ao atualizar ordem de serviço. Verifique os dados e tente novamente.");
    }
  };

  // Cancela a edição e volta para a visualização
  /**
   * handleCancel
   * Cancela a edição e volta para a visualização da ordem.
   * English: Cancels edit and navigates back to the order details view.
   */
  const handleCancel = () => {
    navigate(`/service-orders/show/${id}`);
  };

  // Volta para a visualização
  const handleBack = () => {
    navigate(`/service-orders/show/${id}`);
  };

  // Verifica se o ID é válido
  if (!id) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Erro</CardTitle>
            <CardDescription>
              ID da ordem de serviço não fornecido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/admin/service-orders")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Listagem
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exibe erro se houver
  if (serviceOrderError) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Erro ao Carregar Ordem</CardTitle>
            <CardDescription>
              Não foi possível carregar os dados da ordem de serviço.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={() => navigate("/admin/service-orders")} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Listagem
              </Button>
              <Button onClick={() => window.location.reload()}>
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exibe loading enquanto carrega os dados
  if (isLoadingServiceOrder) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        {/* Skeleton do cabeçalho */}
        <div className="flex items-center gap-4">
          <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        
        {/* Skeleton do formulário */}
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Não renderiza se não há dados da ordem
  if (!serviceOrder) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Ordem não encontrada</CardTitle>
            <CardDescription>
              A ordem de serviço solicitada não foi encontrada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/admin/service-orders")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Listagem
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Ordem de Serviço</h1>
          <p className="text-gray-600">
            Atualize as informações da ordem #{String(serviceOrder.id).slice(-8).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Atualizar Ordem de Serviço
          </CardTitle>
          <CardDescription>
            Modifique as informações abaixo para atualizar a ordem de serviço. 
            Você pode adicionar, remover ou editar serviços e produtos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceOrderForm
            form={form}
            onSubmit={handleSubmit}
            isSubmitting={updateServiceOrderMutation.isPending}
            clients={clients}
            users={users}
            aircraft={aircraft}
            availableServices={services}
            availableProducts={products}
            isLoadingClients={isLoadingClients}
            isLoadingUsers={isLoadingUsers}
            isLoadingAircraft={isLoadingAircraft}
            isLoadingServices={isLoadingServices}
            isLoadingProducts={isLoadingProducts}
            onCancel={handleCancel}
            isEditing={true}
            initialServices={serviceOrder.services || []}
            initialProducts={serviceOrder.products || []}
            searchClients={searchClients}
            searchUsers={searchUsers}
            searchAircraft={searchAircraft}
            searchServices={searchServices}
            searchProducts={searchProducts}
            clientsSearchTerm={clientsSearchTerm}
            usersSearchTerm={usersSearchTerm}
            aircraftSearchTerm={aircraftSearchTerm}
            servicesSearchTerm={servicesSearchTerm}
            productsSearchTerm={productsSearchTerm}
            // Usa FormActionBar padronizado dentro do formulário
            renderActions={
              <FormActionBar
                mode="edit"
                fixed={false}
                onCancel={handleCancel}
                isLoading={updateServiceOrderMutation.isPending}
              />
            }
          />
        </CardContent>
      </Card>

      {/* Informações da Ordem */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Ordem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">ID da Ordem:</span>
              <p className="font-medium">#{String(serviceOrder.id).slice(-8).toUpperCase()}</p>
            </div>
            <div>
              <span className="text-gray-600">Criada em:</span>
              <p className="font-medium">
                {new Date(serviceOrder.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Última atualização:</span>
              <p className="font-medium">
                {new Date(serviceOrder.updated_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dicas */}
      <Card>
        <CardHeader>
          <CardTitle>Dicas para Edição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm mb-2">⚠️ Atenção</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Alterações afetam o histórico da ordem</li>
                <li>• Verifique se o cliente foi notificado</li>
                <li>• Mudanças de status podem gerar notificações</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">💡 Sugestões</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use observações internas para registrar mudanças</li>
                <li>• Mantenha o cliente informado sobre alterações</li>
                <li>• Revise os valores antes de salvar</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}