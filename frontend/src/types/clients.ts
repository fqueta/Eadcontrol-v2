export interface ClientConfig {
  nome_fantasia?: string | null;
  celular?: string | null;
  telefone_residencial?: string | null;
  rg?: string | null;
  nascimento?: string | null;
  escolaridade?: string | null;
  profissao?: string | null;
  tipo_pj?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  observacoes?: string | null;
  /**
   * pt-BR: Identificador do funil de atendimento associado ao cliente
   * en-US: Support funnel identifier associated with the client
   */
  funnelId?: string | null;
  /**
   * pt-BR: Identificador da etapa dentro do funil de atendimento
   * en-US: Stage identifier inside the support funnel
   */
  stage_id?: string | null;
}

export interface AlloyalIntegration {
  id: number;
  active: boolean;
  business_id: number;
  activated_at: string;
  email: string;
  cpf: string;
  name: string;
  cellphone?: string;
  custom_field_1?: string | null;
  custom_field_2?: string | null;
  custom_field_3?: string | null;
  custom_field_4?: string | null;
  custom_field_5?: string | null;
  custom_field_6?: string | null;
  custom_field_7?: string | null;
  custom_field_8?: string | null;
  default_auth_flow?: boolean;
  tags?: any[];
  telemedicine?: boolean;
  user_tags?: any;
  wallet?: {
    id: string;
    balance: number;
  };
}

export interface ClientRecord {
  id: string;
  tipo_pessoa: "pf" | "pj";
  email: string;
  name: string;
  cpf: string | null;
  cnpj: string | null;
  razao: string | null;
  config: ClientConfig;
  genero: "m" | "f" | "ni";
  status: "actived" | "inactived" | "pre_registred";
  autor?: string;
  autor_name?: string | null;
  created_at?: string;
  updated_at?: string;
  is_alloyal?: AlloyalIntegration | null;
  points?: number;
  email_verified_at?: string | null;
  verificado?: "s" | "n";
  permission_id?: number;
  preferencias?: any;
  foto_perfil?: string | null;
  ativo?: "s" | "n";
  token?: string;
  excluido?: "s" | "n";
  reg_excluido?: string | null;
  deletado?: "s" | "n";
  reg_deletado?: string | null;
}

export interface CreateClientInput {
  tipo_pessoa: "pf" | "pj";
  email: string;
  /**
   * pt-BR: Telefone principal do cliente (opcional)
   * en-US: Primary phone of the client (optional)
   */
  telefone?: string;
  name: string;
  cpf?: string;
  cnpj?: string;
  razao?: string;
  config: ClientConfig;
  genero: "m" | "f" | "ni";
  status: "actived" | "inactived" | "pre_registred";
  autor?: string;
  /**
   * pt-BR: Senha inicial do cliente (opcional, quando aplicável ao fluxo)
   * en-US: Initial password for the client (optional, when applicable)
   */
  password?: string;
}

export interface UpdateClientInput {
  tipo_pessoa?: "pf" | "pj";
  email?: string;
  name?: string;
  cpf?: string;
  cnpj?: string;
  razao?: string;
  config?: ClientConfig;
  genero?: "m" | "f" | "ni";
  status?: "actived" | "inactived" | "pre_registred";
  autor?: string;
}

export interface ClientsListParams {
  search?: string;
  page?: number;
  per_page?: number;
  excluido?: 's' | 'n';
  /**
   * permission_id
   * pt-BR: Filtro opcional pelo ID de permissão do cliente (ex.: 8).
   * en-US: Optional filter by client's permission ID (e.g., 8).
   */
  permission_id?: number;
}