/**
 * A página de uma loja (Todas as lojas → loja).
 *
 * Era uma terceira navegação (26/10): oito abas que só navegavam para telas
 * do menu, "Ações rápidas" repetindo o menu, um "Editar" que abria um modal
 * contendo um link, e "Desativar" sem confirmação — um clique tirava a loja
 * do ar. Ficou o que só esta tela responde: como a loja está, onde ela fica,
 * e ligar/desligar com confirmação.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Cog6ToothIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Badge, Loading } from '../../components/common';
import storesApi, { Store, StoreStats } from '../../services/storesApi';
import { useRootStore } from '../../stores/rootStore';
import logger from '../../services/logger';
import { PageShell, KpiGrid } from '../../components/ui';
import { useConfirm } from '../../hooks/useConfirm';
import { formatCurrency } from '../../utils/formatters';

export const StoreDetailPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { setSelectedStore } = useRootStore();
  
  const [store, setStore] = useState<Store | null>(null);
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [ConfirmDialog, confirmar] = useConfirm();

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
    if (store.status === 'active') {
      const ok = await confirmar({
        title: `Desativar ${store.name}?`,
        message: 'O cardápio sai do ar e a loja para de receber pedidos até ser ativada de novo.',
        confirmText: 'Desativar loja',
        variant: 'danger',
      });
      if (!ok) return;
    }

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
      trilha={[{ rotulo: 'Todas as lojas', href: '/stores' }, { rotulo: store.name }]}
      titulo={store.name}
      selo={
        <Badge variant={store.status === 'active' ? 'success' : 'gray'}>
          {store.status === 'active' ? 'Ativa' : 'Inativa'}
        </Badge>
      }
      acoes={
        <>
            <Link
              to={`/stores/${store.slug}/settings`}
              className="inline-flex items-center gap-2 rounded-lg border border-border-token px-4 py-2 text-sm font-medium text-fg-token hover:bg-surface-2"
            >
              <Cog6ToothIcon className="h-4 w-4" aria-hidden />
              Configurações da loja
            </Link>
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
              value: formatCurrency(stats.revenue.total),
              // O "Hoje: R$ …" vivia numa terceira linha do cartão, do mesmo
              // tamanho do resto. A definição é onde ele pertence: é o recorte
              // do número, não outro indicador.
              definicao: `Tudo que já entrou nesta loja. Hoje: ${formatCurrency(
                stats.revenue.today,
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

      <Card className="mt-6 p-6">
            <h3 className="text-lg font-semibold mb-4">Onde a loja fica</h3>
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
                <p className="text-sm text-fg-muted-token">Como o cliente recebe</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant={store.delivery_enabled ? 'success' : 'gray'}>
                    {store.delivery_enabled ? 'Entrega ligada' : 'Entrega desligada'}
                  </Badge>
                  <Badge variant={store.pickup_enabled ? 'success' : 'gray'}>
                    {store.pickup_enabled ? 'Retirada ligada' : 'Retirada desligada'}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
      {ConfirmDialog}
    </PageShell>
  );
};

export default StoreDetailPage;
