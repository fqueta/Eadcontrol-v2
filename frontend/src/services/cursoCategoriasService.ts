import { GenericApiService } from './GenericApiService';

export interface CursoCategoriaRecord {
  id: string;
  nome: string;
  slug: string;
}

export interface CursoCategoriaPayload {
  nome: string;
}

class CursoCategoriasService extends GenericApiService<CursoCategoriaRecord, CursoCategoriaPayload, CursoCategoriaPayload> {
  constructor() {
    super('/cursos-categorias');
  }

  async listCategorias(params?: any): Promise<any> {
    return this.list(params);
  }
}

export const cursoCategoriasService = new CursoCategoriasService();
