import React, { useState } from 'react';
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
  TruckIcon,
  Squares2X2Icon,
  XMarkIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  PresentationChartLineIcon,
  CakeIcon,
  UsersIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: string;
}

interface SidebarProps {
  onClose?: () => void;
}

// Menu organizado por seções lógicas
const navigation: NavItem[] = [
  // Principal
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Relatórios', href: '/analytics', icon: PresentationChartLineIcon },
  
  // E-commerce
  { 
    name: 'Vendas', 
    href: '/orders', 
    icon: ShoppingCartIcon,
    children: [
      { name: 'Pedidos', href: '/orders', icon: ShoppingCartIcon },
      { name: 'Pagamentos', href: '/payments', icon: CreditCardIcon },
    ]
  },
  { 
    name: 'Catálogo', 
    href: '/products', 
    icon: Squares2X2Icon,
    children: [
      { name: 'Produtos', href: '/products', icon: Squares2X2Icon },
      { name: 'Cupons', href: '/coupons', icon: TagIcon },
    ]
  },
  
  // Entrega
  { 
    name: 'Entregas', 
    href: '/delivery-zones', 
    icon: TruckIcon,
    children: [
      { name: 'Zonas de Entrega', href: '/delivery-zones', icon: MapPinIcon },
    ]
  },
  
  // Comunicação
  { 
    name: 'Comunicação', 
    href: '/conversations', 
    icon: ChatBubbleLeftRightIcon,
    children: [
      { name: 'Conversas', href: '/conversations', icon: ChatBubbleLeftRightIcon },
      { name: 'Mensagens', href: '/messages', icon: InboxIcon },
      { name: 'Contas WhatsApp', href: '/accounts', icon: DevicePhoneMobileIcon },
    ]
  },
  
  // Automação & IA
  { 
    name: 'Automação', 
    href: '/automation', 
    icon: BoltIcon,
    children: [
      { name: 'Empresas', href: '/automation/companies', icon: BuildingOfficeIcon },
      { name: 'Sessões', href: '/automation/sessions', icon: UserGroupIcon },
      { name: 'Agendamentos', href: '/automation/scheduled', icon: ClockIcon },
      { name: 'Relatórios', href: '/automation/reports', icon: DocumentChartBarIcon },
      { name: 'Logs', href: '/automation/logs', icon: DocumentTextIcon },
    ]
  },
  { name: 'Langflow (IA)', href: '/langflow', icon: CpuChipIcon },
  
  // Admin
  { name: 'Lojas', href: '/stores', icon: BuildingStorefrontIcon },
  { name: 'Configurações', href: '/settings', icon: Cog6ToothIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { logout, user } = useAuthStore();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Automação']);

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

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleExpand(item.name)}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-100`}
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
            <div className="ml-4 mt-1 space-y-1">
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
          `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isActive
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`
        }
      >
        <item.icon className="w-5 h-5 mr-3" />
        {item.name}
      </NavLink>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-64">
      {/* Logo Pastita */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#722F37] to-[#8B3A42] rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 text-lg leading-tight">Pastita</span>
            <span className="text-xs text-gray-500">Dashboard</span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => renderNavItem(item))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {user?.first_name?.[0] || user?.username?.[0] || 'U'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {user?.first_name || user?.username || 'Usuário'}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Sair"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
