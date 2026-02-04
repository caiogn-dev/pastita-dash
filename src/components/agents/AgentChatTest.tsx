import React, { useState, useRef, useEffect } from 'react';
import { 
  PaperAirplaneIcon,
  TrashIcon,
  ArrowPathIcon,
  UserCircleIcon,
  CpuChipIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens_used?: number;
  response_time_ms?: number;
}

interface AgentChatTestProps {
  agentName: string;
  onSendMessage: (message: string, sessionId?: string) => Promise<{
    response: string;
    session_id: string;
    tokens_used?: number;
    response_time_ms?: number;
  }>;
  onClearChat?: () => void;
  initialSessionId?: string;
}

export const AgentChatTest: React.FC<AgentChatTestProps> = ({
  agentName,
  onSendMessage,
  onClearChat,
  initialSessionId,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await onSendMessage(userMessage.content, sessionId);
      
      setSessionId(response.session_id);
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        tokens_used: response.tokens_used,
        response_time_ms: response.response_time_ms,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Erro ao processar mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
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
    setMessages([]);
    setSessionId(undefined);
    onClearChat?.();
  };

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <CpuChipIcon className="w-5 h-5 text-primary-500" />
          <span className="font-medium text-zinc-900 dark:text-white">
            Testar {agentName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {sessionId && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-2 py-1 rounded">
              Session: {sessionId.slice(0, 8)}...
            </span>
          )}
          <button
            onClick={handleClear}
            className="p-2 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            title="Limpar conversa"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <CpuChipIcon className="w-16 h-16 text-zinc-200 dark:text-zinc-700 mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400 mb-2">
              Inicie uma conversa com o agente
            </p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
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
              
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                message.role === 'user'
                  ? "bg-primary-600 text-white rounded-br-md"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-bl-md"
              )}>
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                
                {/* Metadata for assistant messages */}
                {message.role === 'assistant' && (message.tokens_used || message.response_time_ms) && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    {message.tokens_used && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {message.tokens_used} tokens
                      </span>
                    )}
                    {message.response_time_ms && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <ClockIcon className="w-3 h-3" />
                        {message.response_time_ms}ms
                      </span>
                    )}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <UserCircleIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
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
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="w-4 h-4 text-zinc-500 animate-spin" />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Pensando...
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
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
              "bg-white dark:bg-zinc-800",
              "text-zinc-900 dark:text-white placeholder-zinc-400",
              "border-zinc-200 dark:border-zinc-700",
              "focus:ring-2 focus:ring-primary-500 focus:border-transparent",
              "disabled:opacity-50"
            )}
          />
          <button
            type="submit"
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
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 text-center">
          Pressione Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
};

export default AgentChatTest;
