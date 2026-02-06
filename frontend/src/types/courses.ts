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
  cover?: {
    url: string;
    file_id?: number | string;
    title?: string;
  };
}

/**
 * Módulo de conteúdo do curso
 */
export interface CourseModule {
  etapa: 'etapa1' | 'etapa2' | string;
  title?: string; // Add alias if needed by UI
  name?: string; // Add alias if needed by UI
  active?: 's' | 'n'; // Module active state
  description?: string;
  tipo_duracao?: 'seg' | 'min' | 'hrs';
  duration?: string;
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
 * QuizQuestionOption
 * pt-BR: Opção de resposta para perguntas de múltipla escolha.
 * en-US: Answer option for multiple choice questions.
 */
export interface QuizQuestionOption {
  /**
   * id
   * pt-BR: Identificador único da opção (gerado localmente).
   * en-US: Unique option identifier (locally generated).
   */
  id: string;
  /**
   * texto
   * pt-BR: Texto da alternativa.
   * en-US: Option text.
   */
  texto: string;
  /**
   * correta
   * pt-BR: Indica se esta é a resposta correta.
   * en-US: Indicates if this is the correct answer.
   */
  correta: boolean;
}

/**
 * QuizQuestion
 * pt-BR: Representa uma pergunta de quiz/avaliação.
 * en-US: Represents a quiz/assessment question.
 */
export interface QuizQuestion {
  /**
   * id
   * pt-BR: Identificador único da pergunta (gerado localmente).
   * en-US: Unique question identifier (locally generated).
   */
  id: string;
  /**
   * tipo_pergunta
   * pt-BR: Tipo da pergunta (multipla_escolha ou verdadeiro_falso).
   * en-US: Question type (multiple_choice or true_false).
   */
  tipo_pergunta: 'multipla_escolha' | 'verdadeiro_falso';
  /**
   * enunciado
   * pt-BR: Texto da pergunta/enunciado.
   * en-US: Question statement/text.
   */
  enunciado: string;
  /**
   * opcoes
   * pt-BR: Lista de opções para múltipla escolha (2-6 opções).
   * en-US: Options list for multiple choice (2-6 options).
   */
  opcoes?: QuizQuestionOption[];
  /**
   * resposta_correta
   * pt-BR: Para verdadeiro/falso: 'verdadeiro' ou 'falso'.
   * en-US: For true/false: 'verdadeiro' or 'falso'.
   */
  resposta_correta?: 'verdadeiro' | 'falso';
  /**
   * explicacao
   * pt-BR: Explicação opcional exibida após resposta.
   * en-US: Optional explanation shown after answering.
   */
  explicacao?: string;
  /**
   * pontos
   * pt-BR: Pontuação desta pergunta (default: 1).
   * en-US: Points for this question (default: 1).
   */
  pontos?: number;
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
   * active
   * pt-BR: Status de ativação da atividade.
   * en-US: Activity activation status.
   */
  active?: 's' | 'n';
  /**
   * video_url
   * pt-BR: URL do vídeo (se tipo=video).
   * en-US: Video URL (if type=video).
   */
  video_url?: string;
  /**
   * video_source
   * pt-BR: Fonte do vídeo (youtube, vimeo).
   * en-US: Video source (youtube, vimeo).
   */
  video_source?: 'youtube' | 'vimeo' | string;
  /**
   * arquivo_url
   * pt-BR: URL do arquivo (se tipo=arquivo).
   * en-US: File URL (if type=file).
   */
  arquivo_url?: string;
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
  /**
   * quiz_questions
   * pt-BR: Lista de perguntas quando tipo="quiz".
   * en-US: Questions list when type="quiz".
   */
  quiz_questions?: QuizQuestion[];
  /**
   * quiz_config
   * pt-BR: Configurações do quiz (nota mínima, tentativas, etc).
   * en-US: Quiz configuration (minimum score, attempts, etc).
   */
  quiz_config?: {
    nota_minima?: number;
    tentativas?: number;
    mostrar_respostas?: boolean;
    mostrar_correcao?: boolean;
    ordem_aleatoria?: boolean;
    time_limit?: number;
  };
}