import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowPathIcon,
  ChartBarIcon,
  BoltIcon,
  CpuChipIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { DateRange } from 'react-date-range';
import { ptBR } from 'date-fns/locale';
import { format, subDays } from 'date-fns';
import { toast } from 'react-hot-toast';
import { cn } from '../../utils/cn';
import { Loading } from '../../components/common/Loading';
import { intentService, intentTypeLabels } from '../../services';
import type { IntentStats, IntentType } from '../../types';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  className,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600',
  };

  return (
    <div className={cn('bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-2">{value}</h3>
          {subtitle && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-sm',
              trend === 'up' && 'text-green-600 dark:text-green-400',
              trend === 'down' && 'text-red-600 dark:text-red-400',
              trend === 'neutral' && 'text-zinc-500 dark:text-zinc-400'
            )}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {trend === 'neutral' && '→'}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', colorClasses[color])}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Labels para métodos de detecção
const methodLabels: Record<string, string> = {
  regex: 'Regex/Handler',
  llm: 'LLM/IA',
  none: 'Nenhum',
  handler: 'Handler',
  automessage: 'AutoMessage',
  fallback: 'Fallback',
};

// Cores para métodos
const methodColors: Record<string, 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow'> = {
  regex: 'green',
  handler: 'green',
  llm: 'purple',
  automessage: 'blue',
  none: 'red',
  fallback: 'orange',
};

// Ícones para métodos
const methodIcons: Record<string, React.ReactNode> = {
  regex: <BoltIcon className="w-6 h-6" />,
  handler: <CogIcon className="w-6 h-6" />,
  llm: <CpuChipIcon className="w-6 h-6" />,
  automessage: <DocumentTextIcon className="w-6 h-6" />,
  none: <ExclamationCircleIcon className="w-6 h-6" />,
  fallback: <ExclamationCircleIcon className="w-6 h-6" />,
};

export const IntentStatsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const [stats, setStats] = useState<IntentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState([
    {
      startDate: subDays(new Date(), 7),
      endDate: new Date(),
      key: 'selection',
    },
  ]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await intentService.getStats({
        start_date: format(dateRange[0].startDate, 'yyyy-MM-dd'),
        end_date: format(dateRange[0].endDate, 'yyyy-MM-dd'),
        company_id: companyId,
      });
      setStats(data);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [dateRange, companyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 dark:text-zinc-400">
          Nenhuma estatística disponível para o período selecionado.
        </p>
      </div>
    );
  }

  // Calcula porcentagens para todos os métodos
  const methodStats = stats.by_method || {};
  const methodPercentages = Object.entries(methodStats).map(([method, count]) => ({
    method,
    count: count as number,
    percentage: stats.total_detected > 0
      ? (((count as number) / stats.total_detected) * 100).toFixed(1)
      : '0',
  })).sort((a, b) => b.count - a.count);

  // Top intenções
  const topIntents = stats.top_intents || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Estatísticas de Intenções
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Análise de detecção de intenções do sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Picker */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={cn(
                'px-4 py-2 rounded-lg border text-sm font-medium',
                'border-zinc-300 dark:border-zinc-600',
                'bg-white dark:bg-zinc-800',
                'text-zinc-700 dark:text-zinc-300',
                'hover:bg-zinc-50 dark:hover:bg-zinc-700',
                'transition-colors'
              )}
            >
              {format(dateRange[0].startDate, 'dd/MM/yyyy')} - {format(dateRange[0].endDate, 'dd/MM/yyyy')}
            </button>
            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 z-50">
                <DateRange
                  ranges={dateRange}
                  onChange={(item: any) => {
                    setDateRange([item.selection]);
                    setShowDatePicker(false);
                  }}
                  locale={ptBR}
                  maxDate={new Date()}
                />
              </div>
            )}
          </div>
          <button
            onClick={loadStats}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            title="Atualizar"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Grid - Total e Tempo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total de Intenções"
          value={stats.total_detected.toLocaleString()}
          subtitle="Mensagens processadas"
          icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Tempo Médio"
          value={`${(stats.avg_response_time_ms / 1000).toFixed(2)}s`}
          subtitle="Tempo de resposta"
          icon={<ChartBarIcon className="w-6 h-6" />}
          color="orange"
        />
        <StatCard
          title="Intenções Únicas"
          value={Object.keys(stats.by_type || {}).length}
          subtitle="Tipos detectados"
          icon={<CheckCircleIcon className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Métodos Usados"
          value={Object.keys(methodStats).length}
          subtitle="Fontes de resposta"
          icon={<CogIcon className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Methods Grid - Todos os métodos */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          Métodos de Detecção
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {methodPercentages.map(({ method, count, percentage }) => (
            <StatCard
              key={method}
              title={methodLabels[method] || method}
              value={`${percentage}%`}
              subtitle={`${count.toLocaleString()} mensagens`}
              icon={methodIcons[method] || <BoltIcon className="w-6 h-6" />}
              color={methodColors[method] || 'blue'}
            />
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Intents by Type */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Intenções por Tipo
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.by_type || {})
              .sort(([,a], [,b]) => (b as number) - (a as number))
              .slice(0, 10)
              .map(([intent, count]) => {
                const percentage = stats.total_detected > 0
                  ? (((count as number) / stats.total_detected) * 100).toFixed(1)
                  : '0';
                return (
                  <div key={intent} className="flex items-center gap-4">
                    <div className="w-40 text-sm text-zinc-600 dark:text-zinc-400 truncate">
                      {intentTypeLabels[intent] || intent}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right text-sm text-zinc-600 dark:text-zinc-400">
                      {count as number} ({percentage}%)
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Top Intents */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Top Intenções
          </h3>
          {topIntents.length > 0 ? (
            <div className="space-y-4">
              {topIntents.slice(0, 5).map((item, index) => (
                <div
                  key={item.intent}
                  className="flex items-center gap-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-700/50"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    index === 0 && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                    index === 1 && 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                    index === 2 && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                    index > 2 && 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {intentTypeLabels[item.intent] || item.intent}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {item.count.toLocaleString()} detecções
                    </p>
                  </div>
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">
              Nenhuma intenção registrada ainda.
            </p>
          )}
        </div>
      </div>

      {/* Method Comparison */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          Comparação de Métodos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {methodPercentages.map(({ method, count, percentage }) => (
            <div 
              key={method}
              className={cn(
                'p-4 rounded-lg',
                method === 'regex' || method === 'handler' ? 'bg-green-50 dark:bg-green-900/20' :
                method === 'llm' ? 'bg-purple-50 dark:bg-purple-900/20' :
                method === 'automessage' ? 'bg-blue-50 dark:bg-blue-900/20' :
                'bg-zinc-50 dark:bg-zinc-800'
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  'p-2 rounded-lg',
                  method === 'regex' || method === 'handler' ? 'bg-green-100 text-green-600' :
                  method === 'llm' ? 'bg-purple-100 text-purple-600' :
                  method === 'automessage' ? 'bg-blue-100 text-blue-600' :
                  'bg-zinc-100 text-zinc-600'
                )}>
                  {methodIcons[method] || <BoltIcon className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className={cn(
                    'font-semibold',
                    method === 'regex' || method === 'handler' ? 'text-green-900 dark:text-green-100' :
                    method === 'llm' ? 'text-purple-900 dark:text-purple-100' :
                    method === 'automessage' ? 'text-blue-900 dark:text-blue-100' :
                    'text-zinc-900 dark:text-zinc-100'
                  )}>
                    {methodLabels[method] || method}
                  </h4>
                  <p className={cn(
                    'text-sm',
                    method === 'regex' || method === 'handler' ? 'text-green-600 dark:text-green-400' :
                    method === 'llm' ? 'text-purple-600 dark:text-purple-400' :
                    method === 'automessage' ? 'text-blue-600 dark:text-blue-400' :
                    'text-zinc-600 dark:text-zinc-400'
                  )}>
                    {percentage}% ({count} mensagens)
                  </p>
                </div>
              </div>
              <p className={cn(
                'text-sm mt-2',
                method === 'regex' || method === 'handler' ? 'text-green-700 dark:text-green-300' :
                method === 'llm' ? 'text-purple-700 dark:text-purple-300' :
                method === 'automessage' ? 'text-blue-700 dark:text-blue-300' :
                'text-zinc-700 dark:text-zinc-300'
              )}>
                {method === 'regex' || method === 'handler' ? 'Detecção rápida baseada em padrões predefinidos. Sem custo de API.' :
                 method === 'llm' ? 'Detecção avançada usando Inteligência Artificial. Usado como fallback.' :
                 method === 'automessage' ? 'Respostas automáticas configuradas para eventos específicos.' :
                 'Método de detecção alternativo.'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IntentStatsPage;
