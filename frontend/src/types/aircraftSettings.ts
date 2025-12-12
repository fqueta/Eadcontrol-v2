/**
 * AircraftSettingsPayload — estrutura de cadastro/configuração de aeronaves
 * pt-BR: Tipos que refletem exatamente o payload esperado pela API.
 * en-US: Types that mirror the API payload for aircraft settings.
 */

/**
 * Pacote de horas de uma aeronave
 * pt-BR: Define valores em BRL/USD e limites.
 * en-US: Defines BRL/USD values and limits.
 */
export interface AircraftPackage {
  /** pt-BR: Valor do pacote Piloto Comercial MLTE IFR (BRL) */
  /** en-US: Pilot Commercial MLTE IFR price (BRL) */
  "piloto-comercial-mlte-ifr"?: string;
  /** pt-BR: Valor do pacote Piloto Comercial MLTE IFR (USD) */
  /** en-US: Pilot Commercial MLTE IFR price (USD) */
  "piloto-comercial-mlte-ifr_dolar"?: string;

  /** pt-BR: Valor da Hora Seca (BRL) */
  /** en-US: Dry hour price (BRL) */
  "hora-seca"?: string;
  /** pt-BR: Valor da Hora Seca (USD) */
  /** en-US: Dry hour price (USD) */
  "hora-seca_dolar"?: string;

  /** pt-BR: Moeda base (ex.: BRL, USD) */
  /** en-US: Base currency (e.g., BRL, USD) */
  moeda?: string;

  /** pt-BR: Limite/A partir de (ex.: 1) */
  /** en-US: Limit/Starting from (e.g., 1) */
  limite?: string;
}

/**
 * Configurações de combustível
 */
export interface CombustivelConfig {
  /** pt-BR: Consumo por hora */
  /** en-US: Hourly consumption */
  consumo_hora?: string;
  /** pt-BR: Preço por litro */
  /** en-US: Price per liter */
  preco_litro?: string;
  /** pt-BR: Ativar consumo de combustível ("s"/"n") */
  /** en-US: Enable fuel consumption ("s"/"n") */
  ativar?: "s" | "n";
}

/**
 * Configurações gerais da aeronave
 */
export interface AircraftConfig {
  combustivel?: CombustivelConfig;
  /** pt-BR: Prefixos de aeronave (ex.: PT-LMW) */
  /** en-US: Aircraft prefixes (e.g., PT-LMW) */
  prefixos?: string[];
}

/**
 * Payload principal para cadastro/atualização de aeronaves
 */
export interface AircraftSettingsPayload {
  nome: string;
  codigo: string;
  ativo: "s" | "n";
  id?: string;
  token?: string;
  autor?: string;
  tipo?: string;
  descricao?: string;
  hora_rescisao?: string;
  /** pt-BR: Mapa de pacotes (ex.: { "1": { ... } }) */
  /** en-US: Packages map (e.g., { "1": { ... } }) */
  pacotes?: Record<string, AircraftPackage>;
  config?: AircraftConfig;
}

/**
 * Resposta simplificada para operações com configurações
 */
export interface AircraftSettingsResponse {
  success: boolean;
  message?: string;
  data?: AircraftSettingsPayload | AircraftSettingsPayload[];
}