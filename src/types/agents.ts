/**
 * Types for Langchain AI Agents
 * Replaces Langflow types with native Langchain implementation
 */

// Agent Provider types
export type AgentProvider = 'kimi' | 'openai' | 'anthropic' | 'ollama';

// Agent Status types
export type AgentStatus = 'active' | 'inactive' | 'draft';

// Message role types
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * AI Agent configuration
 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  provider: AgentProvider;
  model_name: string;
  base_url?: string;
  temperature: number;
  max_tokens: number;
  timeout: number;
  system_prompt: string;
  context_prompt: string;
  status: AgentStatus;
  use_memory: boolean;
  memory_ttl: number;
  accounts?: WhatsAppAccountMinimal[];
  created_at: string;
  updated_at: string;
}

/**
 * Minimal WhatsApp account info for agent association
 */
export interface WhatsAppAccountMinimal {
  id: string;
  name: string;
  phone_number: string;
  status: string;
}

/**
 * Agent list item (subset of fields)
 */
export interface AgentListItem {
  id: string;
  name: string;
  description: string;
  provider: AgentProvider;
  model_name: string;
  status: AgentStatus;
  temperature: number;
  max_tokens: number;
  use_memory: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Agent creation/update payload
 */
export interface AgentCreateInput {
  name: string;
  description?: string;
  provider: AgentProvider;
  model_name: string;
  api_key?: string;
  base_url?: string;
  temperature?: number;
  max_tokens?: number;
  timeout?: number;
  system_prompt: string;
  context_prompt?: string;
  status?: AgentStatus;
  use_memory?: boolean;
  memory_ttl?: number;
  accounts?: string[];
}

export interface AgentUpdateInput extends Partial<AgentCreateInput> {
  id: string;
}

/**
 * Agent message in a conversation
 */
export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string;
  tokens_used?: number;
  response_time_ms?: number;
  created_at: string;
}

/**
 * Agent conversation session
 */
export interface AgentConversation {
  id: string;
  session_id: string;
  agent?: AgentListItem;
  phone_number: string;
  message_count: number;
  last_message_at: string;
  messages?: AgentMessage[];
  created_at: string;
}

/**
 * Agent statistics
 */
export interface AgentStats {
  total_conversations: number;
  total_messages: number;
  avg_response_time_ms: number;
  active_sessions: number;
}

/**
 * Request to process a message through an agent
 */
export interface ProcessMessageRequest {
  message: string;
  session_id?: string;
  phone_number?: string;
  context?: Record<string, unknown>;
}

/**
 * Response from processing a message
 */
export interface ProcessMessageResponse {
  response: string;
  session_id: string;
  tokens_used?: number;
  response_time_ms?: number;
}

/**
 * Conversation history from Redis memory
 */
export interface ConversationHistory {
  session_id: string;
  messages: Array<{
    type: 'human' | 'ai' | 'system';
    content: string;
    timestamp?: string;
  }>;
}

/**
 * Agent filters for listing
 */
export interface AgentFilters {
  status?: AgentStatus;
  provider?: AgentProvider;
  search?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Provider configuration options
 */
export interface ProviderConfig {
  id: AgentProvider;
  name: string;
  description: string;
  defaultModel: string;
  models: string[];
  defaultBaseUrl?: string;
  requiresApiKey: boolean;
}

/**
 * Available provider configurations
 */
export const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: 'kimi',
    name: 'Kimi (Moonshot)',
    description: 'Kimi AI - Modelo de código chinês avançado',
    defaultModel: 'kimi-for-coding',
    models: ['kimi-for-coding', 'kimi-k2', 'kimi-k2.5'],
    defaultBaseUrl: 'https://api.kimi.com/coding/',
    requiresApiKey: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5 e outros modelos da OpenAI',
    defaultModel: 'gpt-4-turbo-preview',
    models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3 e outros modelos da Anthropic',
    defaultModel: 'claude-3-opus-20240229',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    requiresApiKey: true,
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Modelos locais via Ollama',
    defaultModel: 'llama2',
    models: ['llama2', 'mistral', 'codellama', 'mixtral'],
    defaultBaseUrl: 'http://localhost:11434/v1',
    requiresApiKey: false,
  },
];

/**
 * Get provider config by ID
 */
export function getProviderConfig(providerId: AgentProvider): ProviderConfig | undefined {
  return PROVIDER_CONFIGS.find(p => p.id === providerId);
}

/**
 * Default values for new agent
 */
export const DEFAULT_AGENT_VALUES: Partial<AgentCreateInput> = {
  provider: 'kimi',
  model_name: 'kimi-for-coding',
  base_url: 'https://api.kimi.com/coding/',
  temperature: 0.7,
  max_tokens: 32768,
  timeout: 30,
  system_prompt: 'Você é um assistente virtual útil da Pastita, uma loja de massas artesanais. Ajude os clientes com informações sobre produtos, pedidos e dúvidas gerais.',
  context_prompt: '',
  status: 'draft',
  use_memory: true,
  memory_ttl: 3600,
};
