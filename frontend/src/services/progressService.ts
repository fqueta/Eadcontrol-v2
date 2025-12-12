import { GenericApiService } from './GenericApiService';

/**
 * ProgressService
 * pt-BR: Serviço para persistir progresso do aluno em atividades de cursos.
 *        Endpoints podem variar no backend; ajuste `basePath` conforme necessário.
 * en-US: Service to persist student progress for course activities.
 *        Endpoints may vary on backend; adjust `basePath` as needed.
 */
class ProgressService extends GenericApiService<any, any, any> {
  /**
   * constructor
   * pt-BR: Define o endpoint base. Altere se sua API usar outro caminho.
   * en-US: Sets base endpoint. Change if your API uses a different path.
   */
  constructor() {
    super('/activities-progress');
  }

  /**
   * toggleActivityCompletion
   * pt-BR: Marca uma atividade como concluída ou não concluída.
   * en-US: Marks an activity as completed or not completed.
   */
  async toggleActivityCompletion(payload: {
    course_id: string | number;
    module_id?: string | number;
    activity_id: string | number;
    completed: boolean;
    /**
     * seconds (optional)
     * pt-BR: Duração total do vídeo em segundos para auditoria.
     * en-US: Total video duration in seconds for auditing.
     */
    seconds?: number;
    /**
     * id_matricula (optional)
     * pt-BR: Quando disponível, envia o identificador da matrícula do aluno para vincular o progresso.
     * en-US: When available, sends the student's enrollment identifier to bind progress.
     */
    id_matricula?: string | number;
  }): Promise<any> {
    return this.customPost('/complete', payload);
  }

