import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  PaperAirplaneIcon,
  TrashIcon,
  ArrowPathIcon,
  UserCircleIcon,
  CpuChipIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BugAntIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import agentsService, { ProcessMessageResponse, AgentServiceError } from '../../services/agents';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  tokens_used?: number;
  response_time_ms?: number;
  errorDetails?: {
    statusCode?: number;
    message: string;
  };
}

interface AgentChatTestProps {
  agentName: string;
  agentId?: string;
  onSendMessage?: (message: string, sessionId?: string) => Promise<ProcessMessageResponse>;
  onClearChat?: () => void;
  initialSessionId?: string;
}

// Debug logger
const debug = {
  log: (component: string, message: string, data?: unknown) => {
    console.log(`[AgentChatTest][${component}] ${message}`, data ? data : '');
  },
  error: (component: string, message: string, error?: unknown) => {
    console.error(`[AgentChatTest][${component}] ${message}`, error ? error : '');
  },
  warn: (component: string, message: string, data?: unknown) => {
    console.warn(`[AgentChatTest][${component}] ${message}`, data ? data : '');
  }
};

export const AgentChatTest: React.FC<AgentChatTestProps> = ({
  agentName,
  agentId,
  onSendMessage,
  onClearChat,
  initialSessionId,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [showDebug, setShowDebug] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'loading'>('connected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  debug.log('Init', 'Component mounted', { agentId, initialSessionId });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!inputValue.trim() || isLoading) {
      debug.warn('Submit', 'Empty message or already loading');
      return;
    }

    if (!agentId && !onSendMessage) {
      debug.error('Submit', 'No agentId or onSendMessage provided');
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'error',
        content: 'Erro de configuração: ID do agente não fornecido',
        timestamp: new Date(),
        errorDetails: { message: 'Agent ID missing' }
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setConnectionStatus('loading');

    debug.log('Submit', 'Sending message', { 
      messageLength: userMessage.content.length,
      sessionId,
      agentId 
    });

    try {
      let response: ProcessMessageResponse;

      if (onSendMessage) {
        debug.log('Submit', 'Using provided onSendMessage handler');
        response = await onSendMessage(userMessage.content, sessionId);
      } else if (agentId) {
        debug.log('Submit', 'Using agentsService.processMessage', { agentId });
        response = await agentsService.processMessage(agentId, {
          message: userMessage.content,
          session_id: sessionId,
          context: { test: true, source: 'AgentChatTest' }
        });
      } else {
        throw new Error('Nenhum método de envio configurado');
      }

      debug.log('Submit', 'Response received', {
        hasResponse: !!response?.response,
        sessionId: response?.session_id,
        tokensUsed: response?.tokens_used,
        responseTimeMs: response?.response_time_ms,
      });

      setSessionId(response.session_id);
      setConnectionStatus('connected');
      
      // Garantir que content seja sempre string
      const responseContent = typeof response.response === 'string' 
        ? response.response 
        : JSON.stringify(response.response);
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        tokens_used: response.tokens_used,
        response_time_ms: response.response_time_ms,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      debug.error('Submit', 'Error processing message', error);
      setConnectionStatus('error');

      let errorMessage = 'Erro desconhecido ao processar mensagem';
      let errorDetails: { statusCode?: number; message: string } = { message: 'Unknown error' };

      if (error instanceof AgentServiceError) {
        errorMessage = error.message;
        errorDetails = {
          statusCode: error.statusCode,
          message: error.message
        };
        debug.error('Submit', 'AgentServiceError', { 
          statusCode: error.statusCode, 
          message: error.message,
          responseData: error.responseData 
        });
      } else if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails.message = error.message;
        debug.error('Submit', 'Generic Error', error.message);
      }

      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'error',
        content: errorMessage,
        timestamp: new Date(),
        errorDetails
      };

      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = () => {
    debug.log('Clear', 'Clearing chat');
    setMessages([]);
    setSessionId(undefined);
    setConnectionStatus('connected');
    onClearChat?.();
  };

  const handleRetry = () => {
    debug.log('Retry', 'Retrying last message');
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      setInputValue(lastUserMessage.content);
      // Remove error messages
      setMessages(prev => prev.filter(m => m.role !== 'error'));
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-surface rounded-xl border border-border-token overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-token bg-surface-2">
        <div className="flex items-center gap-2">
          <CpuChipIcon className={cn(
            "w-5 h-5",
            connectionStatus === 'connected' && "text-primary-500",
            connectionStatus === 'loading' && "text-warning-token animate-pulse",
            connectionStatus === 'error' && "text-danger-token"
          )} />
          <span className="font-medium text-fg-token">
            Testar {agentName}
          </span>
          {connectionStatus === 'error' && (
            <span className="text-xs text-danger-token ml-2">(Erro de conexão)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {sessionId && (
            <span className="text-xs text-fg-muted-token bg-surface-2 px-2 py-1 rounded">
              Session: {sessionId.slice(0, 8)}...
            </span>
          )}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showDebug ? "bg-info-soft text-info-token" : "text-fg-muted-token hover:text-info-token hover:bg-info-soft"
            )}
            title="Toggle debug mode"
          >
            <BugAntIcon className="w-4 h-4" />
          </button>
          <button aria-label="Limpar conversa de teste"
            onClick={handleClear}
            className="p-2 rounded-lg text-fg-muted-token hover:text-danger-token hover:bg-danger-soft transition-colors"
            title="Limpar conversa"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <div className="px-4 py-2 bg-slate-900 text-slate-300 text-xs font-mono border-b border-border-token">
          <div>Agent ID: {agentId || 'N/A'}</div>
          <div>Session ID: {sessionId || 'N/A'}</div>
          <div>Status: {connectionStatus}</div>
          <div>Messages: {messages.length}</div>
          <div className="mt-1 text-slate-500">Abra o console (F12) para logs detalhados</div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <CpuChipIcon className="w-16 h-16 text-fg-muted-token mb-4" />
            <p className="text-fg-muted-token mb-2">
              Inicie uma conversa com o agente
            </p>
            <p className="text-sm text-fg-muted-token">
              Envie uma mensagem para testar o comportamento do agente
            </p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <CpuChipIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
              )}
              
              {message.role === 'error' && (
                <div className="w-8 h-8 rounded-full bg-danger-soft flex items-center justify-center flex-shrink-0">
                  <ExclamationTriangleIcon className="w-4 h-4 text-danger-token" />
                </div>
              )}
              
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                message.role === 'user'
                  ? "bg-primary-600 text-white rounded-br-md"
                  : message.role === 'error'
                  ? "bg-danger-soft border border-danger-token/30 text-danger-token rounded-bl-md"
                  : "bg-surface-2 text-fg-token rounded-bl-md"
              )}>
                <p className="whitespace-pre-wrap break-words">{typeof message.content === 'string' ? message.content : message.content != null ? JSON.stringify(message.content) : ''}</p>
                
                {/* Metadata for assistant messages */}
                {message.role === 'assistant' && (message.tokens_used || message.response_time_ms) && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border-token">
                    {message.tokens_used && (
                      <span className="text-xs text-fg-muted-token">
                        {message.tokens_used} tokens
                      </span>
                    )}
                    {message.response_time_ms && (
                      <span className="flex items-center gap-1 text-xs text-fg-muted-token">
                        <ClockIcon className="w-3 h-3" />
                        {message.response_time_ms}ms
                      </span>
                    )}
                  </div>
                )}

                {/* Error details and retry button */}
                {message.role === 'error' && (
                  <div className="mt-2 pt-2 border-t border-danger-token/30">
                    {message.errorDetails?.statusCode && (
                      <div className="text-xs text-danger-token mb-1">
                        Status: {message.errorDetails.statusCode}
                      </div>
                    )}
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-1 text-xs text-danger-token hover:underline"
                    >
                      <ArrowPathIcon className="w-3 h-3" />
                      Tentar novamente
                    </button>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0">
                  <UserCircleIcon className="w-4 h-4 text-fg-muted-token" />
                </div>
              )}
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <CpuChipIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="bg-surface-2 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="w-4 h-4 text-fg-muted-token animate-spin" />
                <span className="text-sm text-fg-muted-token">
                  Pensando...
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border-token bg-surface-2">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            rows={1}
            className={cn(
              "flex-1 px-4 py-3 rounded-xl border resize-none",
              "bg-surface",
              "text-fg-token placeholder-fg-muted-token",
              "border-border-token",
              "focus:ring-2 focus:ring-brand focus:border-transparent",
              "disabled:opacity-50"
            )}
          />
          <button
            type="submit"
            aria-label="Enviar mensagem"
            disabled={isLoading || !inputValue.trim()}
            className={cn(
              "px-4 py-3 rounded-xl transition-colors",
              "bg-primary-600 hover:bg-primary-700 text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
        <p className="text-xs text-fg-muted-token mt-2 text-center">
          Pressione Enter para enviar, Shift+Enter para nova linha
          {connectionStatus === 'error' && (
            <span className="text-danger-token ml-2">• Erro de conexão detectado</span>
          )}
        </p>
      </div>
    </div>
  );
};

export default AgentChatTest;
