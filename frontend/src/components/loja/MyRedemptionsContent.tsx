import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Calendar, Star, Gift, CheckCircle, Clock, XCircle, Search, Filter, Loader2 } from 'lucide-react';
import { useUserRedemptions } from '@/hooks/redemptions';
import { Redemption as RedemptionType, REDEMPTION_STATUSES } from '@/types/redemptions';
import { PointsStoreProps } from '@/types/products';

// Usando o tipo Redemption do arquivo de tipos
type Redemption = RedemptionType;

/**
 * Props do componente MyRedemptionsContent
 */
interface MyRedemptionsContentProps {
  showHeader?: boolean;
  showStats?: boolean;
  compact?: boolean;
}

/**
 * Componente de conteúdo dos resgates que pode ser usado tanto standalone quanto dentro da área do cliente
 */
const MyRedemptionsContent: React.FC<MyRedemptionsContentProps & PointsStoreProps> = ({ 
  showHeader = true, 
  showStats = true,
  compact = false,
  linkLoja 
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'points' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Buscar resgates da API (sem filtros para obter todos os dados)
  const { data: redemptionsResponse, isLoading, error } = useUserRedemptions({});

  const redemptionAny = redemptionsResponse as any;
  const allRedemptions = redemptionAny?.data || [];
  
  // Filtrar dados localmente
  const filteredRedemptions = allRedemptions.filter((redemption: Redemption) => {
    // Filtro de busca
    const matchesSearch = !searchTerm || 
      redemption.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      redemption.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro de status
    const matchesStatus = statusFilter === 'all' || redemption.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Ordenar dados localmente
  const sortedRedemptions = [...filteredRedemptions].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'date':
        aValue = new Date(a.redemptionDate).getTime();
        bValue = new Date(b.redemptionDate).getTime();
        break;
      case 'points':
        aValue = a.pointsUsed;
        bValue = b.pointsUsed;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  // Implementar paginação local
  const itemsPerPage = 10;
  const totalRedemptions = sortedRedemptions.length;
  const totalPages = Math.ceil(totalRedemptions / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const redemptions = sortedRedemptions.slice(startIndex, endIndex);

  // Simular pontos do usuário (isso deveria vir do contexto de autenticação)
  const userPoints = redemptionAny?.user?.points || 0;
  const totalPointsUsed = allRedemptions.reduce((total: number, redemption: Redemption) => total + redemption.pointsUsed, 0);

  /**
   * Obter informações do status
   */
  const getStatusInfo = (status: string) => {
    const statusConfig = REDEMPTION_STATUSES[status as keyof typeof REDEMPTION_STATUSES];
    
    if (statusConfig) {
      const iconMap = {
        delivered: CheckCircle,
        shipped: Package,
        confirmed: CheckCircle,
        processing: Clock,
        cancelled: XCircle,
        pending: Clock,
        refunded: XCircle
      };
      
      return {
        label: statusConfig.label,
        color: `text-${statusConfig.color}-600 bg-${statusConfig.color}-100`,
        icon: iconMap[status as keyof typeof iconMap] || Clock
      };
    }
    
    return {
      label: 'Desconhecido',
      color: 'text-gray-600 bg-gray-100',
      icon: Clock
    };
  };

  /**
   * Formatar data
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-green-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Carregando resgates...</h2>
          <p className="text-gray-600">Aguarde enquanto buscamos seus resgates.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro ao carregar resgates</h2>
          <p className="text-gray-600 mb-4">Ocorreu um erro ao buscar seus resgates. Tente novamente.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }
  // console.log('redemptions:', redemptions);
  return (
    <div className="space-y-6">
      {/* Header opcional */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Meus Resgates</h2>
          <div className="text-right">
            <p className="text-sm text-gray-600">Pontos disponíveis</p>
            <p className="text-lg font-bold text-green-600">{userPoints.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Estatísticas opcionais */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total de Resgates</p>
                <p className="text-3xl font-bold text-gray-900">{totalRedemptions}</p>
              </div>
              <Gift className="w-12 h-12 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pontos Utilizados</p>
                <p className="text-3xl font-bold text-gray-900">{totalPointsUsed.toLocaleString()}</p>
              </div>
              <Star className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Último Resgate</p>
                <p className="text-lg font-bold text-gray-900">
                  {allRedemptions.length > 0 ? formatDate(allRedemptions[0]?.redemptionDate || '') : 'Nenhum resgate'}
                </p>
              </div>
              <Calendar className="w-12 h-12 text-blue-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filtros e busca */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
              {/* Busca */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por produto ou código..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset para primeira página ao buscar
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              {/* Filtro de status */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                {/* <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1); // Reset para primeira página ao filtrar
                  }}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">Todos os status</option>
                  {Object.entries(REDEMPTION_STATUSES).map(([key, status]) => (
                    <option key={key} value={key}>{status.label}</option>
                  ))}
                </select> */}
              </div>
              
              {/* Ordenação */}
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'points' | 'status')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                >
                  <option value="date">Data</option>
                  <option value="points">Pontos</option>
                  {/* <option value="status">Status</option> */}
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title={`Ordenar ${sortOrder === 'asc' ? 'decrescente' : 'crescente'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
      </div>

      {/* Lista de resgates */}
      <div className="space-y-6">
        {redemptions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum resgate encontrado</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Tente ajustar os filtros de busca.'
                : 'Você ainda não fez nenhum resgate. Que tal começar agora?'
              }
            </p>
            <button
              onClick={() => navigate(linkLoja)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Ir às compras
            </button>
          </div>
        ) : (
          redemptions.map((redemption) => {
            const statusInfo = getStatusInfo(redemption.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div key={redemption.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Imagem do produto */}
                    <div className="flex-shrink-0">
                      <img
                        src={redemption.productImage2 || redemption.productImage || '/placeholder.svg'}
                        alt={redemption.productName || 'Produto'}
                        className="w-24 h-24 object-cover rounded-xl"
                      />
                    </div>
                    
                    {/* Informações do produto */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{redemption.productName || 'Produto não encontrado'}</h3>
                          <p className="text-sm text-gray-600">Categoria: {redemption.category}</p>
                        </div>
                        {/* <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${statusInfo.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            <span>{statusInfo.label}</span>
                          </span>
                        </div> */}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 font-medium">Código do Resgate</p>
                          <p className="text-gray-900 font-mono">{redemption.id}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">Data do Resgate</p>
                          <p className="text-gray-900">{formatDate(redemption.redemptionDate)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">Pontos Utilizados</p>
                          <p className="text-gray-900 font-semibold">{redemption.pointsUsed.toLocaleString()}</p>
                        </div>
                        {redemption.trackingCode && (
                          <div>
                            <p className="text-gray-600 font-medium">Código de Rastreamento</p>
                            <p className="text-gray-900 font-mono">{redemption.trackingCode}</p>
                          </div>
                        )}
                      </div>
                      
                      {redemption.estimated_delivery && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800">
                            <strong>Previsão de entrega:</strong> {formatDate(redemption.estimated_delivery)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Ações */}
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => navigate(`${linkLoja}/resgate/${redemption.id}`)}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Ver detalhes
                    </button>
                    <button
                      onClick={() => navigate(`${linkLoja}/produto/${redemption.productId}`)}
                      className="flex-1 border border-green-600 text-green-600 py-2 px-4 rounded-lg hover:bg-green-50 transition-colors font-medium"
                    >
                      Ver produto
                    </button>
                    {redemption.trackingCode && (
                      <button className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                        Rastrear pedido
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Anterior
          </button>
          
          <span className="text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
};

export default MyRedemptionsContent;