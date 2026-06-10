import React, { useState, useMemo, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleBottomCenterTextIcon,
  InboxIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  CpuChipIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BoltIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TagIcon,
  Squares2X2Icon,
  XMarkIcon,
  BuildingStorefrontIcon,
  MegaphoneIcon,
  SparklesIcon,
  LinkIcon,
  DocumentTextIcon,
  DocumentChartBarIcon,
  EnvelopeIcon,
  PlusIcon,
  BuildingOfficeIcon,
  ClockIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useStore } from '../../hooks/useStore';
import { useTotalUnreadCount, useWsConnected } from '../../stores/chatStore';
import { cn } from '../../utils/cn';

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

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { logout, user } = useAuthStore();
  const { store } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const totalUnreadCount = useTotalUnreadCount();
  const wsConnected = useWsConnected();

  const storeKey = store?.slug || store?.id || null;
  const storeRoot = storeKey ? `/stores/${storeKey}` : '/stores';
  const storeHref = useMemo(() => {
    return (path: string) => (storeKey ? `${storeRoot}/${path}` : '/stores');
  }, [storeKey, storeRoot]);

  const navigationSections: NavSection[] = useMemo(() => [
    {
      title: 'Operação',
      items: [
        { name: 'Dashboard', href: '/', icon: HomeIcon },
        { name: 'Pedidos', href: storeHref('orders'), icon: ShoppingCartIcon },
        {
          name: 'WhatsApp',
          href: '/whatsapp/inbox',
          icon: DevicePhoneMobileIcon,
          badge: totalUnreadCount > 0 ? String(totalUnreadCount) : undefined,
        },
        {
          name: 'Conversas',
          href: '/conversations',
          icon: ChatBubbleLeftRightIcon,
        },
        { name: 'Clientes', href: storeHref('customers'), icon: UserGroupIcon },
      ]
    },
    {
      title: 'Catálogo',
      items: [
        { name: 'Produtos', href: storeHref('products'), icon: Squares2X2Icon },
        { name: 'Combos', href: storeHref('combos'), icon: ShoppingCartIcon },
        { name: 'Cupons', href: storeHref('coupons'), icon: TagIcon },
        { name: 'Storefront', href: storeHref('storefront'), icon: BuildingStorefrontIcon },
      ]
    },
    {
      title: 'Análise',
      items: [
        {
          name: 'Relatórios',
          href: '/analytics',
          icon: PresentationChartLineIcon,
          children: [
            { name: 'Visão Geral', href: '/analytics', icon: PresentationChartLineIcon },
          ],
        },
      ],
    },
    {
      title: 'Ferramentas',
      items: [
        {
          name: 'Marketing',
          href: '/marketing',
          icon: MegaphoneIcon,
          children: [
            { name: 'Campanhas WhatsApp', href: '/marketing/whatsapp', icon: DevicePhoneMobileIcon },
            { name: 'Templates', href: '/marketing/whatsapp/templates', icon: DocumentTextIcon },
            ...(user?.is_staff
              ? [
                  { name: 'Campanhas Email', href: '/marketing/email/campaigns', icon: EnvelopeIcon },
                  { name: 'Assinantes', href: '/marketing/subscribers', icon: UserGroupIcon },
                ]
              : []),
          ]
        },
        ...(user?.is_staff
          ? [{
              name: 'Agentes IA',
              href: '/agents',
              icon: CpuChipIcon,
              badge: 'IA',
              children: [
                { name: 'Lista de Agentes', href: '/agents', icon: CpuChipIcon },
                { name: 'Novo Agente', href: '/agents/new', icon: PlusIcon },
                { name: 'Intenções', href: '/automation/intents/stats', icon: SparklesIcon },
                { name: 'Logs', href: '/automation/logs', icon: DocumentChartBarIcon },
              ]
            }]
          : []),
        {
          name: 'Canais',
          href: '/connections',
          icon: LinkIcon,
          children: [
            { name: 'Conexões', href: '/connections', icon: LinkIcon },
            { name: 'Handover', href: '/whatsapp/handover', icon: UserGroupIcon },
            ...(user?.is_staff
              ? [
                  { name: 'Instagram', href: '/instagram/inbox', icon: ChatBubbleLeftRightIcon },
                  { name: 'Messenger', href: '/messenger/inbox', icon: ChatBubbleBottomCenterTextIcon },
                ]
              : []),
          ]
        },
        {
          name: 'Configurações',
          href: '/stores',
          icon: Cog6ToothIcon,
          children: [
            { name: 'Lojas', href: '/stores', icon: BuildingStorefrontIcon },
            { name: 'Configurações da Loja', href: storeHref('settings'), icon: Cog6ToothIcon },
            { name: 'Pagamentos', href: storeHref('payments'), icon: CreditCardIcon },
            { name: 'Sistema', href: '/settings', icon: Cog6ToothIcon },
          ]
        },
      ]
    },
  ], [storeHref, totalUnreadCount]);

  const filteredSections = navigationSections;

  // Dynamic brand info based on selected store
  const brandInfo = useMemo(() => {
    if (!store) return {
      name: 'Painel',
      logo: null,
      primaryColor: '#6366f1',
      secondaryColor: '#4f46e5',
      initial: 'P',
    };
    return {
      name: store.name,
      logo: store.logo_url || null,
      primaryColor: store.primary_color || '#6366f1',
      secondaryColor: store.secondary_color || '#4f46e5',
      initial: store.name?.[0]?.toUpperCase() || 'L',
    };
  }, [store]);

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  useEffect(() => {
    const activeParents = navigationSections
      .flatMap((section) => section.items)
      .filter((item) => item.children?.some((child) => location.pathname.startsWith(child.href)))
      .map((item) => item.name);

    if (activeParents.length === 0) return;
    setExpandedItems((prev) => Array.from(new Set([...prev, ...activeParents])));
  }, [location.pathname, navigationSections]);

  const isItemActive = (item: NavItem): boolean => {
    if (location.pathname === item.href) return true;
    if (item.children) {
      return item.children.some(child => location.pathname.startsWith(child.href));
    }
    return false;
  };

  const renderNavItem = (item: NavItem, depth = 0, isPrimary = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const isActive = isItemActive(item);

    const primaryActive = 'bg-primary-50 dark:bg-zinc-900 text-primary-700 dark:text-primary-400 font-semibold';
    const primaryIdle   = 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800';
    const secondaryActive = 'bg-primary-50 dark:bg-zinc-900 text-primary-700 dark:text-primary-400';
    const secondaryIdle   = 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white';

    const itemClass = (active: boolean) => [
      'w-full flex items-center justify-between rounded-lg transition-colors',
      isPrimary ? 'px-3 py-2.5 text-sm' : 'px-3 py-2 text-sm',
      active ? (isPrimary ? primaryActive : secondaryActive) : (isPrimary ? primaryIdle : secondaryIdle),
    ].join(' ');

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button onClick={() => toggleExpand(item.name)} className={itemClass(isActive)}>
            <div className="flex items-center gap-3">
              <item.icon className={isPrimary ? 'w-5 h-5' : 'w-4 h-4'} />
              <span>{item.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {item.badge && (
                <span className="text-[10px] font-bold bg-primary-100 dark:bg-zinc-800 text-primary-700 dark:text-primary-400 px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {isExpanded
                ? <ChevronDownIcon className="w-3.5 h-3.5 opacity-50" />
                : <ChevronRightIcon className="w-3.5 h-3.5 opacity-50" />
              }
            </div>
          </button>
          {isExpanded && (
            <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-gray-100 dark:border-zinc-800 pl-3">
              {item.children!.map(child => renderNavItem(child, depth + 1, false))}
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
        className={({ isActive: active }) => itemClass(active)}
      >
        <div className="flex items-center gap-3">
          <item.icon className={isPrimary ? 'w-5 h-5' : 'w-4 h-4'} />
          <span>{item.name}</span>
        </div>
        {item.badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            /^\d+$/.test(item.badge)
              ? 'bg-red-500 text-white min-w-[18px] text-center'
              : 'bg-primary-100 dark:bg-zinc-800 text-primary-700 dark:text-primary-400'
          }`}>
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white/90 dark:bg-black/90 backdrop-blur-xl border-r border-white/40 dark:border-zinc-800 w-64 transition-colors">
      {/* Dynamic Logo based on selected store */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200/80 dark:border-zinc-800">
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
            <span className="text-xs text-gray-500 dark:text-zinc-400">Dashboard</span>
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

      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 dark:text-zinc-500">
            {store?.name || 'Loja'}
          </span>
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} title={wsConnected ? 'Conectado' : 'Desconectado'} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto smooth-scroll">
        {filteredSections.map((section, index) => {
          const isPrimary = section.title === 'Operação';
          return (
            <div key={section.title} className={cn('animate-fade-up', index > 0 ? 'mt-4' : '')}>
              <h3 className="px-3 mb-1.5 text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest">
                {section.title}
              </h3>
              <div className={isPrimary ? 'space-y-0.5' : 'space-y-0.5'}>
                {section.items.map((item) => renderNavItem(item, 0, isPrimary))}
              </div>
            </div>
          );
        })}
        {filteredSections.length === 0 && (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Nenhum item encontrado
            </p>
          </div>
        )}
      </nav>

      {/* User section */}
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
                {user?.first_name || user?.username || 'Usuário'}
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
