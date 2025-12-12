import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Calendar, MapPin, Truck, FileText, Star, User, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useRedemption } from '@/hooks/redemptions';
import { Redemption } from '@/types/redemptions';
import { formatDate } from '@/lib/utils';
import { PointsStoreProps } from '@/types/products';
import { zerofill } from '@/lib/qlib';
/**
 * Página de detalhes do resgate na área do cliente
 * Exibe informações completas sobre um resgate específico
 */
const RedemptionDetails: React.FC<PointsStoreProps> = ({ linkLoja }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Buscar dados do resgate
  const { data: redemption, isLoading, error } = useRedemption(id!) as {
    data: Redemption | undefined;
    isLoading: boolean;
    error: any;
  };

  /**
   * Retorna a cor do badge baseada no status do resgate
   */
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
      case 'processando':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
      case 'enviado':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
      case 'entregue':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Formata o status para exibição
   */
  const formatStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendente',
      'processing': 'Processando',
      'shipped': 'Enviado',
      'delivered': 'Entregue',
      'cancelled': 'Cancelado'
    };
    return statusMap[status.toLowerCase()] || status;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error || !redemption) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-purple-800 mb-4">Resgate não encontrado</h2>
          <p className="text-purple-600 mb-6">O resgate solicitado não foi encontrado ou você não tem permissão para visualizá-lo.</p>
          <Button 
            onClick={() => navigate(linkLoja + '/meus-resgates')}
            className="bg-gradient-to-r from-teal-500 to-green-500 text-white hover:from-teal-600 hover:to-green-600 transition-all transform hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos meus resgates
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-teal-600 shadow-lg border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                 variant="ghost"
                 onClick={() => navigate(linkLoja + '/meus-resgates')}
                 className="mr-4 text-white hover:text-yellow-300 hover:bg-white/20 transition-all transform hover:scale-105"
               >
                 <ArrowLeft className="w-4 h-4 mr-2" />
                 Voltar
               </Button>
               <h1 className="text-xl font-semibold text-white">
                 Detalhes do Resgate #R{zerofill(redemption.id,3)}
               </h1>
            </div>
            {/* <Badge className={getStatusColor(redemption.status)}>
              {formatStatus(redemption.status)}
            </Badge> */}
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna principal - Informações do produto e resgate */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações do produto */}
            <Card className="bg-white rounded-2xl shadow-xl border-2 border-purple-100">
              <CardHeader className="bg-gradient-to-r from-teal-50 to-green-50 border-b-2 border-purple-100 rounded-t-2xl">
                <CardTitle className="flex items-center text-purple-800">
                  <Package className="w-5 h-5 mr-2 text-teal-600" />
                  Produto Resgatado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-6">
                  {redemption.productImage && (
                    <div className="flex-shrink-0">
                      <img
                        src={redemption.productImage2 || redemption.productImage}
                        alt={redemption.productName}
                        className="w-32 h-32 object-cover rounded-lg border-2 border-purple-200 shadow-md"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-purple-800 mb-2">
                      {redemption.productName}
                    </h3>
                    {redemption.productCategory && (
                      <Badge variant="outline" className="mb-3 border-2 border-teal-300 text-teal-700 bg-teal-50">
                        {redemption.productCategory}
                      </Badge>
                    )}
                    <div className="flex items-center text-lg font-medium text-teal-600">
                      <Star className="w-5 h-5 mr-1 fill-current text-yellow-500" />
                      {redemption.pointsUsed} pontos
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações de entrega */}
            {redemption.shippingAddress && (
              <Card className="bg-white rounded-2xl shadow-xl border-2 border-purple-100">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-100 rounded-t-2xl">
                  <CardTitle className="flex items-center text-purple-800">
                    <MapPin className="w-5 h-5 mr-2 text-teal-600" />
                    Endereço de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-purple-700">
                    <p>{redemption.shippingAddress.street}, {redemption.shippingAddress.number}</p>
                    {redemption.shippingAddress.complement && (
                      <p>{redemption.shippingAddress.complement}</p>
                    )}
                    <p>{redemption.shippingAddress.neighborhood}</p>
                    <p>{redemption.shippingAddress.city} - {redemption.shippingAddress.state}</p>
                    <p>CEP: {redemption.shippingAddress.zipCode}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rastreamento */}
            {redemption.trackingCode && (
              <Card className="bg-white rounded-2xl shadow-xl border-2 border-purple-100">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b-2 border-purple-100 rounded-t-2xl">
                  <CardTitle className="flex items-center text-purple-800">
                    <Truck className="w-5 h-5 mr-2 text-teal-600" />
                    Rastreamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-purple-600">Código de Rastreamento</label>
                      <p className="text-lg font-mono bg-gradient-to-r from-teal-50 to-green-50 p-2 rounded border-2 border-teal-200 text-purple-800">
                        {redemption.trackingCode}
                      </p>
                    </div>
                    {redemption.estimatedDelivery && (
                      <div>
                        <label className="text-sm font-medium text-purple-600">Previsão de Entrega</label>
                        <p className="text-purple-800">
                          {formatDate(redemption.estimatedDelivery)}
                        </p>
                      </div>
                    )}
                    {redemption.actualDelivery && (
                      <div>
                        <label className="text-sm font-medium text-purple-600">Data de Entrega</label>
                        <p className="text-purple-800">
                          {formatDate(redemption.actualDelivery)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notas */}
            {(redemption.notes || redemption.adminNotes) && (
              <Card className="bg-white rounded-2xl shadow-xl border-2 border-purple-100">
                <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50 border-b-2 border-purple-100 rounded-t-2xl">
                  <CardTitle className="flex items-center text-purple-800">
                    <FileText className="w-5 h-5 mr-2 text-teal-600" />
                    Observações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {redemption.notes && (
                    <div>
                      <label className="text-sm font-medium text-purple-600">Suas observações</label>
                      <p className="text-purple-700 bg-gradient-to-r from-teal-50 to-green-50 p-3 rounded border-2 border-teal-200">
                        {redemption.notes}
                      </p>
                    </div>
                  )}
                  {redemption.adminNotes && (
                    <div>
                      <label className="text-sm font-medium text-purple-600">Observações da administração</label>
                      <p className="text-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded border-2 border-purple-200">
                        {redemption.adminNotes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Informações resumidas e histórico */}
          <div className="space-y-6">
            {/* Resumo do resgate */}
            <Card className="bg-white rounded-2xl shadow-xl border-2 border-purple-100">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b-2 border-purple-100 rounded-t-2xl">
                <CardTitle className="text-purple-800">Resumo do Resgate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-purple-600">Data do Resgate</label>
                  <p className="text-purple-800">
                    {formatDate(redemption.redemptionDate || redemption.createdAt)}
                  </p>
                </div>
                <Separator className="bg-purple-200" />
                <div>
                  <label className="text-sm font-medium text-purple-600">Pontos Utilizados</label>
                  <p className="text-lg font-semibold text-teal-600">
                    {redemption.pointsUsed} pontos
                  </p>
                </div>
                <Separator className="bg-purple-200" />
              </CardContent>
            </Card>

            {/* Informações do usuário */}
            <Card className="bg-white rounded-2xl shadow-xl border-2 border-purple-100">
              <CardHeader className="bg-gradient-to-r from-teal-50 to-green-50 border-b-2 border-purple-100 rounded-t-2xl">
                <CardTitle className="flex items-center text-purple-800">
                  <User className="w-5 h-5 mr-2 text-teal-600" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2 text-teal-500" />
                  <span className="text-purple-800">{redemption.userName}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-teal-500" />
                  <span className="text-purple-800">{redemption.userEmail}</span>
                </div>
                {redemption.userPhone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-teal-500" />
                    <span className="text-purple-800">{redemption.userPhone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Histórico de status */}
            {redemption.statusHistory && redemption.statusHistory.length > 0 && (
              <Card className="bg-white rounded-2xl shadow-xl border-2 border-purple-100">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-100 rounded-t-2xl">
                  <CardTitle className="flex items-center text-purple-800">
                    <Calendar className="w-5 h-5 mr-2 text-teal-600" />
                    Histórico de Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {redemption.statusHistory.map((history, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-teal-600 rounded-full mt-2"></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <Badge className={getStatusColor(history.status)} variant="outline">
                              {formatStatus(history.status)}
                            </Badge>
                            <span className="text-xs text-purple-600">
                              {formatDate(history.changedAt)}
                            </span>
                          </div>
                          {history.notes && (
                            <p className="text-sm text-purple-600 mt-1">
                              {history.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ações */}
            <div className="space-y-3">
              {/* <Button
                onClick={() => navigate(linkLoja + `/produto/${redemption.productId}`)}
                variant="outline"
                className="w-full"
              >
                Ver Produto na Loja
              </Button> */}
              {redemption.trackingCode && (
                <Button
                  onClick={() => {
                    // Aqui você pode implementar a integração com serviços de rastreamento
                    window.open(`https://www.correios.com.br/rastreamento?codigo=${redemption.trackingCode}`, '_blank');
                  }}
                  className="w-full bg-gradient-to-r from-teal-500 to-green-500 text-white hover:from-teal-600 hover:to-green-600 transition-all transform hover:scale-105 shadow-lg"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Rastrear Pedido
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedemptionDetails;