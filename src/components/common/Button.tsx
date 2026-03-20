import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'solid' | 'outline' | 'ghost' | 'link' | 'primary' | 'secondary' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isDisabled?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  width?: string;
  mt?: number;
  title?: string;
}

const variantCls: Record<string, string> = {
  solid:     'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
  primary:   'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
  outline:   'bg-transparent text-primary-600 border border-primary-500 hover:bg-primary-50 active:bg-primary-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-primary-950',
  secondary: 'bg-transparent text-primary-600 border border-primary-500 hover:bg-primary-50 active:bg-primary-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-primary-950',
  ghost:     'bg-transparent text-fg-secondary hover:bg-bg-hover active:bg-bg-active focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
  link:      'bg-transparent text-primary-600 hover:underline focus-visible:ring-2 focus-visible:ring-primary-500 p-0',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
};

const sizeCls: Record<string, string> = {
  xs: 'px-2 py-1 text-xs rounded gap-1',
  sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base rounded-lg gap-2',
};

const Spinner = () => (
  <svg className="animate-spin w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'solid',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onClick,
  type = 'button',
  className,
  width,
  mt,
  title,
}) => {
  const isOff = isDisabled || disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isOff}
      onClick={onClick}
      title={title}
      style={{ width: width || undefined, marginTop: mt ? `${mt * 0.25}rem` : undefined }}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none select-none',
        variantCls[variant] ?? variantCls.solid,
        sizeCls[size] ?? sizeCls.md,
        isOff && 'opacity-60 cursor-not-allowed pointer-events-none',
        className,
      )}
    >
      {isLoading ? (
        <>
          <Spinner />
          {children && <span className="ml-1">{children}</span>}
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

export default Button;
