import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<TextareaProps['size']>, string> = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

export const Textarea: React.FC<TextareaProps> = ({
  size = 'md',
  className = '',
  ...props
}) => {
  return (
    <textarea
      className={`w-full border border-border-token rounded-lg focus:ring-2 focus:ring-brand bg-surface text-fg-token placeholder-gray-400 dark:placeholder-zinc-500 resize-y ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
};

export default Textarea;
