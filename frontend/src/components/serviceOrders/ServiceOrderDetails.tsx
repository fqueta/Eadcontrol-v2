import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  User,
  FileText,
  Clock,
  DollarSign,
  Package,
  Settings,
  Edit,
  Printer,
  Download
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

interface ServiceOrderDetailsProps {
  serviceOrder: ServiceOrder;
  onEdit?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
  isLoading?: boolean;
}

/**
 * Componente para exibição detalhada de uma ordem de serviço
 * Mostra todas as informações, serviços, produtos e totais
 */
export default function ServiceOrderDetails({
  serviceOrder,
  onEdit,
  onPrint,
  onDownload,
  isLoading = false
}: ServiceOrderDetailsProps) {
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
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  // Formata apenas a data
  const formatDateOnly = (dateString: string | null) => {
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
  // console.log('serviceOrder:', serviceOrder);
  // console.log('item:', serviceOrder.services);
  
  // Calcula totais
  const servicesTotal = serviceOrder.services?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;
  const productsTotal = serviceOrder.products?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;
  const totalAmount = servicesTotal + productsTotal;

  const statusConfig = getStatusConfig(serviceOrder.status);
  const priorityConfig = getPriorityConfig(serviceOrder.priority);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton do cabeçalho */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 rounded w-20 animate-pulse" />
            <div className="h-10 bg-gray-200 rounded w-20 animate-pulse" />
          </div>
        </div>
        
        {/* Skeleton dos cards */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }
  // console.log('serviceOrder:', serviceOrder);
  
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">{serviceOrder.title}</h1>
          <p className="text-gray-600">Ordem #{String(serviceOrder.id).slice(-8).toUpperCase()}</p>
        </div>
        <div className="flex gap-2 no-print">
          {onPrint && (
            <Button variant="outline" size="sm" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          )}
          {onDownload && (
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
          {onEdit && (
            <Button size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Informações Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge 
                  variant="outline" 
                  className={`bg-${statusConfig.color}-100 text-${statusConfig.color}-800`}
                >
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Prioridade</p>
                <Badge 
                  variant="outline" 
                  className={`bg-${priorityConfig.color}-100 text-${priorityConfig.color}-800`}
                >
                  {priorityConfig.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Cliente</p>
                <p className="font-medium">
                  {serviceOrder.client?.name || serviceOrder.client_name || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="font-bold text-lg">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes da Ordem */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Ordem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Descrição</label>
                <p className="mt-1">{serviceOrder.description || "-"}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Responsável</label>
                <p className="mt-1 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  {serviceOrder.assigned_user?.name || "-"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Data de Criação</label>
                <p className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDate(serviceOrder.created_at)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Data Início Estimada</label>
                <p className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDateOnly(serviceOrder.estimated_start_date)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Data Fim Estimada</label>
                <p className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDateOnly(serviceOrder.estimated_end_date)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Última Atualização</label>
                <p className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDate(serviceOrder.updated_at)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Serviços */}
      {serviceOrder.services && serviceOrder.services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Serviços
              <Badge variant="secondary">{serviceOrder.services.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead className="text-right">Preço Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceOrder.services.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.service?.name || `Serviço ${item.service_id}`}</p>
                        {item.service?.unit && (
                          <p className="text-sm text-gray-500">Unidade: {item.service.unit}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total_price)}
                    </TableCell>
                    <TableCell>{item.notes || "-"}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Subtotal Serviços:
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(servicesTotal)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Produtos */}
      {serviceOrder.products && serviceOrder.products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produtos
              <Badge variant="secondary">{serviceOrder.products.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead className="text-right">Preço Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceOrder.products.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.product?.name || `Produto ${item.product_id}`}</p>
                        {item.product?.unit && (
                          <p className="text-sm text-gray-500">Unidade: {item.product.unit}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total_price)}
                    </TableCell>
                    <TableCell>{item.notes || "-"}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Subtotal Produtos:
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(productsTotal)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Resumo Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal Serviços:</span>
              <span className="font-medium">{formatCurrency(servicesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal Produtos:</span>
              <span className="font-medium">{formatCurrency(productsTotal)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Geral:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      {(serviceOrder.notes || serviceOrder.internal_notes) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {serviceOrder.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações Públicas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{serviceOrder.notes}</p>
              </CardContent>
            </Card>
          )}

          {serviceOrder.internal_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações Internas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{serviceOrder.internal_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}