import { BaseApiService } from './BaseApiService';
import type { PaginatedResponse } from '@/types';

/**
 * Tipos para FileStorage
 * pt-BR: Representações de itens e parâmetros de listagem.
 * en-US: Representations of items and listing parameters.
 */
export interface FileStorageItem {
  id: number;
  title?: string;
  name?: string;
  description?: string;
  active?: boolean;
  mime?: string;
  url?: string;
  created_at?: string;
  updated_at?: string;
  /**
   * pt-BR: Metadados do arquivo retornados em `config.file`.
   * en-US: File metadata returned in `config.file`.
   */
  file?: {
    path: string;
    url: string;
    original: string;
    mime: string;
    size: number;
    ext?: string;
  };
}

export interface FileStorageListParams {
  page?: number;
  per_page?: number;
  order_by?: string;
  order?: 'asc' | 'desc';
  q?: string; // or search
  search?: string;
  title?: string;
  mime?: string;
  ext?: string;
  active?: boolean;
}

/**
 * FileStorageService
 * pt-BR: Serviço para uploads de arquivo conforme documentação (`POST /file-storage`).
 * en-US: Service for file uploads per documentation (`POST /file-storage`).
 */
class FileStorageService extends BaseApiService {
  /**
   * endpoint
   * pt-BR: Endpoint de armazenamento de arquivos.
   * en-US: File storage endpoint.
   */
  private readonly endpoint = '/file-storage';

  /**
   * upload
   * pt-BR: Envia um arquivo via `FormData` para o endpoint `/file-storage`.
   *        O campo do arquivo é `file`. Parâmetros extras são opcionais.
   * en-US: Sends a file via `FormData` to `/file-storage`.
   *        The file field name is `file`. Extra parameters are optional.
   */
  async upload<R = any>(file: File, extra?: Record<string, any>): Promise<R> {
    const form = new FormData();
    form.append('file', file);
    if (extra) {
      /**
       * pt-BR: Anexa apenas campos válidos; evita enviar "undefined" e normaliza booleanos.
       * en-US: Append only valid fields; avoid sending "undefined" and normalize booleans.
       */
      Object.entries(extra).forEach(([k, v]) => {
        if (v === undefined || v === null) return; // não enviar valores indefinidos/nulos
        if (typeof v === 'boolean') {
          // Laravel boolean rule é mais consistente com '1'/'0'
          form.append(k, v ? '1' : '0');
        } else {
          form.append(k, String(v));
        }
      });
    }
    return this.postFormData<R>(this.endpoint, form);
  }

  /**
   * list
   * pt-BR: Lista arquivos com filtros e paginação conforme documentação.
   * en-US: Lists files with filters and pagination as documented.
   */
  async list(params?: FileStorageListParams): Promise<PaginatedResponse<FileStorageItem>> {
    const response = await this.get<any>(this.endpoint, params);
    return this.normalizePaginatedResponse<FileStorageItem>(response);
  }

  /**
   * getById
   * pt-BR: Obtém um arquivo por ID.
   * en-US: Gets a file by ID.
   */
  async getById(id: number | string): Promise<FileStorageItem> {
    return this.get<FileStorageItem>(`${this.endpoint}/${id}`);
  }

  /**
   * update
   * pt-BR: Atualiza metadados e opcionalmente substitui o arquivo (usa FormData se houver arquivo).
   * en-US: Updates metadata and optionally replaces the file (uses FormData if file is provided).
   */
  async update<R = any>(id: number | string, data: { title?: string; name?: string; description?: string; active?: boolean; file?: File }): Promise<R> {
    if (data?.file) {
      const form = new FormData();
      if (data.title) form.append('title', data.title);
      if (data.name) form.append('name', data.name);
      if (data.description) form.append('description', data.description);
      // pt-BR: Normaliza booleano para 'true'/'false' evitando o erro de validação.
      // en-US: Normalize boolean to 'true'/'false' to avoid validation error.
      if (typeof data.active !== 'undefined') form.append('active', data.active ? '1' : '0');
      form.append('file', data.file);
      return this.putFormData<R>(`${this.endpoint}/${id}`, form);
    }
    const { file, ...payload } = data || {};
    return this.put<R>(`${this.endpoint}/${id}`, payload);
  }

