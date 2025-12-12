import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Calendar, Star, Gift, CheckCircle, Clock, XCircle, Search, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserRedemptions } from '@/hooks/redemptions';
import { Redemption as RedemptionType, REDEMPTION_STATUSES } from '@/types/redemptions';
import { PointsStoreProps } from '@/types/pointsStore';

// Tipo local baseado na API
type Redemption = RedemptionType;

/**
 * Props do componente RedemptionHistory
 */
interface RedemptionHistoryProps {
  showHeader?: boolean;
  compact?: boolean;
}

/**
 * Componente para exibir histórico de resgates
 */
const RedemptionHistory: React.FC<RedemptionHistoryProps & PointsStoreProps> = ({ 
  showHeader = true, 
  compact = false,
  linkLoja 
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: redemptionsResponse, isLoading, error } = useUserRedemptions({
    page: currentPage,
    limit: 10,
    search: searchTerm,
    status: statusFilter !== 'all' ? statusFilter : undefined
  });

  const allRedemptions = redemptionsResponse?.data || [];

  /**
   * Filtrar resgates baseado na busca e status
   */
  const filteredRedemptions = allRedemptions.filter((redemption: Redemption) => {
    const matchesSearch = !searchTerm || 
      redemption.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      redemption.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || redemption.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  /**
   * Obter informações de status
   */
  const getStatusInfo = (status: string) => {
    const statusConfig = REDEMPTION_STATUSES[status as keyof typeof REDEMPTION_STATUSES];
    
    if (statusConfig) {
      const iconMap = {
        pending: Clock,
        processing: Package,
        confirmed: CheckCircle,
        shipped: Gift,
        delivered: CheckCircle,
        cancelled: XCircle,
        refunded: Star
      };
      
      return {
        label: statusConfig.label,
        color: statusConfig.color,
        icon: iconMap[status as keyof typeof iconMap] || Package
      };
    }
    
    return {
      label: status,
      color: 'gray',
      icon: Package
    };
  };

  /**
   * Formatar data
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Carregando resgates...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <XCircle className="w-8 h-8 text-red-600" />
        <span className="ml-2 text-red-600">Erro ao carregar resgates</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="w-5 h-5" />
              <span>Histórico de Resgates</span>
            </CardTitle>
            <CardDescription>
              Acompanhe todos os seus resgates de pontos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por produto ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(REDEMPTION_STATUSES).map(([key, status]) => (
                    <SelectItem key={key} value={key}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {filteredRedemptions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Nenhum resgate encontrado com os filtros aplicados'
                  : 'Você ainda não fez nenhum resgate'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRedemptions.map((redemption) => {
            const statusInfo = getStatusInfo(redemption.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <Card 
                key={redemption.id} 
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`${linkLoja}/resgate/${redemption.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                    {/* Imagem do Produto */}
                    <div className="flex-shrink-0">
                      <img
                        src={redemption.productImage || '/placeholder.svg'}
                        alt={redemption.productName || 'Produto'}
                        className={`${compact ? 'w-16 h-16' : 'w-20 h-20'} object-cover rounded-lg`}
                      />
                    </div>
                    
                    {/* Informações do Produto */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <h4 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
                            {redemption.productName || 'Produto não encontrado'}
                          </h4>
                          <p className="text-sm text-gray-600">Código: {redemption.id}</p>
                        </div>
                        
                        <Badge 
                          variant="outline" 
                          className={`flex items-center space-x-1 bg-${statusInfo.color}-50 text-${statusInfo.color}-700 border-${statusInfo.color}-200`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusInfo.label}</span>
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Pontos Utilizados</p>
                          <p className="font-medium text-blue-600">
                            {redemption.pointsUsed.toLocaleString()} pts
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-500">Data do Resgate</p>
                          <p className="font-medium">{formatDate(redemption.redemptionDate)}</p>
                        </div>
                        
                        <div>
                          <p className="text-gray-500">Categoria</p>
                          <p className="font-medium">{redemption.productCategory}</p>
                        </div>
                        
                        {redemption.trackingCode && (
                          <div>
                            <p className="text-gray-500">Código de Rastreio</p>
                            <p className="font-medium text-blue-600">{redemption.trackingCode}</p>
                          </div>
                        )}
                      </div>
                      
                      {redemption.estimatedDelivery && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Previsão de entrega: {formatDate(redemption.estimatedDelivery)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Resumo */}
      {!compact && filteredRedemptions.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {filteredRedemptions.reduce((total, r) => total + r.pointsUsed, 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Pontos Utilizados</p>
              </div>
              
              <div>
                <p className="text-2xl font-bold text-blue-600">{filteredRedemptions.length}</p>
                <p className="text-sm text-gray-600">Total de Resgates</p>
              </div>
              
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {filteredRedemptions.filter(r => r.status === 'delivered').length}
                </p>
                <p className="text-sm text-gray-600">Resgates Entregues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RedemptionHistory;