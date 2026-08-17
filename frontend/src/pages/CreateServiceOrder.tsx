import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import ServiceOrderForm from "@/components/serviceOrders/ServiceOrderForm";
import { serviceOrderSchema, type ServiceOrderFormData } from "@/components/serviceOrders/serviceOrderSchema";
import {
  useCreateServiceOrder,
  useServiceOrderFormData
} from "@/hooks/serviceOrders";
import { useQueryClient } from "@tanstack/react-query";
import { ServiceOrderServiceItem, ServiceOrderProductItem } from "@/types/serviceOrders";
import { FormActionBar } from "@/components/common/FormActionBar";

/**
 * Página de criação de nova ordem de serviço
 * Permite criar uma ordem com serviços e produtos
 */
export default function CreateServiceOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Hook para criar ordem de serviço
  const createServiceOrderMutation = useCreateServiceOrder();
  
  // Dados da ordem a ser duplicada (se houver)
  const duplicateData = location.state?.duplicateData;
  
  // Dados do cadastro rápido (se houver)
  const quickCreateData = useMemo(() => {
    return location.state?.quickCreate ? {
      clientId: location.state?.clientId,
      aircraftId: location.state?.aircraftId
    } : null;
  }, [location.state?.quickCreate, location.state?.clientId, location.state?.aircraftId]);
  
  // Hook para dados do formulário (usuários, aeronaves, serviços, produtos)
  const {
    users,
    aircraft,
    services,
    products,
    isLoadingUsers,
    isLoadingAircraft,
    isLoadingServices,
    isLoadingProducts,
    searchUsers,
    searchAircraft,
    searchServices,
    searchProducts,
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
      client_id: quickCreateData?.clientId || "",
      aircraft_id: quickCreateData?.aircraftId || "",
      status: "agendado",
      priority: "medium",
      estimated_start_date: "",
      estimated_end_date: "",
      notes: "",
      internal_notes: "",
      assigned_to: ""
    }
  });

  // Preenche o formulário com dados da ordem a ser duplicada
  useEffect(() => {
    if (duplicateData) {
      form.reset({
        title: `Cópia de ${duplicateData.title}`,
        description: duplicateData.description || "",
        client_id: duplicateData.client_id || "",
        aircraft_id: duplicateData.aircraft_id || "",
        status: "agendado", // Sempre inicia como agendado
        priority: duplicateData.priority || "medium",
        estimated_start_date: "", // Limpa as datas
        estimated_end_date: "",
        notes: duplicateData.notes || "",
        internal_notes: duplicateData.internal_notes || "",
        assigned_to: duplicateData.assigned_to || ""
      });
      
      toast.info("Dados da ordem original carregados. Revise as informações antes de salvar.");
    }
  }, [duplicateData, form]);

  // Preenche o formulário com dados do cadastro rápido
  useEffect(() => {
    if (quickCreateData) {
      form.setValue("client_id", quickCreateData.clientId || "");
      form.setValue("aircraft_id", quickCreateData.aircraftId || "");
      toast.success("Cliente selecionado automaticamente! Agora preencha os demais dados da ordem de serviço.");
    }
  }, [quickCreateData, form]);

  // Submete o formulário
  /**
   * handleSubmit
   * Submete a criação da ordem e navega para visualização da ordem criada.
   * English: Submits the creation and navigates to the newly created order view.
   */
  const handleSubmit = async (data_submit: ServiceOrderFormData & { 
    services: ServiceOrderServiceItem[]; 
    products: ServiceOrderProductItem[] 
  }) => {
    const data = data_submit as any;
    try {
      // Prepara os dados para envio
      const serviceOrderData = {
        title: data.title,
        description: data.description || null,
        client_id: data.client_id,
        aircraft_id: data.aircraft_id || null,
        status: data.status,
        priority: data.priority,
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

      const result = await createServiceOrderMutation.mutateAsync(serviceOrderData);
      
      toast.success("Ordem de serviço criada com sucesso!");
      
      // Redireciona para a página de visualização da ordem criada
      navigate(`/admin/service-orders/show/${result.id}`);
    } catch (error) {
      // console.log('error:',error);
      let arr: Array<any> = [];
      let message:string = '';
      if(arr=error.body as Array<any>){
        console.log('arr:', arr);
        for (const [field, messages] of Object.entries(arr)) {
          console.log("Campo:", field);
          messages.forEach(msg => {
            console.log(" - Erro:", msg);
            message += msg + '\n';
          });
          form.setError(field as keyof ServiceOrderFormData, {
            type: "manual",
            message: messages.join(", ")
          });
        }        
      }
      // console.error("Erro ao criar ordem de serviço:", error);
      toast.error("Erro ao criar ordem de serviço.\n\n" + message);
    }
  };

  // Cancela a criação e volta para a listagem
  /**
   * handleCancel
   * Cancela a criação e retorna à listagem de ordens.
   * English: Cancels creation and returns to the service orders list.
   */
  const handleCancel = () => {
    navigate("/admin/service-orders");
  };

  // Volta para a listagem
  const handleBack = () => {
    navigate("/admin/service-orders");
  };

  // Callback para quando um serviço é criado via cadastro rápido
  const handleServiceCreated = () => {
    // Invalida o cache das queries de serviços para atualizar as listas
    queryClient.invalidateQueries({ queryKey: ['search-services'] });
    queryClient.invalidateQueries({ queryKey: ['services'] });
  };

  // Callback para quando um produto é criado via cadastro rápido
  const handleProductCreated = () => {
    // Invalida o cache das queries de produtos para atualizar as listas
    queryClient.invalidateQueries({ queryKey: ['search-products'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  // Callback para quando uma aeronave é criada via cadastro rápido
  const handleAircraftCreated = () => {
    // Invalida o cache das queries de aeronaves para atualizar as listas
    queryClient.invalidateQueries({ queryKey: ['search-aircraft'] });
    queryClient.invalidateQueries({ queryKey: ['aircraft'] });
  };
  
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
          <h1 className="text-3xl font-bold tracking-tight">Nova Ordem de Serviço</h1>
          <p className="text-gray-600">
            Crie uma nova ordem de serviço com serviços e produtos
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Criar Ordem de Serviço
          </CardTitle>
          <CardDescription>
            Preencha as informações abaixo para criar uma nova ordem de serviço. 
            Você pode adicionar serviços e produtos conforme necessário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceOrderForm
            form={form}
            onSubmit={handleSubmit}
            isSubmitting={createServiceOrderMutation.isPending}
            users={users}
            aircraft={aircraft}
            availableServices={services}
            availableProducts={products}
            isLoadingUsers={isLoadingUsers}
            isLoadingAircraft={isLoadingAircraft}
            isLoadingServices={isLoadingServices}
            isLoadingProducts={isLoadingProducts}
            searchUsers={searchUsers}
            searchAircraft={searchAircraft}
            searchServices={searchServices}
            searchProducts={searchProducts}
            usersSearchTerm={usersSearchTerm}
            aircraftSearchTerm={aircraftSearchTerm}
            servicesSearchTerm={servicesSearchTerm}
            productsSearchTerm={productsSearchTerm}
            onCancel={handleCancel}
            isEditing={false}
            initialServices={duplicateData?.services || []}
            initialProducts={duplicateData?.products || []}
            onServiceCreated={handleServiceCreated}
            onProductCreated={handleProductCreated}
            onAircraftCreated={handleAircraftCreated}
            // Usa FormActionBar padronizado dentro do formulário
            renderActions={
              <FormActionBar
                mode="edit"
                fixed={false}
                onCancel={handleCancel}
                isLoading={createServiceOrderMutation.isPending}
                labels={{ saveEdit: "Criar Ordem" }}
              />
            }
          />
        </CardContent>
      </Card>

      {/* Dicas */}
      <Card>
        <CardHeader>
          <CardTitle>Dicas para Criação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm mb-2">📋 Informações Básicas</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Escolha um título descritivo para a ordem</li>
                <li>• Selecione o cliente responsável</li>
                <li>• Defina a prioridade adequada</li>
                <li>• Configure as datas estimadas</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">🛠️ Serviços e Produtos</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Adicione todos os serviços necessários</li>
                <li>• Inclua produtos que serão utilizados</li>
                <li>• Ajuste quantidades e preços conforme necessário</li>
                <li>• Use as observações para detalhes específicos</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">👥 Responsabilidade</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Atribua um responsável pela execução</li>
                <li>• Use observações internas para a equipe</li>
                <li>• Observações públicas são visíveis ao cliente</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">💰 Valores</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Os totais são calculados automaticamente</li>
                <li>• Você pode ajustar preços unitários</li>
                <li>• Verifique o resumo financeiro antes de salvar</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}