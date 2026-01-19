import React, { useState, useMemo, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  InboxIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  CpuChipIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BoltIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentChartBarIcon,
  TagIcon,

  Squares2X2Icon,
  XMarkIcon,
  BuildingStorefrontIcon,
  PresentationChartLineIcon,
  MegaphoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useStore } from '../../hooks/useStore';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: string;
  section?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  onClose?: () => void;
}

// Menu organizado por seções lógicas
const navigationSections: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { name: 'Dashboard', href: '/', icon: HomeIcon },
      { name: 'Pedidos', href: '/orders', icon: ShoppingCartIcon, badge: 'Kanban' },
    ]
  },
  {
    title: 'Catálogo',
    items: [
      { name: 'Produtos', href: '/products', icon: Squares2X2Icon },
      { name: 'Cupons', href: '/coupons', icon: TagIcon },
    ]
  },
  {
    title: 'Marketing',
    items: [
      { name: 'Campanhas', href: '/marketing', icon: MegaphoneIcon },
      { name: 'Email Marketing', href: '/marketing/email', icon: EnvelopeIcon },
      { name: 'Automações', href: '/marketing/automations', icon: BoltIcon },
      { name: 'Contatos', href: '/marketing/subscribers', icon: UserGroupIcon },
      { name: 'WhatsApp Marketing', href: '/marketing/whatsapp', icon: DevicePhoneMobileIcon },
    ]
  },
  {
    title: 'Comunicação',
    items: [
      { name: 'Conversas', href: '/conversations', icon: ChatBubbleLeftRightIcon },
      { name: 'Mensagens', href: '/messages', icon: InboxIcon },
      { name: 'Contas WhatsApp', href: '/accounts', icon: DevicePhoneMobileIcon },
    ]
  },
  {
    title: 'Automação & IA',
    items: [
      { name: 'Langflow (IA)', href: '/langflow', icon: CpuChipIcon },
      { 
        name: 'Automação', 
        href: '/automation/companies', 
        icon: BoltIcon,
        children: [
          { name: 'Empresas', href: '/automation/companies', icon: BuildingOfficeIcon },
          { name: 'Sessões', href: '/automation/sessions', icon: UserGroupIcon },
          { name: 'Agendamentos', href: '/automation/scheduled', icon: ClockIcon },
          { name: 'Relatórios', href: '/automation/reports', icon: DocumentChartBarIcon },
          { name: 'Logs', href: '/automation/logs', icon: DocumentTextIcon },
        ]
      },
    ]
  },
  {
    title: 'Administração',
    items: [
      { name: 'Lojas', href: '/stores', icon: BuildingStorefrontIcon },
      { name: 'Relatórios', href: '/analytics', icon: PresentationChartLineIcon },
      { name: 'Pagamentos', href: '/payments', icon: CreditCardIcon },
      { name: 'Configurações', href: '/settings', icon: Cog6ToothIcon },
    ]
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { logout, user } = useAuthStore();
  const { store, storeName } = useStore();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Dynamic brand info based on selected store
  const brandInfo = useMemo(() => {
    // Default Pastita branding with logo from pastita.com.br
    const defaultBrand = {
      name: 'Pastita',
      logo: 'https://pastita.com.br/pastita-logo.ico',
      primaryColor: '#722F37',
      secondaryColor: '#8B3A42',
      initial: 'P',
    };

    if (!store) return defaultBrand;

    // Check if it's Agrião based on store name or slug
    const isAgriao = store.name?.toLowerCase().includes('agriao') || 
                     store.slug?.toLowerCase().includes('agriao');

    if (isAgriao) {
      return {
        name: store.name || 'Agrião',
        logo: store.logo_url || null,
        primaryColor: '#4A5D23',
        secondaryColor: '#6B8E23',
        initial: 'A',
      };
    }

    // For Pastita stores, always use the official logo
    const isPastita = store.name?.toLowerCase().includes('pastita') || 
                      store.slug?.toLowerCase().includes('pastita');

    return {
      name: store.name || 'Pastita',
      logo: isPastita ? 'https://pastita.com.br/pastita-logo.ico' : (store.logo_url || null),
      primaryColor: store.primary_color || '#722F37',
      secondaryColor: store.secondary_color || '#8B3A42',
      initial: store.name?.[0]?.toUpperCase() || 'P',
    };
  }, [store]);

  // Apply theme based on store
  useEffect(() => {
    const isAgriao = store?.name?.toLowerCase().includes('agriao') || 
                     store?.slug?.toLowerCase().includes('agriao');
    
    if (isAgriao) {
      document.documentElement.setAttribute('data-theme', 'agriao');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [store]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const toggleExpand = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  const isItemActive = (item: NavItem): boolean => {
    if (location.pathname === item.href) return true;
    if (item.children) {
      return item.children.some(child => location.pathname.startsWith(child.href));
    }
    return false;
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const isActive = isItemActive(item);

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleExpand(item.name)}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive 
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center">
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </div>
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 dark:border-gray-700 pl-2">
              {item.children!.map(child => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.name}
        to={item.href}
        end={item.href === '/'}
        onClick={handleNavClick}
        className={({ isActive }) =>
          `flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isActive
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`
        }
      >
        <div className="flex items-center">
          <item.icon className="w-5 h-5 mr-3" />
          {item.name}
        </div>
        {item.badge && (
          <span className="text-xs bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 w-64 transition-colors">
      {/* Dynamic Logo based on selected store */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {brandInfo.logo ? (
            <img 
              src={brandInfo.logo} 
              alt={brandInfo.name}
              className="w-10 h-10 rounded-xl object-cover shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div 
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 ${brandInfo.logo ? 'hidden' : ''}`}
            style={{ 
              background: `linear-gradient(135deg, ${brandInfo.primaryColor} 0%, ${brandInfo.secondaryColor} 100%)` 
            }}
          >
            <span className="text-white font-bold text-lg">{brandInfo.initial}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 dark:text-white text-lg leading-tight truncate max-w-[120px]">
              {brandInfo.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Dashboard</span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg lg:hidden transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navigationSections.map((section, index) => (
          <div key={section.title} className={index > 0 ? 'mt-6' : ''}>
            <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => renderNavItem(item))}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                {user?.first_name?.[0] || user?.username?.[0] || 'U'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.first_name || user?.username || 'Usuário'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Sair"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
