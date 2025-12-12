export interface UserConfig {
  nome_fantasia: string;
  celular: string;
  telefone_residencial: string;
  telefone_comercial: string;
  rg: string;
  nascimento: string;
  escolaridade: string;
  profissao: string;
  tipo_pj: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface UserRecord {
  id: string;
  tipo_pessoa: "pf" | "pj";
  token: string;
  permission_id: string;
  email: string;
  name: string;
  cpf: string;
  cnpj: string;
  status?: "actived" | "disabled";
  razao: string;
  config: UserConfig;
  genero: "m" | "f" | "ni";
  ativo: "s" | "n";
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserInput {
  tipo_pessoa: "pf" | "pj";
  token: string;
  permission_id: string;
  email: string;
  password: string;
  name: string;
  cpf?: string;
  cnpj?: string;
  razao?: string;
  config: UserConfig;
  genero: "m" | "f" | "ni";
  ativo: "s" | "n";
}

export interface UpdateUserInput {
  tipo_pessoa?: "pf" | "pj";
  token?: string;
  permission_id?: string;
  email?: string;
  password?: string;
  name?: string;
  cpf?: string;
  cnpj?: string;
  razao?: string;
  config?: UserConfig;
  genero?: "m" | "f" | "ni";
  ativo?: "s" | "n";
}

export interface UsersListParams {
  search?: string;
  page?: number;
  per_page?: number;
  /**
   * pt-BR: Quando true, filtra apenas usuários consultores.
   * en-US: When true, filters only consultant users.
   */
  consultores?: boolean;
  /**
   * pt-BR: Campo de ordenação no backend (ex.: 'name').
   * en-US: Backend sort field (e.g., 'name').
   */
  sort?: string;
}

export interface Paginated<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  items?: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}