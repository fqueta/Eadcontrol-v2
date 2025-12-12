/**
 * Tipos de Cursos
 * pt-BR: Estruturas que representam exatamente o payload esperado pela API de cursos.
 * en-US: Structures that mirror the expected payload for the courses API.
 */

/**
 * Parâmetros de listagem de cursos
 * pt-BR: Suporta paginação, busca e filtros básicos.
 * en-US: Supports pagination, search and basic filters.
 */
export interface CoursesListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Configurações da página de venda
 */
export interface CourseSalePage {
  link: string;
  label: string;
}

/**
 * Configurações adicionais (adc)
 */
export interface CourseADCConfig {
  recheck: 's' | 'n' | 'y' | 'n';
  recorrente: 's' | 'n';
  cor: string; // hex RGB sem '#'
}

/**
 * Configurações EAD
 */
export interface CourseEADConfig {
  id_eadcontrol: string;
}

/**
 * Configurações diversas do curso (config)
 */
export interface CourseConfig {
  proximo_curso: string;
  gratis: 's' | 'n';
  comissao: string; // ex: "3,00"
  tx2: Array<{ name_label: string; name_valor: string }>;
  tipo_desconto_taxa: 'v' | 'p';
  desconto_taxa: string; // ex: "10,00" ou vazio
  pagina_divulgacao: string;
  video: string; // URL do vídeo
  pagina_venda: CourseSalePage;
  adc: CourseADCConfig;
  ead: CourseEADConfig;
}

/**
 * Módulo de conteúdo do curso
 */
export interface CourseModule {
  etapa: 'etapa1' | 'etapa2' | string;
  titulo: string;
  limite: string; // número em string (mantemos compatível com backend)
  valor?: string; // currency string
  aviao?: string[]; // lista de IDs de aeronaves quando aplicável
  /**
   * module_id
   * pt-BR: Opcionalmente referencia um Módulo já cadastrado para reaproveitamento.
   * en-US: Optionally references an already registered Module for reuse.
   */
  module_id?: string;
  /**
   * atividades
   * pt-BR: Lista de atividades pertencentes a este módulo.
   * en-US: Activities list belonging to this module.
   */
  atividades?: CourseActivity[];
}

/**
 * CourseQuestion
 * pt-BR: Estrutura simples para perguntas e respostas vinculadas ao curso.
 * en-US: Simple structure for course-linked questions and answers.
 */
export interface CourseQuestion {
  /**
   * pergunta
   * pt-BR: Texto da pergunta.
   * en-US: Question text.
   */
  pergunta: string;
  /**
   * resposta
   * pt-BR: Texto da resposta.
   * en-US: Answer text.
   */
  resposta?: string;
}

/**
 * Payload principal de curso (criação/atualização)
 */
export interface CoursePayload {
  nome: string;
  titulo: string;
  ativo: 's' | 'n';
  destaque: 's' | 'n';
  publicar: 's' | 'n';
  duracao: string; // ex: "45"
  unidade_duracao: string; // ex: "seg" | "min" | "hrs"
  id?: string; // fornecido para atualizações
  tipo: string; // ex: "2"
  categoria: string; // ex: "cursos_online"
  /**
   * slug
   * pt-BR: Slug público do curso (utilizado em URLs e edição pela API).
   * en-US: Public course slug (used in URLs and edited via API).
   */
  slug?: string; // ex: "novo-curso-mesmo"
  /**
   * token
   * pt-BR: Compatibilidade com backends que usam `token` como slug.
   * en-US: Compatibility for backends that use `token` as slug.
   */
  token?: string; // ex: "5e31c31404efa"
  config: CourseConfig;
  inscricao: string; // currency string
  valor: string; // currency string
  parcelas: string; // ex: "1"
  valor_parcela: string; // currency string
  aeronaves: string[]; // IDs de aeronaves
  modulos: CourseModule[];
  /**
   * descricao
   * pt-BR: Alias opcional para descrição geral do curso, usado pela UI.
   * en-US: Optional alias for course general description, used by the UI.
   */
  descricao?: string;
  /**
   * descricao_curso
   * pt-BR: Campo opcional para descrição geral do curso.
   * en-US: Optional field for course general description.
   */
  descricao_curso?: string;
  /**
   * observacoes
   * pt-BR: Campo opcional para observações internas.
   * en-US: Optional field for internal notes.
   */
  observacoes?: string;
  /**
   * instrutor
   * pt-BR: Nome ou ID do instrutor (opcional).
   * en-US: Instructor name or ID (optional).
   */
  instrutor?: string;
  /**
   * imagem_url
   * pt-BR: URL da imagem de capa (quando disponível).
   * en-US: Cover image URL (when available).
   */
  imagem_url?: string;
  /**
   * imagem_file_id
   * pt-BR: ID do arquivo selecionado na biblioteca de mídia (quando disponível).
   * en-US: File ID selected from the media library (when available).
   */
  imagem_file_id?: number | string;
  /**
   * perguntas
   * pt-BR: Lista opcional de perguntas e respostas exibidas na aba correspondente.
   * en-US: Optional list of Q&A shown in the Questions tab.
   */
  perguntas?: CourseQuestion[];
}

/**
 * Registro retornado pela API (lista/detalhe)
 */
export interface CourseRecord extends CoursePayload {
  id: string; // garantir presença em listagens
}

/**
 * CourseActivity
 * pt-BR: Representa uma atividade dentro de um módulo do curso.
 * en-US: Represents an activity within a course module.
 */
export interface CourseActivity {
  /**
   * id
   * pt-BR: Identificador opcional da atividade (gerado pelo backend).
   * en-US: Optional activity identifier (generated by backend).
   */
  id?: string;
  /**
   * titulo
   * pt-BR: Título descritivo da atividade (ex.: Aula 1 - Introdução).
   * en-US: Activity descriptive title (e.g., Lesson 1 - Introduction).
   */
  titulo: string;
  /**
   * tipo
   * pt-BR: Tipo da atividade (video, quiz, leitura, arquivo, tarefa).
   * en-US: Activity type (video, quiz, reading, file, assignment).
   */
  tipo: 'video' | 'quiz' | 'leitura' | 'arquivo' | 'tarefa' | string;
  /**
   * descricao
   * pt-BR: Descrição opcional do conteúdo ou objetivo.
   * en-US: Optional description of content or goal.
   */
  descricao?: string;
  /**
   * duracao
   * pt-BR: Duração opcional em string (compatível com backend).
   * en-US: Optional duration as string (backend-friendly).
   */
  duracao?: string;
  /**
   * unidade_duracao
   * pt-BR: Unidade da duração (seg, min, hrs).
   * en-US: Duration unit (seg, min, hrs).
   */
  unidade_duracao?: 'seg' | 'min' | 'hrs' | string;
  /**
   * requisito
   * pt-BR: Requisito opcional (ex.: assistir vídeo antes do quiz).
   * en-US: Optional prerequisite (e.g., watch video before quiz).
   */
  requisito?: string;
  /**
   * activity_id
   * pt-BR: Opcionalmente referencia uma Atividade já cadastrada para reaproveitamento.
   * en-US: Optionally references an already registered Activity for reuse.
   */
  activity_id?: string;
}