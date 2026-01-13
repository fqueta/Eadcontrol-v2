export interface PartnerConfig {
  nome_fantasia?: string;
  celular?: string;
  telefone_residencial?: string;
  telefone_comercial?: string;
  rg?: string;
  nascimento?: string;
  escolaridade?: string;
  profissao?: string;
  tipo_pj?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  observacoes?: string;
}

export interface PartnerRecord {
  id: string;
  tipo_pessoa: "pf" | "pj";
  email: string;
  name: string;
  password?: string;
  cpf?: string;
  cnpj?: string;
  razao?: string;
  config?: PartnerConfig;
  genero: "m" | "f" | "ni";
  ativo: "s" | "n";
  created_at?: string;
  updated_at?: string;
}

export interface CreatePartnerInput {
  tipo_pessoa: "pf" | "pj";
  email: string;
  name: string;
  password?: string;
  cpf?: string;
  cnpj?: string;
  razao?: string;
  config?: PartnerConfig;
  genero: "m" | "f" | "ni";
  ativo: "s" | "n";
}

export interface UpdatePartnerInput {
  tipo_pessoa?: "pf" | "pj";
  email?: string;
  name?: string;
  password?: string;
  cpf?: string;
  cnpj?: string;
  razao?: string;
  config?: PartnerConfig;
  genero?: "m" | "f" | "ni";
  ativo?: "s" | "n";
}

export interface PartnersListParams {
  search?: string;
  page?: number;
  per_page?: number;
}