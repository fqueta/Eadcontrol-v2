import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  RefreshCw,
  Printer,
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  User,
  Plane,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  
} from "lucide-react";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { phoneApplyMask } from '@/lib/masks/phone-apply-mask';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ServiceOrderDetails from "@/components/serviceOrders/ServiceOrderDetails";
import {
  useServiceOrder,
  useDeleteServiceOrder
} from "@/hooks/serviceOrders";
import "@/styles/print.css";
import { object } from "zod";

/**
 * Página de visualização detalhada de uma ordem de serviço
 * Exibe todas as informações, serviços, produtos e permite ações
 */
export default function ShowServiceOrder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Hook para buscar ordem de serviço
  const {
    data: serviceOrderIni,
    isLoading,
    error,
    refetch
  } = useServiceOrder(id!);
  const serviceOrder = serviceOrderIni as any;
  // Hook para excluir ordem de serviço
  const deleteServiceOrderMutation = useDeleteServiceOrder();

  // Navega para a página de edição
  const handleEdit = () => {
    navigate(`/service-orders/update/${id}`);
  };

  // Exclui a ordem de serviço
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteServiceOrderMutation.mutateAsync(id);
      toast.success("Ordem de serviço excluída com sucesso!");
      navigate("/admin/service-orders");
    } catch (error) {
      console.error("Erro ao excluir ordem de serviço:", error);
      toast.error("Erro ao excluir ordem de serviço. Tente novamente.");
    }
  };

  // Volta para a listagem
  const handleBack = () => {
    navigate("/admin/service-orders");
  };

  // Atualiza os dados
  const handleRefresh = () => {
    refetch();
    toast.success("Dados atualizados!");
  };

  // Copia o ID da ordem
  const handleCopyId = () => {
    if (serviceOrder?.id) {
      navigator.clipboard.writeText(serviceOrder.id);
      toast.success("ID copiado para a área de transferência!");
    }
  };

  // Simula impressão (pode ser implementado com uma biblioteca de PDF)
  const handlePrint = () => {
    window.print();
  };

  // Simula download (pode ser implementado com geração de PDF)
  const handleDownload = () => {
    toast.info("Funcionalidade de download será implementada em breve.");
  };

  // Duplica a ordem de serviço
  const handleDuplicate = () => {
    if (!serviceOrder) return;
    
    // Navega para a página de criação passando os dados da ordem atual
    navigate('/admin/service-orders/create', {
      state: {
        duplicateData: {
          title: serviceOrder.title,
          description: serviceOrder.description,
          client_id: serviceOrder.client_id,
          aircraft_id: serviceOrder.aircraft_id,
          priority: serviceOrder.priority,
          notes: serviceOrder.notes,
          internal_notes: serviceOrder.internal_notes,
          assigned_to: serviceOrder.assigned_to,
          services: serviceOrder.services || [],
          products: serviceOrder.products || []
        }
      }
    });
    
    toast.success("Redirecionando para criar nova ordem com dados copiados...");
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
            <Button onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Listagem
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exibe erro se houver
  if (error) {
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
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Listagem
              </Button>
              <Button onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exibe loading enquanto carrega os dados
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        {/* Skeleton do cabeçalho */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
            <div>
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        
        {/* Skeleton do conteúdo */}
        <ServiceOrderDetails
          serviceOrder={{} as any}
          isLoading={true}
        />
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
            <Button onClick={handleBack}>
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print-header">
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
            <h1 className="text-3xl font-bold tracking-tight">{serviceOrder.title}</h1>
            <div className="flex items-center gap-2 text-gray-600">
              <span>Ordem #{String(serviceOrder.id).slice(-8).toUpperCase()}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyId}
                className="h-6 px-2"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 no-print service-order-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          
          <Button
            size="sm"
            onClick={handleEdit}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta ordem de serviço? 
                  Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteServiceOrderMutation.isPending}
                >
                  {deleteServiceOrderMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <ServiceOrderDetails
        serviceOrder={serviceOrder}
        onEdit={handleEdit}
        onPrint={handlePrint}
        onDownload={handleDownload}
        isLoading={false}
      />

      {/* Informações Detalhadas - Cliente e Aeronave */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card de Informações do Cliente */}
        {serviceOrder.client && (
          <ClientDetailsCard client={serviceOrder.client} />
        )}
        
        {/* Card de Informações da Aeronave */}
        {serviceOrder.aircraft && (
          <AircraftDetailsCard aircraft={serviceOrder.aircraft} />
        )}
      </div>

      {/* Ações Rápidas */}
      <Card className="no-print quick-actions-card">
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Ações comuns para esta ordem de serviço
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={handleEdit}
            >
              <Edit className="h-6 w-6" />
              <div className="text-center">
                <p className="font-medium">Editar Ordem</p>
                <p className="text-sm text-gray-600">Modificar informações</p>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={handleDuplicate}
            >
              <Copy className="h-6 w-6" />
              <div className="text-center">
                <p className="font-medium">Duplicar Ordem</p>
                <p className="text-sm text-gray-600">Criar ordem similar</p>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={handlePrint}
            >
              <Printer className="h-6 w-6" />
              <div className="text-center">
                <p className="font-medium">Imprimir</p>
                <p className="text-sm text-gray-600">Gerar relatório</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico (placeholder para futura implementação) */}
      <Card className="no-print history-card">
        <CardHeader>
          <CardTitle>Histórico de Alterações</CardTitle>
          <CardDescription>
            Registro de todas as modificações realizadas nesta ordem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Histórico de alterações será implementado em uma versão futura.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Componente para exibir informações detalhadas do cliente
 */
function ClientDetailsCard({ client }: { client: any }) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return "-";
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "-";
    const cleaned = phone.replace(/\D/g, '');
    const masked = phoneApplyMask(cleaned);
    return masked || "-";
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Informações do Cliente</CardTitle>
                  <CardDescription>
                    {client.name} • {client.tipo_pessoa === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </CardDescription>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Informações Básicas */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-900 mb-3">Dados Básicos</h4>
                
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Email:</span>
                  <span>{client.email || "-"}</span>
                </div>
                
                {client.tipo_pessoa === 'pf' ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">CPF:</span>
                      <span>{client.cpf || "-"}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">RG:</span>
                      <span>{client.config?.rg || "-"}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Nascimento:</span>
                      <span>{formatDate(client.config?.nascimento)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Gênero:</span>
                      <span>
                        {client.genero === 'm' ? 'Masculino' : 
                         client.genero === 'f' ? 'Feminino' : 'Não informado'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">CNPJ:</span>
                      <span>{client.cnpj || "-"}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Razão Social:</span>
                      <span>{client.razao || "-"}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Nome Fantasia:</span>
                      <span>{client.config?.nome_fantasia || "-"}</span>
                    </div>
                  </>
                )}
              </div>
              
              {/* Contato e Endereço */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-900 mb-3">Contato & Endereço</h4>
                
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Celular:</span>
                  <span>{formatPhone(client.config?.celular)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Tel. Residencial:</span>
                  <span>{formatPhone(client.config?.telefone_residencial)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Tel. Comercial:</span>
                  <span>{formatPhone(client.config?.telefone_comercial)}</span>
                </div>
                
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <span className="text-gray-600">Endereço:</span>
                    <div className="mt-1">
                      {client.config?.endereco && (
                        <div>{client.config.endereco}, {client.config?.numero}</div>
                      )}
                      {client.config?.complemento && (
                        <div>{client.config.complemento}</div>
                      )}
                      {client.config?.bairro && (
                        <div>{client.config.bairro}</div>
                      )}
                      {client.config?.cidade && client.config?.uf && (
                        <div>{client.config.cidade} - {client.config.uf}</div>
                      )}
                      {client.config?.cep && (
                        <div>CEP: {client.config.cep}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                {client.config?.observacoes && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <span className="text-gray-600">Observações:</span>
                      <div className="mt-1 text-gray-800">{client.config.observacoes}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * Componente para exibir informações detalhadas da aeronave
 */
function AircraftDetailsCard({ aircraft }: { aircraft: any }) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return "-";
    }
  };
  const rab = aircraft?.rab as any;
// console.log('aircraft',aircraft);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Plane className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Informações da Aeronave</CardTitle>
                  <CardDescription>
                    {aircraft.matricula} • {aircraft.active ? 'Ativa' : 'Inativa'}
                  </CardDescription>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-900 mb-3">Dados da Aeronave</h4>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Plane className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Matrícula:</span>
                    <span className="font-medium">{aircraft.matricula}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      aircraft.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {aircraft.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Cadastrada em:</span>
                    <span>{formatDate(aircraft.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Última atualização:</span>
                    <span>{formatDate(aircraft.updated_at)}</span>
                  </div>
                </div>                
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-900 mb-3">Detalhes Técnicos</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rab && Object.keys(rab).map((key) => (
                        <TableRow key={key}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                              {key}
                            </div>
                          </TableCell>
                          <TableCell>{rab[key]}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {/* {rab && Object.keys(rab).map((key) => (
                    <div className="flex items-start gap-2 text-sm" key={key}>
                      <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <span className="text-gray-600">{key}:</span>
                        <div className="mt-1 text-gray-800">{rab[key]}</div>
                      </div>
                    </div>
                  ))} */}
                  
                  {aircraft.description && (
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <span className="text-gray-600">Descrição:</span>
                        <div className="mt-1 text-gray-800">{aircraft.description}</div>
                      </div>
                    </div>
                  )}
                  
                  {aircraft.client && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Proprietário:</span>
                      <span>{aircraft.client.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>            
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}