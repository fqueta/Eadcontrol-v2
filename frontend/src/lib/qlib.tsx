/**
 * getTenantIdFromSubdomain
 * pt-BR: Obtém o tenant_id a partir do subdomínio atual.
 * en-US: Gets the tenant_id from the current subdomain.
 */
export function getTenantIdFromSubdomain(): string | null {
  const host = window.location.hostname;
  const parts = host.split('.');
  return parts.length > 1 ? parts[0] : null;
}

/**
 * getTenantApiUrl
 * pt-BR: Retorna a base da API do tenant, SEM versão. Ex.: "http://{tenant_id}.localhost:8000/api".
 * en-US: Returns tenant API base, WITHOUT version. E.g.: "http://{tenant_id}.localhost:8000/api".
 */
export function getTenantApiUrl(): string {
  // Prefer VITE_TENANT_API_URL; fallback to VITE_API_URL; otherwise use sensible default
  const raw =
    (import.meta.env as any).VITE_TENANT_API_URL ||
    (import.meta.env as any).VITE_API_URL ||
    'http://{tenant_id}.localhost:8000/api';

  const tenant_id = getTenantIdFromSubdomain() || 'default';
  // console.log('tenant_id', tenant_id);
  const replaced = raw.replace('{tenant_id}', tenant_id); 
  //raw.includes('{tenant_id}') ? raw.replace('{tenant_id}', tenant_id) : raw;
  console.log('replaced', replaced);
  // Normalize: remove trailing slashes to avoid double slashes when concatenating version
  return replaced.replace(/\/+$/, '');
}

/**
 * getVersionApi
 * pt-BR: Retorna a versão da API (apenas o sufixo), ex.: "/v1".
 * en-US: Returns API version (suffix only), e.g.: "/v1".
 */
export function getVersionApi(): string {
  const raw = (import.meta.env as any).VITE_API_VERSION || '/v1';
  // Ensure leading slash
  return raw.startsWith('/') ? raw : `/${raw}`;
}
// Capitaliza a primeira letra de cada palavra (similar ao ucwords do PHP)
export function ucwords(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Aplica máscara de CPF no formato XXX.XXX.XXX-XX
 * @param cpf String contendo apenas números do CPF
 * @returns CPF formatado com máscara
 * @example
 * mascaraCpf('12345678901') // retorna '123.456.789-01'
 * mascaraCpf('123456789') // retorna '123.456.789'
 */
export function mascaraCpf(cpf: string): string {
  // Remove todos os caracteres não numéricos
  const apenasNumeros = cpf.replace(/\D/g, '');
  
  // Aplica a máscara baseada no tamanho
  if (apenasNumeros.length <= 3) {
    return apenasNumeros;
  } else if (apenasNumeros.length <= 6) {
    return apenasNumeros.replace(/(\d{3})(\d+)/, '$1.$2');
  } else if (apenasNumeros.length <= 9) {
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
  } else {
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
}
/**
 * getApiUrl
 * pt-BR: Constrói a URL completa da API juntando base + versão.
 * en-US: Builds the full API URL by combining base + version.
 */
export function getApiUrl(): string {
  return `${getTenantApiUrl()}${getVersionApi()}`;
}
// Converte data do formato 'YYYY-MM-DD' para 'DD/MM/YYYY' (padrão brasileiro)
export function dataParaBR(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-');
  if (!ano || !mes || !dia) return dataISO;
  return `${dia}/${mes}/${ano}`;
}
// Retorna o número do mês (1-12) dado o nome do mês em português (case-insensitive)
export function numeroDoMes(nomeMes: string): number | undefined {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const idx = meses.findIndex(
    m => m.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() ===
         nomeMes.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  );
  return idx >= 0 ? idx + 1 : undefined;
}
// component para retornar o inicio e fim da semana atual
export function getSemanaAtual() {
  const hoje = new Date();

  // Pega o dia da semana (0 = domingo, 1 = segunda, ..., 6 = sábado)
  const diaSemana = hoje.getDay();

  // Ajuste para considerar segunda-feira como início
  const diffSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;

  // Data da segunda-feira
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() + diffSegunda);

  // Data do domingo
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  return {
    inicio: inicioSemana,
    fim: fimSemana,
  };
}
/**
 * Componente para retornar o numero da semana do ano 
 * @param data Data para a qual se quer obter o número da semana (padrão: data atual)
 * @returns 
 * exmplo de uso:
 * console.log("Semana atual:", getNumeroSemana()); 
 * console.log("Semana de 01/01/2025:", getNumeroSemana(new Date("2025-01-01")));
 * console.log("Semana de 31/12/2025:", getNumeroSemana(new Date("2025-12-31")));
 */

export function getNumeroSemana(data: Date = new Date()): number {
  // Copia a data e zera horas (em UTC para evitar problemas de fuso)
  const d = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));

  // Ajusta para quinta-feira da semana atual (regra ISO-8601)
  const diaSemana = d.getUTCDay() || 7; // se for domingo (0), vira 7
  d.setUTCDate(d.getUTCDate() + 4 - diaSemana);

  // Primeiro dia do ano
  const inicioAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

  // Diferença em dias e conversão para número da semana
  const numeroSemana = Math.ceil(((d.getTime() - inicioAno.getTime()) / 86400000 + 1) / 7);

  return numeroSemana;
}
/**
 * componente para obter o inicio e fim da semana de um ano e numero da semana 
 * @param ano numero do ano
 * @param semana numero da semana (1-53)
 * @returns o objeto com as datas de inicio e fim da semana
 * Exemplo de uso: const { inicio, fim } = getSemanaPorNumero(2025, 34);
  console.log("Semana 34 de 2025:");
  console.log("Início:", inicio.toISOString().split("T")[0]); // 2025-08-18
  console.log("Fim:", fim.toISOString().split("T")[0]);       // 2025-08-24
 */
