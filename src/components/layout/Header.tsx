import React, { useState } from 'react';
import { MagnifyingGlassIcon, Bars3Icon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useAccountStore } from '../../stores/accountStore';
import { NotificationDropdown } from '../notifications';
import { StoreSelector } from './StoreSelector';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showSearch?: boolean;
  showStoreSelector?: boolean;
  onSearch?: (query: string) => void;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  subtitle, 
  actions,
  showSearch = true,
  showStoreSelector = true,
  onSearch,
  onMenuClick,
}) => {
  const { accounts, selectedAccount, setSelectedAccount } = useAccountStore();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
          )}
          
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Store selector - Primary context */}
          {showStoreSelector && (
            <StoreSelector />
          )}

          {/* Account selector (WhatsApp accounts) */}
          {accounts.length > 0 && (
            <select
              value={selectedAccount?.id || ''}
              onChange={(e) => {
                const account = accounts.find((a) => a.id === e.target.value);
                setSelectedAccount(account || null);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#722F37] focus:border-[#722F37]"
            >
              <option value="">Todas as contas</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          )}

          {/* Search */}
          {showSearch && (
            <form onSubmit={handleSearch} className="relative hidden sm:block">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#722F37] focus:border-[#722F37] w-48 md:w-64"
              />
            </form>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={resolvedTheme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {resolvedTheme === 'dark' ? (
              <SunIcon className="w-5 h-5" />
            ) : (
              <MoonIcon className="w-5 h-5" />
            )}
          </button>

          {/* Notifications */}
          <NotificationDropdown />

          {/* Actions */}
          {actions}
        </div>
      </div>
    </header>
  );
};
