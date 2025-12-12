/**
 * activitiesService.ts — Serviço genérico para Atividades
 * pt-BR: CRUD para /activities seguindo o GenericApiService.
 * en-US: CRUD for /activities using GenericApiService.
 */
import { createGenericService } from './GenericApiService';

// Base path da API para atividades
const basePath = '/activities';

// Exporta um serviço com métodos padronizados: list, getById, create, update, remove
export const activitiesService = createGenericService(basePath);

export default activitiesService;

/**
 * uploadActivityFile
 * pt-BR: Faz upload de arquivo de apostila e retorna metadados/URL.
 * en-US: Uploads an apostila file and returns metadata/URL.
 */
export async function uploadActivityFile(file: File, extra?: Record<string, any>) {
  const form = new FormData();
  form.append('file', file);
  if (extra) {
    Object.entries(extra).forEach(([k, v]) => form.append(k, String(v)));
  }
  // Endpoint sugerido: /activities/upload (ajuste se sua API usar outro caminho)
  return activitiesService.customPostFormData('/upload', form);
}