export function getSemanaPorNumero(ano: number, semana: number): { inicio: Date; fim: Date } {
  // Cria data na 1ª semana do ano (dia 4 de janeiro é sempre na semana 1 ISO)
  const inicioAno = new Date(Date.UTC(ano, 0, 4));

  // Ajusta para segunda-feira da semana 1
  const diaSemana = inicioAno.getUTCDay() || 7;
  const inicioSemana1 = new Date(inicioAno);
  inicioSemana1.setUTCDate(inicioAno.getUTCDate() - (diaSemana - 1));

  // Calcula a data de início da semana desejada
  const inicio = new Date(inicioSemana1);
  inicio.setUTCDate(inicioSemana1.getUTCDate() + (semana - 1) * 7);

  // Data do fim da semana (domingo)
  const fim = new Date(inicio);
  fim.setUTCDate(inicio.getUTCDate() + 6);

  return { inicio, fim };
}
/**
 * componente para obter o inicio e fim de um mes de um ano
 * @param ano ano (ex: 2025)
 * @param mes mes (1-12)
 * @returns 
 */
export function getInicioFimMes(ano: number, mes: number): { inicioStr: string; fimStr: string } {
  // mes é 1–12, mas no JS o mês começa em 0
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0); // dia 0 do próximo mês → último dia do mês atual
  // Formata como YYYY-MM-DD
  const inicioStr = inicio.toISOString().split('T')[0];
  const fimStr = fim.toISOString().split('T')[0];
  return { inicioStr, fimStr };
}

/**
 * Retorna a lista de estados brasileiros com value (sigla) e label (nome completo)
 * @returns Array de objetos com value e label dos estados brasileiros
 * @example
 * const estados = getBrazilianStates();
 * // retorna [{ value: "AC", label: "Acre" }, { value: "AL", label: "Alagoas" }, ...]
 */
export function getBrazilianStates(): { value: string; label: string }[] {
  return [
    { value: "AC", label: "Acre" },
    { value: "AL", label: "Alagoas" },
    { value: "AP", label: "Amapá" },
    { value: "AM", label: "Amazonas" },
    { value: "BA", label: "Bahia" },
    { value: "CE", label: "Ceará" },
    { value: "DF", label: "Distrito Federal" },
    { value: "ES", label: "Espírito Santo" },
    { value: "GO", label: "Goiás" },
    { value: "MA", label: "Maranhão" },
    { value: "MT", label: "Mato Grosso" },
    { value: "MS", label: "Mato Grosso do Sul" },
    { value: "MG", label: "Minas Gerais" },
    { value: "PA", label: "Pará" },
    { value: "PB", label: "Paraíba" },
    { value: "PR", label: "Paraná" },
    { value: "PE", label: "Pernambuco" },
    { value: "PI", label: "Piauí" },
    { value: "RJ", label: "Rio de Janeiro" },
    { value: "RN", label: "Rio Grande do Norte" },
    { value: "RS", label: "Rio Grande do Sul" },
    { value: "RO", label: "Rondônia" },
    { value: "RR", label: "Roraima" },
    { value: "SC", label: "Santa Catarina" },
    { value: "SP", label: "São Paulo" },
    { value: "SE", label: "Sergipe" },
    { value: "TO", label: "Tocantins" },
  ];
}
export function zerofill(num: number, width: number): string {
  const numStr = num.toString();
  return numStr.padStart(width, '0');
}


