import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number | null;
  changeSuffix?: string;
  changeIsAbsolute?: boolean;
  icon: React.ElementType;
  iconClass?: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeSuffix = '%',
  changeIsAbsolute = false,
  icon: Icon,
  iconClass = 'text-blue-500',
  loading,
}) => {
  const isPositive = (change ?? 0) >= 0;
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-4 flex justify-between items-start hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-fg-muted">{title}</span>
        {loading ? (
          <div className="h-8 w-24 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
        ) : (
          <span className="text-2xl font-bold text-fg-primary">{value}</span>
        )}
        {subtitle && <span className="text-xs text-fg-muted">{subtitle}</span>}
        {change !== undefined && change !== null && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive
              ? <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
              : <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />}
            <span className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}
              {changeIsAbsolute ? change : `${change.toFixed(1)}${changeSuffix}`}
            </span>
            <span className="text-xs text-fg-muted">vs anterior</span>
          </div>
        )}
      </div>
      <div className={`p-2 rounded-xl bg-bg-secondary ${iconClass}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};

export default StatCard;
