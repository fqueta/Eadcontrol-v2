/**
 * Stock — tipos do controle de estoque (auxílio logístico).
 * pt-BR: Contratos de dados do livro de estoque e lançamentos.
 * en-US: Data contracts for the stock ledger and entries.
 */

export type StockEntryType = 'inicial' | 'entrada' | 'saida' | 'ajuste';
export type StockMovementType = 'entrada' | 'saida';

/** Item do resumo de estoque por produto */
export interface StockSummaryItem {
  product_id: number;
  id: number;
  name: string;
  sale_price: number;
  unit: string | null;
  track_stock: boolean;
  stock_min: number;
  balance: number;
  average_cost: number;
  total_cost: number;
  low: boolean;
}

/** Linha de movimentação */
export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string | null;
  type: StockMovementType;
  quantity: number;
  unit_cost: number | null;
  unit_price: number | null;
  total_cost: number | null;
  entry_id?: number | null;
  entry_type?: StockEntryType | null;
  entry_document?: string | null;
  entry_status?: string | null;
  service_order_id?: number | null;
  appointment_id?: number | null;
  reason?: string | null;
  created_at?: string | null;
}

/** Item de lançamento (linha da nota interna) */
export interface StockEntryItemPayload {
  product_id: number;
  quantity: number;
  line_type?: StockMovementType;
  unit_cost?: number;
  unit_price?: number;
  reason?: string;
}

/** Lançamento (cabeçalho) criado pela API */
export interface StockEntry {
  id: number;
  type: StockEntryType;
  typeLabel: string;
  supplier_name: string | null;
  document_number: string | null;
  document_type: string | null;
  movement_date: string | null;
  total_amount: number;
  status: 'processada' | 'cancelada';
  notes: string | null;
  created_by_name?: string | null;
  created_at?: string | null;
  items?: Array<{
    movement_id: number;
    product_id: number;
    product_name: string | null;
    line_type: StockMovementType;
    quantity: number;
    unit_cost: number | null;
    unit_price: number | null;
    reason?: string | null;
  }>;
}

/** Payload para criar um lançamento */
export interface StockEntryPayload {
  type: StockEntryType;
  movement_date: string;
  supplier_name?: string | null;
  document_number?: string | null;
  document_type?: string | null;
  notes?: string | null;
  items: StockEntryItemPayload[];
}
