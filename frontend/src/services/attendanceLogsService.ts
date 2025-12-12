import { AttendanceLog, CreateAttendanceInput } from '@/types/attendance';

const STORAGE_KEY = 'crm.attendanceLogs';

/**
 * loadAll
 * pt-BR: Carrega todos os registros de atendimento do localStorage.
 * en-US: Loads all attendance logs from localStorage.
 */
export function loadAll(): AttendanceLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * saveAll
 * pt-BR: Persiste todos os registros no localStorage.
 * en-US: Persists all logs to localStorage.
 */
export function saveAll(logs: AttendanceLog[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

/**
 * getByClient
 * pt-BR: Obtém registros pelo ID do cliente.
 * en-US: Gets logs by client ID.
 */
export function getByClient(clientId: string): AttendanceLog[] {
  return loadAll().filter((l) => l.clientId === clientId);
}

/**
 * add
 * pt-BR: Adiciona um novo registro de atendimento. Observação é opcional.
 * en-US: Adds a new attendance log. Observation is optional.
 */
export function add(input: CreateAttendanceInput): AttendanceLog {
  const now = new Date().toISOString();
  const log: AttendanceLog = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    clientId: String(input.clientId),
    timestamp: now,
    observation: input.observation?.trim() || undefined,
    agentId: input.agentId,
  };
  const logs = loadAll();
  logs.push(log);
  saveAll(logs);
  return log;
}

/**
 * getLastByClient
 * pt-BR: Retorna o último registro para um cliente, se houver.
 * en-US: Returns the last log for a client, if any.
 */
export function getLastByClient(clientId: string): AttendanceLog | undefined {
  const logs = getByClient(clientId);
  if (logs.length === 0) return undefined;
  return logs.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))[0];
}