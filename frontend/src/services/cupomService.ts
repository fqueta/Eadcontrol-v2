import api from "@/lib/axios";

export interface CursoOption {
  id: number;
  titulo: string;
  slug: string;
}

export interface CupomRecord {
  id: number;
  codigo: string;
  tipo: "percentual" | "fixo";
  valor_desconto: string;
  validade_inicio: string | null;
  validade_fim: string | null;
  limite_uso: number | null;
  usos: number;
  valor_minimo: string | null;
  ativo: "s" | "n";
  descricao: string | null;
  cursos_ids: string | null;
  cursos: CursoOption[];
  created_at: string;
}

export interface CupomPayload {
  codigo: string;
  tipo: "percentual" | "fixo";
  valor_desconto: number;
  validade_inicio?: string;
  validade_fim?: string;
  limite_uso?: number;
  valor_minimo?: number;
  ativo: "s" | "n";
  descricao?: string;
  cursos?: number[];
}

export const cupomService = {
  list: async (params?: { search?: string; per_page?: number; ativo?: string }) => {
    const res = await api.get("/cupons", { params });
    return res.data;
  },

  getById: async (id: number): Promise<CupomRecord> => {
    const res = await api.get(`/cupons/${id}`);
    return res.data;
  },

  create: async (data: CupomPayload): Promise<CupomRecord> => {
    const res = await api.post("/cupons", data);
    return res.data;
  },

  update: async (id: number, data: CupomPayload): Promise<CupomRecord> => {
    const res = await api.put(`/cupons/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/cupons/${id}`);
  },

  restore: async (id: number): Promise<void> => {
    await api.put(`/cupons/${id}/restore`);
  },

  forceDelete: async (id: number): Promise<void> => {
    await api.delete(`/cupons/${id}/force`);
  },

  cursosDisponiveis: async (): Promise<CursoOption[]> => {
    const res = await api.get("/courses", { params: { per_page: 100, ativo: 's' } });
    const data = res.data?.data || res.data || [];
    return data.map((c: any) => ({ id: c.id, titulo: c.titulo }));
  },

  getUsages: async (id: number): Promise<any[]> => {
    const res = await api.get(`/cupons/${id}/usages`);
    return res.data;
  },
};
