import React from 'react';
import { InboxIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="p-4 bg-surface-2 rounded-full mb-4">
        {icon || <InboxIcon className="w-8 h-8 text-fg-muted-token" />}
      </div>
      <h3 className="text-lg font-medium text-fg-token mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-fg-muted-token max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  );
};
