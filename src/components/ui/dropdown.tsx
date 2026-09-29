/**
 * Dropdown Component - Modern animated dropdown menu
 * Design inspired by Linear, Vercel, and Raycast
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  children?: DropdownItem[];
  onClick?: () => void;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right' | 'center';
  width?: 'auto' | 'trigger' | number;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'left',
  width = 'auto',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleItemClick = useCallback((item: DropdownItem) => {
    if (item.disabled) return;
    if (item.children) {
      setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
      return;
    }
    item.onClick?.();
    setIsOpen(false);
    setActiveSubmenu(null);
  }, [activeSubmenu]);

  const alignStyles = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  const getWidth = () => {
    if (width === 'auto') return 'min-w-[200px]';
    if (width === 'trigger') return 'min-w-full';
    return `w-[${width}px]`;
  };

  const renderItem = (item: DropdownItem, _isSubmenuItem = false) => {
    if (item.divider) {
      return (
        <div
          key={item.id}
          className="my-1 h-px bg-border-token"
        />
      );
    }

    const hasChildren = item.children && item.children.length > 0;
    const isSubmenuOpen = activeSubmenu === item.id;

    return (
      <div key={item.id} className="relative">
        <button
          onClick={() => handleItemClick(item)}
          onMouseEnter={() => hasChildren && setActiveSubmenu(item.id)}
          disabled={item.disabled}
          className={cn(
            // Base
            'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg',
            'transition-all duration-150 ease-out',
            // States
            !item.disabled && !item.danger && 'hover:bg-surface-2',
            !item.disabled && item.danger && 'hover:bg-danger-soft text-danger-token',
            item.disabled && 'opacity-50 cursor-not-allowed',
            // Active submenu
            isSubmenuOpen && 'bg-surface-2'
          )}
        >
          {/* Icon */}
          {item.icon && (
            <span className={cn(
              'shrink-0',
              item.danger
                ? 'text-red-500'
                : 'text-fg-muted-token'
            )}>
              {item.icon}
            </span>
          )}

          {/* Content */}
          <div className="flex-1 text-left">
            <span className={cn(
              'block font-medium',
              item.danger
                ? 'text-danger-token'
                : 'text-fg-token'
            )}>
              {item.label}
            </span>
            {item.description && (
              <span className="block text-xs text-fg-muted-token mt-0.5">
                {item.description}
              </span>
            )}
          </div>

          {/* Submenu arrow */}
          {hasChildren && (
            <ChevronRightIcon className="w-4 h-4 text-fg-muted-token" />
          )}
        </button>

        {/* Submenu */}
        {hasChildren && isSubmenuOpen && (
          <div
            className={cn(
              'absolute top-0 left-full ml-1 z-10',
              'bg-surface rounded-xl shadow-hover border border-border-token',
              'min-w-[180px] py-2 px-1',
              'animate-in fade-in slide-in-from-left-1 duration-200'
            )}
          >
            {item.children!.map((child) => renderItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={dropdownRef} className={cn('relative inline-block', className)}>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2',
            'bg-surface rounded-xl shadow-hover',
            'border border-border-token',
            'py-2 px-1',
            // Animation
            'animate-in fade-in slide-in-from-top-2 duration-200',
            // Alignment
            alignStyles[align],
            // Width
            getWidth()
          )}
        >
          {items.map((item) => renderItem(item))}
        </div>
      )}
    </div>
  );
};

// Dropdown Trigger Button Component
export interface DropdownButtonProps {
  children: React.ReactNode;
  className?: string;
}

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  children,
  className,
}) => {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2',
        'text-sm font-medium text-fg-token',
        'bg-surface border border-border-token',
        'rounded-lg shadow-sm',
        'hover:bg-surface-2',
        'focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2',
        'transition-all duration-150',
        className
      )}
    >
      {children}
      <ChevronDownIcon className="w-4 h-4" />
    </button>
  );
};

export default Dropdown;
