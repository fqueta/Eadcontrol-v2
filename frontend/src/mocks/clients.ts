import type { ClientRecord } from "@/types/clients";

/**
 * generateMockClients
 * pt-BR: Gera uma lista de clientes de exemplo distribuídos entre as etapas fornecidas.
 *        Cada cliente terá `config.stage_id` e `config.funnelId` preenchidos para renderizar em colunas.
 * en-US: Generates a sample list of clients distributed across the provided stages.
 *        Each client includes `config.stage_id` and `config.funnelId` for column rendering.
 */
export function generateMockClients(params: {
  funnelId: string;
  stageIds: string[];
  total?: number;
}): ClientRecord[] {
  const { funnelId, stageIds } = params;
  const total = Math.max(6, params.total ?? 12);

  const statuses: ClientRecord["status"][] = [
    "actived",
    "pre_registred",
    "inactived",
  ];

  const names = [
    "Ana Paula",
    "Bruno Silva",
    "Carla Souza",
    "Diego Santos",
    "Eduarda Lima",
    "Felipe Alves",
    "Gabriela Rocha",
    "Henrique Costa",
    "Isabela Mendes",
    "João Pedro",
    "Karen Oliveira",
    "Lucas Martins",
    "Mariana Pires",
    "Nicolas Ribeiro",
    "Olívia Azevedo",
  ];

  const now = new Date();
  const items: ClientRecord[] = [];

  for (let i = 0; i < total; i++) {
    const stageId = stageIds[i % Math.max(stageIds.length, 1)] || stageIds[0] || "stage-mock-1";
    const name = names[i % names.length];
    const status = statuses[i % statuses.length];
    const id = `mock-${funnelId}-${stageId}-${i + 1}`;

    items.push({
      id,
      tipo_pessoa: "pf",
      email: `${name.split(" ")[0].toLowerCase()}.${i + 1}@example.com`,
      name,
      cpf: null,
      cnpj: null,
      razao: null,
      config: {
        funnelId,
        stage_id: stageId,
      },
      genero: "ni",
      status,
      autor: "system",
      autor_name: "Usuário Demo",
      created_at: new Date(now.getTime() - i * 86400000).toISOString(),
      updated_at: new Date(now.getTime() - i * 43200000).toISOString(),
      is_alloyal: null,
      points: Math.floor(Math.random() * 1000),
      email_verified_at: null,
      verificado: "n",
      permission_id: undefined,
      preferencias: {
        pipeline: { stage_id: stageId },
      },
      foto_perfil: null,
      ativo: "s",
      token: undefined,
      excluido: "n",
      reg_excluido: null,
      deletado: "n",
      reg_deletado: null,
    });
  }
  console.log('generateMockClients', items);
  return items;
}

/**
 * getMockClientsForStages
 * pt-BR: Conveniência para gerar clientes a partir de um array de etapas.
 * en-US: Convenience to generate clients from an array of stages.
 */
export function getMockClientsForStages(
  funnelId: string,
  stageIds: string[],
  total?: number
): ClientRecord[] {
  return generateMockClients({ funnelId, stageIds, total });
}

/**
 * getMockClientById
 * pt-BR: Retorna um cliente mock com base no `id` informado.
 *        Útil para a página de detalhe quando o backend está indisponível.
 * en-US: Returns a mocked client based on the provided `id`.
 *        Useful for the detail page when the backend is unavailable.
 */
export function getMockClientById(id: string): ClientRecord {
  const nameMap = [
    "Ana Paula",
    "Bruno Silva",
    "Carla Souza",
    "Diego Santos",
    "Eduarda Lima",
    "Felipe Alves",
    "Gabriela Rocha",
    "Henrique Costa",
    "Isabela Mendes",
    "João Pedro",
    "Karen Oliveira",
    "Lucas Martins",
    "Mariana Pires",
    "Nicolas Ribeiro",
    "Olívia Azevedo",
  ];
  const idx = Math.abs(Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % nameMap.length;
  const name = nameMap[idx];
  const now = new Date();
  return {
    id,
    tipo_pessoa: "pf",
    email: `${name.split(" ")[0].toLowerCase()}@example.com`,
    name,
    cpf: null,
    cnpj: null,
    razao: null,
    config: {
      nome_fantasia: null,
      celular: "+55 (11) 99999-9999",
      telefone_residencial: null,
      rg: "12345678",
      nascimento: "1990-05-21",
      escolaridade: "Superior Completo",
      profissao: "Analista",
      tipo_pj: null,
      cep: "01001-000",
      endereco: "Av. Paulista",
      numero: "1000",
      complemento: "Conj. 101",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      uf: "SP",
      observacoes: "Cliente mockado para visualização",
      funnelId: "mock-funnel",
      stage_id: "stage-mock-1",
    },
    genero: "ni",
    status: "actived",
    autor: "system",
    autor_name: "Usuário Demo",
    created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
    updated_at: new Date(now.getTime() - 1 * 43200000).toISOString(),
    is_alloyal: null,
    points: 250,
    email_verified_at: null,
    verificado: "n",
    permission_id: undefined,
    preferencias: { pipeline: { stage_id: "stage-mock-1" } },
    foto_perfil: null,
    ativo: "s",
    token: undefined,
    excluido: "n",
    reg_excluido: null,
    deletado: "n",
    reg_deletado: null,
  };
}