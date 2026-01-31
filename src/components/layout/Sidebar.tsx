import React, { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  InboxIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  UserGroupIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  UserCircleIcon,
  ClockIcon,
  MegaphoneIcon,
  BuildingStorefrontIcon,
  TicketIcon,
  CpuChipIcon,
  CameraIcon,
  TruckIcon,
  EnvelopeIcon,
  ChartPieIcon,
  PuzzlePieceIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useStore } from '../../hooks/useStore';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: string;
  requiresStore?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { logout, user } = useAuthStore();
  const { store, storeSlug, isStoreSelected } = useStore();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Build store-based URLs
  const getStoreUrl = (path: string): string => {
    if (!isStoreSelected || !storeSlug) {
      return '/stores';
    }
    return `/stores/${storeSlug}/${path}`;
  };

  const navigationSections: NavSection[] = useMemo(() => {
    const hasStore = isStoreSelected && storeSlug;

    return [
      {
        title: 'Operacional',
        items: [
          { name: 'Dashboard', href: '/', icon: HomeIcon },
          { 
            name: 'Pedidos', 
            href: hasStore ? getStoreUrl('orders') : '/stores', 
            icon: ShoppingCartIcon, 
            badge: 'Kanban',
            requiresStore: true 
          },
          { 
            name: 'Pagamentos', 
            href: hasStore ? getStoreUrl('payments') : '/stores', 
            icon: CurrencyDollarIcon,
            requiresStore: true 
          },
          {
            name: 'WhatsApp',
            href: '/accounts',
            icon: DevicePhoneMobileIcon,
            children: [
              { name: 'Conversas', href: '/conversations', icon: ChatBubbleLeftRightIcon },
              { name: 'Mensagens', href: '/messages', icon: InboxIcon },
              { name: 'Contas', href: '/accounts', icon: DevicePhoneMobileIcon },
              { name: 'Diagnostico', href: '/whatsapp/diagnostics', icon: WrenchScrewdriverIcon },
            ],
          },
          {
            name: 'Instagram',
            href: '/instagram',
            icon: CameraIcon,
            children: [
              { name: 'Contas', href: '/instagram/accounts', icon: CameraIcon },
              { name: 'Inbox', href: '/instagram/inbox', icon: InboxIcon },
            ],
          },
        ],
      },
      {
        title: 'Gestao',
        items: [
          { 
            name: 'Produtos', 
            href: hasStore ? getStoreUrl('products') : '/stores', 
            icon: Squares2X2Icon,
            requiresStore: true 
          },
          { 
            name: 'Cupons', 
            href: hasStore ? getStoreUrl('coupons') : '/stores', 
            icon: TicketIcon,
            requiresStore: true 
          },
          { 
            name: 'Entrega', 
            href: hasStore ? getStoreUrl('delivery') : '/stores', 
            icon: TruckIcon,
            requiresStore: true 
          },
          { name: 'Clientes', href: '/marketing/subscribers', icon: UserGroupIcon },
          { 
            name: 'Relatorios', 
            href: hasStore ? getStoreUrl('analytics') : '/reports', 
            icon: DocumentChartBarIcon,
            requiresStore: true 
          },
        ],
      },
      {
        title: 'Marketing',
        items: [
          {
            name: 'Campanhas',
            href: '/marketing',
            icon: MegaphoneIcon,
            children: [
              { name: 'Dashboard', href: '/marketing', icon: ChartPieIcon },
              { name: 'Email', href: '/marketing/email', icon: EnvelopeIcon },
              { name: 'WhatsApp', href: '/marketing/whatsapp', icon: DevicePhoneMobileIcon },
              { name: 'Automacoes', href: '/marketing/automations', icon: PuzzlePieceIcon },
            ],
          },
          { name: 'Assinantes', href: '/marketing/subscribers', icon: UserGroupIcon },
        ],
      },
      {
        title: 'Automacao',
        items: [
          { name: 'Langflow', href: '/langflow', icon: CpuChipIcon },
          { name: 'Empresas', href: '/automation/companies', icon: BuildingOfficeIcon },
          { name: 'Mensagens Auto', href: '/automation/companies/1/messages', icon: ChatBubbleLeftRightIcon },
          { name: 'Sessoes', href: '/automation/sessions', icon: UserCircleIcon },
          { name: 'Agendadas', href: '/automation/scheduled', icon: ClockIcon },
          { name: 'Logs', href: '/automation/logs', icon: DocumentTextIcon },
        ],
      },
      {
        title: 'Sistema',
        items: [
          { name: 'Lojas', href: '/stores', icon: BuildingStorefrontIcon },
          { name: 'Configuracoes', href: '/settings', icon: Cog6ToothIcon },
        ],
      },
    ];
  }, [isStoreSelected, storeSlug]);

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
                ? 'bg-primary-50 dark:bg-zinc-900 text-primary-700 dark:text-primary-400' 
                : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
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
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 dark:border-zinc-800 pl-2">
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
              ? 'bg-primary-50 dark:bg-zinc-900 text-primary-700 dark:text-primary-400'
              : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`
        }
      >
        <div className="flex items-center">
          <item.icon className="w-5 h-5 mr-3" />
          {item.name}
        </div>
        {item.badge && (
          <span className="text-xs bg-primary-100 dark:bg-zinc-800 text-primary-700 dark:text-primary-400 px-1.5 py-0.5 rounded">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black border-r border-gray-200 dark:border-zinc-800 w-64 transition-colors">
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-primary-600 to-primary-700"
          >
            <span className="text-white font-bold text-lg">{store?.name?.[0] || 'P'}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 dark:text-white text-lg leading-tight truncate max-w-[120px]">
              {store?.name || 'Pastita'}
            </span>
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              {isStoreSelected ? 'Loja ativa' : 'Selecione uma loja'}
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg lg:hidden transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

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

      <div className="p-4 border-t border-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-400">
                {user?.first_name?.[0] || user?.username?.[0] || 'U'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.first_name || user?.username || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 truncate max-w-[120px]">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            title="Sair"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
