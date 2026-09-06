/**
 * Store Detail Page
 * 
 * Comprehensive store management page with tabs for:
 * - Overview/Dashboard
 * - Products
 * - Orders
 * - Coupons
 * - Delivery Zones
 * - Settings
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Cog6ToothIcon,
  CubeIcon,
  ShoppingCartIcon,
  TagIcon,
  TruckIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Badge, Loading, Modal } from '../../components/common';
import storesApi, { Store, StoreStats } from '../../services/storesApi';
import { useRootStore } from '../../stores/rootStore';
import logger from '../../services/logger';
import { PageShell, KpiGrid } from '../../components/ui';

type TabId = 'overview' | 'products' | 'combos' | 'orders' | 'coupons' | 'delivery' | 'settings' | 'storefront';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Visão Geral', icon: ChartBarIcon },
  { id: 'products', label: 'Produtos', icon: CubeIcon, path: 'products' },
  { id: 'combos', label: 'Combos', icon: CubeIcon, path: 'combos' },
  { id: 'orders', label: 'Pedidos', icon: ShoppingCartIcon, path: 'orders' },
  { id: 'coupons', label: 'Cupons', icon: TagIcon, path: 'coupons' },
  { id: 'delivery', label: 'Entrega', icon: TruckIcon, path: 'delivery' },
  { id: 'settings', label: 'Configurações', icon: Cog6ToothIcon, path: 'settings' },
  { id: 'storefront', label: 'Storefront', icon: BuildingStorefrontIcon, path: 'storefront' },
];

export const StoreDetailPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { setSelectedStore } = useRootStore();
  
  const [store, setStore] = useState<Store | null>(null);
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadStore = useCallback(async () => {
    if (!storeId) return;
    
    try {
      setLoading(true);
      const [storeData, statsData] = await Promise.all([
        storesApi.getStore(storeId),
        storesApi.getStoreStats(storeId),
      ]);
      setStore(storeData);
      setStats(statsData);

      // Set as selected store in context
      setSelectedStore(storeId);
    } catch (error) {
      logger.error('Failed to load store:', error);
      toast.error('Erro ao carregar loja');
      navigate('/stores');
    } finally {
      setLoading(false);
    }
  }, [storeId, navigate, setSelectedStore]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  const handleToggleStatus = async () => {
    if (!store) return;
    
    try {
      if (store.status === 'active') {
        await storesApi.deactivateStore(store.id);
        toast.success('Loja desativada');
      } else {
        await storesApi.activateStore(store.id);
        toast.success('Loja ativada');
      }
      loadStore();
    } catch (error) {
      logger.error('Failed to toggle store status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleTabClick = (tab: Tab) => {
    if (tab.path) {
      navigate(`/stores/${storeId}/${tab.path}`);
    } else {
      setActiveTab(tab.id);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!store) {
    return (
      <div className="p-6 text-center">
        <p className="text-fg-muted-token">Loja não encontrada</p>
        <Button onClick={() => navigate('/stores')} className="mt-4">
          Voltar para Lojas
        </Button>
      </div>
    );
  }

  return (
    <PageShell
      trilha={[{ rotulo: 'Lojas', href: '/stores' }, { rotulo: store.name }]}
      titulo={store.name}
      selo={
        <Badge variant={store.status === 'active' ? 'success' : 'gray'}>
          {store.status === 'active' ? 'Ativa' : 'Inativa'}
        </Badge>
      }
      acoes={
        <>
            <Button
              variant="secondary"
              onClick={() => setIsEditModalOpen(true)}
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button
              variant={store.status === 'active' ? 'danger' : 'primary'}
              onClick={handleToggleStatus}
            >
              {store.status === 'active' ? (
                <>
                  <XCircleIcon className="w-4 h-4 mr-2" />
                  Desativar
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  Ativar
                </>
              )}
            </Button>
        </>
      }
    >

      {stats && (
        <KpiGrid
          itens={[
            {
              label: 'Receita total',
              value: `R$ ${stats.revenue.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              // O "Hoje: R$ …" vivia numa terceira linha do cartão, do mesmo
              // tamanho do resto. A definição é onde ele pertence: é o recorte
              // do número, não outro indicador.
              definicao: `Tudo que já entrou nesta loja. Hoje: R$ ${stats.revenue.today.toLocaleString(
                'pt-BR',
                { minimumFractionDigits: 2 },
              )}.`,
              tone: 'success',
            },
            {
              label: 'Pedidos',
              value: stats.orders.total,
              definicao: `Pedidos feitos desde sempre. Hoje: ${stats.orders.today}.`,
              tone: 'brand',
            },
            {
              label: 'Produtos',
              value: stats.products.total,
              definicao: `Itens no cardápio. Aparecendo para o cliente: ${stats.products.active}.`,
            },
            {
              label: 'Clientes',
              value: stats.customers.total,
              definicao: 'Pessoas com cadastro nesta loja.',
            },
          ]}
        />
      )}

      {/* Tabs */}
      <div className="border-b border-border-token mb-6">
        <nav className="flex gap-4 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap
                  transition-colors duration-200
                  ${isActive 
                    ? 'border-primary-500 text-primary-600' 
                    : 'border-transparent text-fg-muted-token hover:text-fg-token hover:border-border-token'}
                `}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to={`/stores/${storeId}/products`}
                className="flex items-center gap-3 p-4 bg-surface-2 rounded-lg hover:bg-surface-2 dark:hover:bg-zinc-700 dark:hover:bg-[var(--dark-bg-hover,#161616)] transition-colors"
              >
                <CubeIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="font-medium">Produtos</p>
                  <p className="text-sm text-fg-muted-token">{store.products_count} itens</p>
                </div>
              </Link>
              <Link
                to={`/stores/${storeId}/orders`}
                className="flex items-center gap-3 p-4 bg-surface-2 rounded-lg hover:bg-surface-2 dark:hover:bg-zinc-700 dark:hover:bg-[var(--dark-bg-hover,#161616)] transition-colors"
              >
                <ShoppingCartIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium">Pedidos</p>
                  <p className="text-sm text-fg-muted-token">{store.orders_count} pedidos</p>
                </div>
              </Link>
              <Link
                to={`/stores/${storeId}/combos`}
                className="flex items-center gap-3 p-4 bg-surface-2 rounded-lg hover:bg-surface-2 dark:hover:bg-zinc-700 dark:hover:bg-[var(--dark-bg-hover,#161616)] transition-colors"
              >
                <CubeIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="font-medium">Combos</p>
                  <p className="text-sm text-fg-muted-token">Kits de produtos</p>
                </div>
              </Link>
              <Link
                to={`/stores/${storeId}/coupons`}
                className="flex items-center gap-3 p-4 bg-surface-2 rounded-lg hover:bg-surface-2 dark:hover:bg-zinc-700 dark:hover:bg-[var(--dark-bg-hover,#161616)] transition-colors"
              >
                <TagIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium">Cupons</p>
                  <p className="text-sm text-fg-muted-token">Gerenciar descontos</p>
                </div>
              </Link>
              <Link
                to={`/stores/${storeId}/delivery`}
                className="flex items-center gap-3 p-4 bg-surface-2 rounded-lg hover:bg-surface-2 dark:hover:bg-zinc-700 dark:hover:bg-[var(--dark-bg-hover,#161616)] transition-colors"
              >
                <TruckIcon className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="font-medium">Entrega</p>
                  <p className="text-sm text-fg-muted-token">Zonas e taxas</p>
                </div>
              </Link>
            </div>
          </Card>

          {/* Store Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Informações da Loja</h3>
            <div className="space-y-3">
              {store.email && (
                <div>
                  <p className="text-sm text-fg-muted-token">Email</p>
                  <p className="font-medium">{store.email}</p>
                </div>
              )}
              {store.phone && (
                <div>
                  <p className="text-sm text-fg-muted-token">Telefone</p>
                  <p className="font-medium">{store.phone}</p>
                </div>
              )}
              {store.whatsapp_number && (
                <div>
                  <p className="text-sm text-fg-muted-token">WhatsApp</p>
                  <p className="font-medium">{store.whatsapp_number}</p>
                </div>
              )}
              {store.address && (
                <div>
                  <p className="text-sm text-fg-muted-token">Endereço</p>
                  <p className="font-medium">
                    {store.address}
                    {store.city && `, ${store.city}`}
                    {store.state && ` - ${store.state}`}
                  </p>
                </div>
              )}
              <div className="pt-3 border-t">
                <p className="text-sm text-fg-muted-token">Configurações de Entrega</p>
                <div className="flex gap-4 mt-1">
                  <span className={`text-sm ${store.delivery_enabled ? 'text-green-600' : 'text-fg-muted-token'}`}>
                    {store.delivery_enabled ? '✓ Delivery' : '✗ Delivery'}
                  </span>
                  <span className={`text-sm ${store.pickup_enabled ? 'text-green-600' : 'text-fg-muted-token'}`}>
                    {store.pickup_enabled ? '✓ Retirada' : '✗ Retirada'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Loja"
        size="lg"
      >
        <p className="text-fg-muted-token">
          Funcionalidade de edição em desenvolvimento.
          Por enquanto, use o Django Admin para editar os dados da loja.
        </p>
        <div className="flex justify-end mt-4">
          <Button onClick={() => setIsEditModalOpen(false)}>
            Fechar
          </Button>
        </div>
      </Modal>
    </PageShell>
  );
};

export default StoreDetailPage;