  /**
   * deleteById
   * pt-BR: Remove (soft-delete) um arquivo por ID.
   * en-US: Soft-deletes a file by ID.
   */
  async deleteById<R = any>(id: number | string): Promise<R> {
    return this.delete<R>(`${this.endpoint}/${id}`);
  }

  /**
   * restore
   * pt-BR: Restaura um item da lixeira.
   * en-US: Restores an item from trash.
   */
  async restore<R = any>(id: number | string): Promise<R> {
    return this.put<R>(`${this.endpoint}/${id}/restore`);
  }

  /**
   * forceDelete
   * pt-BR: Exclui permanentemente um item.
   * en-US: Permanently deletes an item.
   */
  async forceDelete<R = any>(id: number | string): Promise<R> {
    return this.delete<R>(`${this.endpoint}/${id}/force`);
  }

  /**
   * downloadUrl
   * pt-BR: Retorna a URL de download com nome original do arquivo.
   * en-US: Returns the download URL with original filename.
   */
  downloadUrl(id: number | string): string {
    return `${this.API_BASE_URL}${this.endpoint}/${id}/download`;
  }

  /**
   * downloadBlob
   * pt-BR: Faz download autenticado do arquivo como Blob e retorna metadados.
   *        Usa headers com Authorization (token) pois o endpoint requer autenticação.
   * en-US: Performs authenticated file download as Blob and returns metadata.
   *        Uses Authorization headers since the endpoint requires authentication.
   */
  async downloadBlob(id: number | string): Promise<{ blob: Blob; filename: string; contentType: string }> {
    const response = await fetch(`${this.API_BASE_URL}${this.endpoint}/${id}/download`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      // Tenta extrair mensagem textual, evitando parse JSON em conteúdo binário
      const message = `Falha no download (${response.status})`;
      throw new Error(message);
    }

    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const disposition = response.headers.get('Content-Disposition') || '';
    // Extrai filename de Content-Disposition: attachment; filename="name.ext"
    const filenameMatch = disposition.match(/filename\*=UTF-8''([^;\n]+)|filename="?([^";\n]+)"?/i);
    const filename = decodeURIComponent(filenameMatch?.[1] || filenameMatch?.[2] || `arquivo-${id}`);

    const blob = await response.blob();
    return { blob, filename, contentType };
  }

  /**
   * download
   * pt-BR: Dispara o download no navegador usando Blob e um link temporário.
   * en-US: Triggers browser download using Blob and a temporary link.
   */
  async download(id: number | string, fallbackName?: string): Promise<void> {
    const { blob, filename, contentType } = await this.downloadBlob(id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (filename && filename.trim()) || fallbackName || `arquivo-${id}`;
    // Alguns navegadores podem precisar definir o tipo para acionar download corretamente
    (a as any).type = contentType;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
}

/**
 * Export default instance
 * pt-BR: Instância padrão do serviço de armazenamento de arquivos.
 * en-US: Default instance of file storage service.
 */
export const fileStorageService = new FileStorageService();

/**
 * extractFileStorageUrl
 * pt-BR: Extrai a URL do upload de diferentes formatos de resposta do backend.
 *        Trata envelopes em `data`, campos em `file.url` e strings com crases/aspas.
 * en-US: Extracts the uploaded file URL from various backend response shapes.
 *        Handles `data` envelopes, `file.url` fields, and strings with backticks/quotes.
 */
export function extractFileStorageUrl(resp: any): string {
  const sanitize = (u: any): string => {
    const s = String(u || '').trim();
    return s
      .replace(/^`+|`+$/g, '')
      .replace(/^"+|"+$/g, '')
      .replace(/^'+|'+$/g, '');
  };

  const candidates = [
    resp?.file?.url,
    resp?.url,
    resp?.config?.file?.url,
    resp?.data?.file?.url,
    resp?.data?.url,
    resp?.data?.data?.file?.url,
    resp?.data?.data?.url,
  ]
    .map(sanitize)
    .filter(Boolean);

  const url = candidates.find((u) => /^https?:\/\//i.test(u)) || candidates[0] || '';
  return url;
}