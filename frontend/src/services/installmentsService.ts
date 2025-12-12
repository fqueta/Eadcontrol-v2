import { BaseApiService } from './BaseApiService';
import { PaginatedResponse } from '@/types/index';
import { InstallmentPayload, InstallmentRecord } from '@/types/installments';
import { currencyApplyMask } from '@/lib/masks/currency';

/**
 * InstallmentsService — serviço para tabelas de parcelamentos
 * pt-BR: Implementa POST urlencoded e operações básicas no endpoint '/parcelamentos'.
 * en-US: Implements urlencoded POST and basic operations on '/parcelamentos'.
 */
class InstallmentsService extends BaseApiService {
  private readonly endpoint = '/parcelamentos';

  /**
   * list
   * pt-BR: Lista registros com paginação e filtros.
   * en-US: Lists records with pagination and filters.
   */
  async list(params?: Record<string, any>): Promise<PaginatedResponse<InstallmentRecord>> {
    const response = await this.get<any>(this.endpoint, params);
    return this.normalizePaginatedResponse<InstallmentRecord>(response);
  }

  /**
   * getById
   * pt-BR: Busca um parcelamento pelo ID.
   * en-US: Fetches an installment by ID.
   */
  async getById(id: string | number): Promise<InstallmentRecord> {
    const response = await this.get<any>(`${this.endpoint}/${id}`);
    const normalized = (response && typeof response === 'object' && 'data' in response)
      ? (response.data as InstallmentRecord)
      : (response as InstallmentRecord);
    return normalized;
  }

  /**
   * createFormUrlEncoded
   * pt-BR: Cria um registro enviando como application/x-www-form-urlencoded para suportar campos com colchetes.
   * en-US: Creates a record sending as application/x-www-form-urlencoded to support bracketed field names.
   */
  async createFormUrlEncoded(data: URLSearchParams): Promise<InstallmentRecord> {
    const response = await fetch(`${this.API_BASE_URL}${this.endpoint}`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
    });
    const json = await this.handleResponse<any>(response);
    return (json?.data ?? json) as InstallmentRecord;
  }

  /**
   * updateFormUrlEncoded
   * pt-BR: Atualiza um registro usando urlencoded.
   * en-US: Updates a record using urlencoded.
   */
  async updateFormUrlEncoded(id: string | number, data: URLSearchParams): Promise<InstallmentRecord> {
    const response = await fetch(`${this.API_BASE_URL}${this.endpoint}/${id}`, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
    });
    const json = await this.handleResponse<any>(response);
    return (json?.data ?? json) as InstallmentRecord;
  }

  /**
   * delete
   * pt-BR: Remove um registro por ID.
   * en-US: Deletes a record by ID.
   */
  async delete(id: string | number): Promise<void> {
    await this.delete<void>(`${this.endpoint}/${id}`);
  }
}

/**
 * installmentsService
 * pt-BR: Instância exportada do serviço de parcelamentos.
 * en-US: Exported instance of the installments service.
 */
export const installmentsService = new InstallmentsService();

/**
 * buildInstallmentUrlencoded
 * pt-BR: Constrói URLSearchParams com os nomes de campos exatamente como a API espera.
 * en-US: Builds URLSearchParams with field names exactly as the API expects.
 */
export function buildInstallmentUrlencoded(payload: InstallmentPayload): URLSearchParams {
  const params = new URLSearchParams();

  // Campos principais
  if (payload.id) params.append('id', String(payload.id));
  params.append('id_curso', String(payload.id_curso));
  params.append('nome', payload.nome);
  // Valor raiz com máscara numérica (ex.: "600,00") sem o prefixo da moeda
  const maskedRootValor = currencyApplyMask(payload.valor, 'pt-BR', 'BRL').replace(/^R\$\s?/, '');
  params.append('valor', maskedRootValor);
  params.append('ativo', String(payload.ativo));
  params.append('tipo_curso', String(payload.tipo_curso));
  if (payload.obs !== undefined) params.append('obs', payload.obs || '');
  if (payload.atualizado) params.append('atualizado', payload.atualizado);

  // Config raiz: alguns backends esperam valores também em config[...]
  // pt-BR: Replicamos valor e tipo_curso em config para compatibilidade.
  //        Enviamos `config[valor]` como moeda BRL mascarada para uso direto em exibição.
  // en-US: Duplicate valor and tipo_curso under config for compatibility.
  //        Send `config[valor]` as masked BRL currency for direct display usage.
  const maskedConfigValor = currencyApplyMask(payload.valor, 'pt-BR', 'BRL');
  params.append('config[valor]', maskedConfigValor);
  params.append('config[tipo_curso]', String(payload.tipo_curso));

  // previsao_turma[]
  (payload.previsao_turma_ids || []).forEach((tid) => {
    // raiz
    params.append('previsao_turma[]', String(tid));
    // em config, conforme payload desejado
    params.append('config[previsao_turma][]', String(tid));
  });

  // parcelas[index][...]
  (payload.parcelas || []).forEach((p) => {
    const i = p.index;
    // raiz
    params.append(`parcelas[${i}][parcela]`, String(p.parcela ?? ''));
    params.append(`parcelas[${i}][tipo_entrada]`, String(p.tipo_entrada ?? ''));
    params.append(`parcelas[${i}][entrada]`, String(p.entrada ?? ''));
    params.append(`parcelas[${i}][juros]`, String(p.juros ?? ''));
    params.append(`parcelas[${i}][valor]`, String(p.valor ?? ''));
    params.append(`parcelas[${i}][desconto]`, String(p.desconto ?? ''));

    // espelho em config.parcelas[index] com valor mascarado BRL
    const maskedParcelaValor = p.valor ? currencyApplyMask(String(p.valor), 'pt-BR', 'BRL') : '';
    params.append(`config[parcelas][${i}][parcela]`, String(p.parcela ?? ''));
    params.append(`config[parcelas][${i}][tipo_entrada]`, String(p.tipo_entrada ?? ''));
    params.append(`config[parcelas][${i}][entrada]`, String(p.entrada ?? ''));
    params.append(`config[parcelas][${i}][juros]`, String(p.juros ?? ''));
    params.append(`config[parcelas][${i}][valor]`, String(maskedParcelaValor));
    params.append(`config[parcelas][${i}][desconto]`, String(p.desconto ?? ''));
  });

  // config[tx2][idx][...]
  (payload.config_tx2 || []).forEach((c, idx) => {
    params.append(`config[tx2][${idx}][name_label]`, String(c.name_label ?? ''));
    params.append(`config[tx2][${idx}][name_valor]`, String(c.name_valor ?? ''));
  });

  return params;
}