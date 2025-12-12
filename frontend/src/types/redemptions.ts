/**
 * Tipos relacionados a resgates de pontos e extratos
 */

// Status possíveis para um resgate
export type RedemptionStatus = 
  | 'pending'      // Aguardando processamento
  | 'processing'   // Em processamento
  | 'confirmed'    // Confirmado
  | 'shipped'      // Enviado
  | 'delivered'    // Entregue
  | 'cancelled'    // Cancelado
  | 'refunded';    // Reembolsado

// Interface para endereço de entrega
export interface ShippingAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  complement?: string;
}

// Interface para histórico de status
export interface StatusHistory {
  id: string;
  status: RedemptionStatus;
  comment: string;
  createdAt: string;
  createdBy: string;
  redeemId: string;
  createdByName: string;
}

// Interface para resgate de produto
export interface Redemption {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  productId: string;
  productName: string;
  productImage: string;
  productCategory: string;
  pointsUsed: number;
  redemptionDate: string;
  status: RedemptionStatus;
  shippingAddress?: ShippingAddress;
  trackingCode?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  priority: 'low' | 'medium' | 'high';
  statusHistory: StatusHistory[];
}

// Tipos de transação de pontos
export type PointsTransactionType = 
  // | 'earned'       // Pontos ganhos
  // | 'redeemed'     // Pontos resgatados
  // | 'expired'      // Pontos expirados
  // | 'bonus'        // Bônus
  // | 'refund'       // Reembolso
  // | 'adjustment'   // Ajuste manual
  | 'credito'      // Crédito (da API)
  | 'debito'       // Débito (da API)
  // | 'ajuste'       // Ajuste (da API)
  // | 'reembolso'    // Reembolso (da API)
  // | 'expiracao';   // Expiração (da API)

// Interface para extrato de pontos
export interface PointsExtract {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: PointsTransactionType;
  points: number;
  description: string;
  reference?: string;  // ID de referência (ex: ID do resgate)
  balanceBefore: number;
  balanceAfter: number;
  expirationDate?: string;
  createdAt: string;
  createdBy?: string;  // ID do usuário que criou (para ajustes manuais)
  // Campos adicionais da API
  client_id?: string;
  valor?: string;
  data?: string;
  tipo?: string;
  origem?: string;
  valor_referencia?: string;
  data_expiracao?: string;
  status?: string;
  usuario_id?: string;
  pedido_id?: string;
  config?: any;
  ativo?: string;
  updated_at?: string;
  deleted_at?: string;
  cliente?: any;
  usuario?: any;
}

// Interface para filtros de resgates
export interface RedemptionFilters {
  status?: RedemptionStatus;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  search?: string;
}

// Interface para filtros de extratos
export interface PointsExtractFilters {
  type?: PointsTransactionType;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  search?: string;
}

// Interface para estatísticas de resgates
export interface RedemptionStats {
  total: number;
  pending: number;
  processing: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  totalPointsUsed: number;
}

// Interface para estatísticas de pontos
export interface PointsStats {
  totalEarned: number;
  totalRedeemed: number;
  totalExpired: number;
  activeUsers: number;
  averageBalance: number;
}

// Constantes para status
export const REDEMPTION_STATUSES = {
  pending: { label: 'Pendente', color: 'yellow' },
  processing: { label: 'Processando', color: 'blue' },
  confirmed: { label: 'Confirmado', color: 'green' },
  shipped: { label: 'Enviado', color: 'purple' },
  delivered: { label: 'Entregue', color: 'green' },
  cancelled: { label: 'Cancelado', color: 'red' },
  refunded: { label: 'Reembolsado', color: 'orange' }
} as const;

// Mapeamento de tipos de transação para exibição
export const POINTS_TRANSACTION_TYPES = {
  // earned: { label: 'Ganhos', color: 'green' },
  // redeemed: { label: 'Resgatados', color: 'blue' },
  // expired: { label: 'Expirados', color: 'red' },
  // bonus: { label: 'Bônus', color: 'purple' },
  // refund: { label: 'Reembolso', color: 'orange' },
  // adjustment: { label: 'Ajuste', color: 'gray' },
  // Tipos da API
  credito: { label: 'Crédito', color: 'green' },
  debito: { label: 'Débito', color: 'blue' },
  // ajuste: { label: 'Ajuste', color: 'gray' },
  // reembolso: { label: 'Reembolso', color: 'orange' },
  // expiracao: { label: 'Expiração', color: 'red' }
} as const;

// Mapeamento de tipos de transação para lista da tabela
export const POINTS_TRANSACTION_TYPES_LIST = {
  earned: { label: 'Ganhos', color: 'green' },
  redeemed: { label: 'Resgatados', color: 'blue' },
  
} as const;