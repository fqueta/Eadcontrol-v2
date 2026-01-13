export interface TotalFiltrados {
  total_bot_conversations: number;
  total_closed_deals: number;
  total_human_conversations: number;
  total_proposals: number;
  total_visitors: number;
}
export interface MetricRecord {
  id: string;
  user_id: string;
  period: string; // ou Date se preferir tratar como objeto
  investment: number;
  visitors: number;
  bot_conversations: number;
  human_conversations: number;
  proposals: number;
  closed_deals: number;
  created_at: string;
  updated_at: string;
  agregados?:[];
}
export interface MetricList {
  registros: MetricRecord[];
  agregados?:[];
  totais_filtrados?: TotalFiltrados;
}
export interface CreateMetricInput {
  // id: string;
  // user_id: string;
  period: string; // ou Date se preferir tratar como objeto
  investment: number;
  visitors: number;
  bot_conversations: number;
  human_conversations: number;
  proposals: number;
  closed_deals: number;
  // created_at: string;
  // updated_at: string;
}

export interface UpdateMetricInput {
  period: string; // ou Date se preferir tratar como objeto
  investment: number;
  visitors: number;
  bot_conversations: number;
  human_conversations: number;
  proposals: number;
  closed_deals: number;
  
}

export interface MetricsListParams {
  year?: number;
  month?: number;
  week?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface Paginated<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  // Support for non-paginated responses
  items?: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}