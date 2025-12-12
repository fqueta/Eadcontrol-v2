import { ServiceObject, ServiceObjectType } from './index';

/**
 * Tipo para registro de objeto de serviço (alias para ServiceObject)
 */
export type ServiceObjectRecord = ServiceObject;

/**
 * Interface para criação de objeto de serviço
 */
export interface CreateServiceObjectInput {
  client_id: string;
  type: ServiceObjectType;
  // Identificadores específicos por tipo
  placa?: string;
  renavam?: string;
  chassi?: string;
  matricula?: string;
  numero_serie?: string;
  // Especificações comuns
  manufacturer?: string;
  model?: string;
  year?: number | string;
  color?: string;
  notes?: string;
  active?: boolean;
  // Campo para identificador principal (usado no formulário)
  identifier_primary?: string;
}

/**
 * Interface para atualização de objeto de serviço
 */
export interface UpdateServiceObjectInput {
  client_id?: string;
  type?: ServiceObjectType;
  // Identificadores específicos por tipo
  placa?: string;
  renavam?: string;
  chassi?: string;
  matricula?: string;
  numero_serie?: string;
  // Especificações comuns
  manufacturer?: string;
  model?: string;
  year?: number;
  color?: string;
  notes?: string;
  active?: boolean;
  // Campo para identificador principal (usado no formulário)
  identifier_primary?: string;
}

/**
 * Parâmetros para listagem de objetos de serviço
 */
export interface ServiceObjectsListParams {
  search?: string;
  client_id?: string;
  type?: ServiceObjectType;
  page?: number;
  per_page?: number;
}