  /**
   * getEnrollmentCurriculum
   * pt-BR: Busca o currículo consolidado por matrícula no endpoint `/activities-progress/curriculum`.
   *        Normaliza `content` das atividades removendo crases e espaços extras.
   * en-US: Fetches consolidated curriculum by enrollment from `/activities-progress/curriculum`.
   *        Normalizes activity `content` by stripping backticks and extra spaces.
   */
  async getEnrollmentCurriculum(id_matricula: string | number): Promise<{
    course_id?: number | string;
    course_title?: string;
    id_matricula: string | number;
    student_name?: string;
    modules_total?: number;
    curriculum: Array<any>;
  }> {
    const res = await this.customGet('/curriculum', { id_matricula: String(id_matricula) });
    const data = (res && typeof res === 'object' && 'data' in res) ? (res as any).data : res;

    const sanitize = (s: any) => String(s ?? '').replace(/`/g, '').trim();

    const normalized = {
      ...data,
      curriculum: Array.isArray((data as any)?.curriculum)
        ? (data as any).curriculum.map((m: any) => ({
            ...m,
            atividades: Array.isArray(m?.atividades)
              ? m.atividades.map((a: any) => ({ ...a, content: sanitize(a?.content) }))
              : [],
          }))
        : [],
    };

    return normalized;
  }

  /**
   * listCourseProgress
   * pt-BR: Obtém progresso das atividades de um curso para o usuário corrente.
   *        Normaliza diferentes formatos de resposta do backend para `{ completed_ids: [] }`.
   * en-US: Fetches course activity progress for the current user.
   *        Normalizes varying backend response formats into `{ completed_ids: [] }`.
   */
  /**
   * listCourseProgress
   * pt-BR: Obtém progresso das atividades de um curso e retorna ids concluídos
   *        e, quando disponível, o último progresso (atividade e segundos).
   * en-US: Fetches course activity progress and returns completed ids and,
   *        when available, the last progress (activity and seconds).
   */
  async listCourseProgress(course_id: string | number, id_matricula?: string | number): Promise<{
    completed_ids: Array<string | number>,
    last_activity_id?: string | number,
    last_module_id?: string | number,
    last_seconds?: number,
    /**
     * items (optional)
     * pt-BR: Lista bruta de progresso por atividade, quando o backend retorna `items`.
     * en-US: Raw per-activity progress list when backend returns `items`.
     */
    items?: Array<{ activity_id: string | number; module_id?: string | number; seconds?: number; completed?: boolean; updated_at?: string; config?: any }>,
    /**
     * next_activity_id (optional)
     * pt-BR: Próxima atividade recomendada pelo backend.
     * en-US: Next activity recommended by backend.
     */
    next_activity_id?: string | number,
    /**
     * last_completed_activity_id (optional)
     * pt-BR: Última atividade marcada como concluída, quando fornecida.
     * en-US: Last activity marked completed, when provided.
     */
    last_completed_activity_id?: string | number,
  }> {
    /**
     * pt-BR: Inclui id_matricula (quando fornecido) para escopo por matrícula.
     * en-US: Includes id_matricula (when provided) to scope by enrollment.
     */
    const res = await this.customGet('/course', { course_id: String(course_id), ...(id_matricula ? { id_matricula } : {}) });

    /**
     * normalize
     * pt-BR: Normaliza diferentes respostas possíveis do backend:
     *  - `{ completed_ids: [...] }` já compatível
     *  - `Array` de objetos (coleta `activity_id` quando `completed === true`)
     *  - `Object` único com campos `{ activity_id, completed }`
     * en-US: Normalizes backend responses:
     *  - `{ completed_ids: [...] }` already compatible
     *  - `Array` of objects (collects `activity_id` when `completed === true`)
     *  - Single `Object` with `{ activity_id, completed }`
     */
    const data = (res && typeof res === 'object' && 'data' in res) ? (res as any).data : res;

    // Caso 1: já contenha completed_ids (e possivelmente informações de último progresso)
    if (data && Array.isArray((data as any).completed_ids)) {
      const base = { completed_ids: (data as any).completed_ids as Array<string | number> } as any;
      const aid = (data as any)?.activity_id ?? (data as any)?.last_activity_id;
      const mid = (data as any)?.module_id ?? (data as any)?.last_module_id;
      const secs = Number((data as any)?.seconds ?? (data as any)?.last_seconds ?? 0) || 0;
      if (aid !== undefined && aid !== null) base.last_activity_id = aid;
      if (mid !== undefined && mid !== null) base.last_module_id = mid;
      if (secs > 0) base.last_seconds = secs;
      return base;
    }

    // Caso 2: array de registros de progresso
    if (Array.isArray(data)) {
      const arr = (data as any[]);
      const ids = arr
        .filter((item) => item && (item.completed === true || item?.config?.completed === true))
        .map((item) => item?.activity_id)
        .filter((id) => id !== undefined && id !== null);
      // Seleciona o último progresso baseado em updated_at (se existir), senão último item do array
      let last: any = null;
      try {
        last = arr.reduce((acc, cur) => {
          const accTime = acc?.updated_at ? Date.parse(acc.updated_at) : -Infinity;
          const curTime = cur?.updated_at ? Date.parse(cur.updated_at) : -Infinity;
          return curTime >= accTime ? cur : acc;
        }, null as any);
      } catch {}
      if (!last && arr.length > 0) last = arr[arr.length - 1];
      const base: any = { completed_ids: ids as Array<string | number>, items: arr };
      const aid = last?.activity_id;
      const mid = last?.module_id;
      const secs = Number(last?.seconds ?? last?.config?.seconds ?? 0) || 0;
      if (aid !== undefined && aid !== null) base.last_activity_id = aid;
      if (mid !== undefined && mid !== null) base.last_module_id = mid;
      if (secs > 0) base.last_seconds = secs;
      return base;
    }

    // Caso 3: objeto com `items` e metadados (como o exemplo fornecido)
    if (data && typeof data === 'object' && Array.isArray((data as any).items)) {
      const obj = data as any;
      const arr = obj.items as any[];
      const ids = arr
        .filter((item) => item && (item.completed === true || item?.config?.completed === true))
        .map((item) => item?.activity_id)
        .filter((id) => id !== undefined && id !== null);
      let last: any = null;
      try {
        last = arr.reduce((acc, cur) => {
          const accTime = acc?.updated_at ? Date.parse(acc.updated_at) : -Infinity;
          const curTime = cur?.updated_at ? Date.parse(cur.updated_at) : -Infinity;
          return curTime >= accTime ? cur : acc;
        }, null as any);
      } catch {}
      if (!last && arr.length > 0) last = arr[arr.length - 1];
      const base: any = { completed_ids: ids as Array<string | number>, items: arr };
      const aid = obj?.last_activity_id ?? last?.activity_id;
      const mid = obj?.last_module_id ?? last?.module_id;
      const secs = Number(obj?.last_seconds ?? last?.seconds ?? last?.config?.seconds ?? 0) || 0;
      if (aid !== undefined && aid !== null) base.last_activity_id = aid;
      if (mid !== undefined && mid !== null) base.last_module_id = mid;
      if (secs > 0) base.last_seconds = secs;
      if (obj?.next_activity_id !== undefined && obj?.next_activity_id !== null) base.next_activity_id = obj.next_activity_id;
      if (obj?.last_completed_activity_id !== undefined && obj?.last_completed_activity_id !== null) base.last_completed_activity_id = obj.last_completed_activity_id;
      return base;
    }

    // Caso 4: objeto único (ex.: último progresso retornado pelo backend)
    if (data && typeof data === 'object') {
      const single = data as any;
      const completed = Boolean(single?.completed ?? single?.config?.completed);
      const aid = single?.activity_id;
      const ids = completed && (aid !== undefined && aid !== null) ? [aid] : [];
      const mid = single?.module_id;
      const secs = Number(single?.seconds ?? single?.config?.seconds ?? 0) || 0;
      const base: any = { completed_ids: ids as Array<string | number> };
      if (aid !== undefined && aid !== null) base.last_activity_id = aid;
      if (mid !== undefined && mid !== null) base.last_module_id = mid;
      if (secs > 0) base.last_seconds = secs;
      return base;
    }

    // Fallback seguro
    return { completed_ids: [] };
  }

  /**
   * savePlaybackPosition
   * pt-BR: Persiste a posição de reprodução (em segundos) para uma atividade de vídeo.
   * en-US: Persists playback position (in seconds) for a video activity.
   */
  async savePlaybackPosition(payload: {
    course_id: string | number;
    module_id?: string | number;
    activity_id: string | number;
    seconds: number;
    id_matricula?: string | number;
  }): Promise<any> {
    // pt-BR: Envia payload incluindo opcionalmente id_matricula conforme solicitado.
    // en-US: Sends payload optionally including id_matricula as requested.
    return this.customPost('/video-position/save', payload);
  }

  /**
   * getPlaybackPosition
   * pt-BR: Obtém a posição salva de reprodução (em segundos) para uma atividade de vídeo.
   *        Normaliza respostas no formato `{ seconds, exists }`, mesmo quando a API retorna
   *        objeto diretamente sem `data`.
   * en-US: Gets saved playback position (in seconds) for a video activity.
   *        Normalizes responses to `{ seconds, exists }`, even when API returns
   *        an object directly without `data`.
   */
  async getPlaybackPosition(course_id: string | number, activity_id: string | number, id_matricula?: string | number): Promise<{
    seconds?: number;
    exists?: boolean;
    activity_id?: string | number;
  }> {
    /**
     * pt-BR: Inclui id_matricula (quando fornecido) para posição por matrícula.
     * en-US: Includes id_matricula (when provided) for per-enrollment position.
     */
    const res = await this.customGet('/video-position/get', { course_id: String(course_id), activity_id: String(activity_id), ...(id_matricula ? { id_matricula } : {}) });
    // pt-BR: Normaliza para cobrir respostas com ou sem `data`.
    // en-US: Normalize to cover responses with or without `data`.
    const data = (res && typeof res === 'object' && 'data' in res) ? (res as any).data : res;
    const seconds = Number((data as any)?.seconds ?? 0) || 0;
    const exists = Boolean((data as any)?.exists ?? (seconds > 0));
    const aid = (data as any)?.activity_id ?? activity_id;
    return { seconds, exists, activity_id: aid };
  }
}

export const progressService = new ProgressService();

export default progressService;