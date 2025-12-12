/**
 * modulesService.ts — Serviço genérico para Módulos
 * pt-BR: CRUD para /modules seguindo o GenericApiService.
 * en-US: CRUD for /modules using GenericApiService.
 */
import { createGenericService } from './GenericApiService';

// Base path da API para módulos
const basePath = '/modules';

// Exporta um serviço com métodos padronizados: list, getById, create, update, remove
export const modulesService = createGenericService(basePath);

export default modulesService;