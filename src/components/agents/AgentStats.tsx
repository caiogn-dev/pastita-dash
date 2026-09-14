import React from 'react';
import { 
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  ClockIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface AgentStatsProps {
  stats: {
    total_conversations: number;
    total_messages: number;
    avg_response_time_ms: number;
    active_sessions: number;
  };
  isLoading?: boolean;
}

export const AgentStats: React.FC<AgentStatsProps> = ({ stats, isLoading }) => {
  const statItems = [
    {
      label: 'Conversas Totais',
      value: stats.total_conversations,
      icon: ChatBubbleLeftRightIcon,
      color: 'text-info-token bg-info-soft',
    },
    {
      label: 'Mensagens Totais',
      value: stats.total_messages,
      icon: EnvelopeIcon,
      color: 'text-success-token bg-success-soft',
    },
    {
      label: 'Tempo Médio de Resposta',
      value: `${Math.round(stats.avg_response_time_ms)}ms`,
      icon: ClockIcon,
      color: 'text-warning-token bg-warning-soft',
    },
    {
      label: 'Sessões Ativas',
      value: stats.active_sessions,
      icon: BoltIcon,
      color: 'text-brand-ink bg-brand-soft',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 max-lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-surface rounded-xl p-5 border border-border-token animate-pulse">
            <div className="w-10 h-10 rounded-lg bg-surface-2 mb-3" />
            <div className="h-8 w-20 bg-surface-2 rounded mb-2" />
            <div className="h-4 w-24 bg-surface-2 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 max-lg:grid-cols-2 gap-4">
      {statItems.map((item, index) => (
        <div 
          key={index}
          className="bg-surface rounded-xl p-5 border border-border-token hover:shadow-md transition-shadow"
        >
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", item.color)}>
            <item.icon className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-fg-token mb-1">
            {item.value}
          </div>
          <div className="text-sm text-fg-muted-token">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgentStats;
