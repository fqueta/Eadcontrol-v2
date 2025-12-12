/**
 * Installments Types
 * pt-BR: Tipos para tabelas de parcelamentos, com payloads compatíveis com a API.
 * en-US: Types for installment tables, with payloads compatible with the API.
 */

/**
 * InstallmentParcel
 * pt-BR: Linha de parcela com configuração de entrada, juros e valor.
 * en-US: Parcel line with entry type, interest, and value.
 */
export interface InstallmentParcel {
  index: number; // usado para gerar chaves como parcelas[index][...]
  parcela: string; // ex: "6"
  tipo_entrada: '%' | 'R$' | string;
  entrada?: string; // ex: "10,00" ou vazio
  juros?: string;  // ex: "1,99" ou vazio
  valor?: string;  // ex: "R$+3.970,00"
  /**
   * desconto
   * pt-BR: Valor de desconto aplicado à opção de parcela (moeda ou percentual conforme backend).
   * en-US: Discount value applied to the installment option (currency or percent per backend).
   */
  desconto?: string;
}

/**
 * InstallmentTx2Config
 * pt-BR: Configuração de texto/valor (tx2) para exibição em propostas.
 * en-US: Text/value configuration (tx2) for proposal display.
 */
export interface InstallmentTx2Config {
  name_label: string;
  name_valor: string;
}

/**
 * InstallmentPayload
 * pt-BR: Payload estruturado para criação/atualização. Será convertido para urlencoded com chaves específicas.
 * en-US: Structured payload for create/update. Will be converted to urlencoded with specific keys.
 */
export interface InstallmentPayload {
  id?: string;
  id_curso: string; // id do curso
  nome: string;
  previsao_turma_ids: string[]; // será enviado como previsao_turma[]
  valor: string; // currency string ex: "600,00"
  ativo: 's' | 'n' | 'y';
  obs?: string;
  tipo_curso: string; // ex: "4"
  parcelas: InstallmentParcel[];
  config_tx2?: InstallmentTx2Config[];
  atualizado?: string; // datetime string (se aplicável em updates)
}

/**
 * InstallmentRecord
 * pt-BR: Registro retornado pela API para listagem/detalhe. Mantemos campos principais.
 * en-US: Record returned by the API for listing/detail. Keep main fields.
 */
export interface InstallmentRecord {
  id: string;
  id_curso: string;
  nome: string;
  valor?: string;
  ativo?: 's' | 'n' | 'y';
  obs?: string;
  tipo_curso?: string;
  updated_at?: string;
}