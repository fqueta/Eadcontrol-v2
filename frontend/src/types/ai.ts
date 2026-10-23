/**
 * Agentes de IA — tipos de configuração, base de conhecimento (RAG) e testes.
 */

export type LlmProviderName = 'openai' | 'deepseek' | 'gemini' | 'claude';

export interface BusinessHoursRange {
  start: string;
  end: string;
}

export interface BusinessHoursConfig {
  enabled: boolean;
  timezone?: string;
  days?: Record<string, BusinessHoursRange | BusinessHoursRange[]>;
}

export interface AiAgentSettings {
  business_hours?: BusinessHoursConfig;
  transfer_keywords?: string[] | string;
  handoff_message?: string;
  offline_message?: string;
  use_catalog?: boolean;
  catalog_courses_limit?: number;
  catalog_products_limit?: number;
  [key: string]: any;
}

export interface AiAgent {
  id: number;
  whatsapp_instance_id?: number | null;
  name: string;
  llm_provider: LlmProviderName;
  llm_model: string;
  system_prompt?: string | null;
  welcome_message?: string | null;
  is_active: boolean;
  temperature: number;
  max_tokens: number;
  settings?: AiAgentSettings | null;
  created_at?: string | null;
  instance?: {
    id: number;
    display_name: string;
    instance_name: string;
    status: string;
    phone_number?: string | null;
  } | null;
  knowledge_bases?: AiKnowledgeBase[];
  knowledge_bases_count?: number;
  conversations_count?: number;
  open_conversations_count?: number;
}

export interface AiAgentPayload {
  name: string;
  whatsapp_instance_id?: number | null;
  llm_provider?: LlmProviderName;
  llm_model?: string;
  system_prompt?: string;
  welcome_message?: string;
  is_active?: boolean;
  temperature?: number;
  max_tokens?: number;
  settings?: AiAgentSettings;
  knowledge_name?: string;
  knowledge_content?: string;
}

export interface AiKnowledgeBase {
  id: number;
  ai_agent_id: number;
  name: string;
  type: 'text' | 'faq' | 'url' | 'catalog';
  content?: string | null;
  is_active: boolean;
  embeddings_status: 'pending' | 'processing' | 'completed' | 'failed';
  embeddings_error?: string | null;
  last_synced_at?: string | null;
  chunks_count?: number;
  created_at?: string | null;
}

export interface LlmModelInfo {
  label: string;
  max_tokens?: number;
}

export interface LlmProviderInfo {
  name: LlmProviderName;
  label: string;
  configured: boolean;
  default_model?: string | null;
  models: Record<string, LlmModelInfo>;
}

export interface AiAgentTestResult {
  content: string;
  provider: string;
  model: string;
  tokens: number;
  rag_chunks: number;
}
