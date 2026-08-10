import React, { useCallback, useEffect, useState } from 'react';
import { BanknotesIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button } from '../../components/ui';
import { paymentsService } from '../../services/payments';
import logger from '../../services/logger';

interface GatewayDaLoja {
  id: string;
  name: string;
  gateway_type: string;
  is_enabled: boolean;
  is_sandbox: boolean;
  connection_type?: 'manual' | 'oauth';
  tem_credencial?: boolean;
  token_expirado?: boolean;
}

interface RecebimentoSectionProps {
  storeId: string;
  /** Loja do próprio dono: recebe na conta da plataforma, e isso é o certo. */
  usaGatewayDaPlataforma?: boolean;
}

const CAMPO =
  'w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand';

/**
 * Onde a loja diz em QUAL conta o dinheiro do cliente cai.
 *
 * Sem isto, o pagamento usa a conta da plataforma — o que só é aceitável nas
 * lojas do próprio dono. Numa loja de cliente, seria intermediar dinheiro de
 * terceiro sem contrato, e o checkout hoje falha de propósito até a conta ser
 * cadastrada aqui.
 *
 * O botão "Conectar com Mercado Pago" (OAuth) já existe no backend, desligado
 * até o app ser registrado na Meta do MP. Enquanto isso, o caminho é o token.
 */
export const RecebimentoSection: React.FC<RecebimentoSectionProps> = ({
  storeId,
  usaGatewayDaPlataforma = false,
}) => {
  const [gateway, setGateway] = useState<GatewayDaLoja | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [token, setToken] = useState('');

  const carregar = useCallback(async () => {
    if (!storeId) return;
    setCarregando(true);
    try {
      const resposta = await paymentsService.getGateways({ store: storeId });
      const linhas = (resposta?.results ?? []) as unknown as GatewayDaLoja[];
      setGateway(linhas.find(g => g.gateway_type === 'mercadopago') ?? null);
    } catch (erro) {
      logger.error('Erro ao carregar gateway da loja:', erro);
    } finally {
      setCarregando(false);
    }
  }, [storeId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const salvar = async () => {
    const valor = token.trim();
    if (!valor) return;
    setSalvando(true);
    try {
      if (gateway) {
        await paymentsService.updateGateway(gateway.id, { access_token: valor } as never);
      } else {
        await paymentsService.createGateway({
          store: storeId,
          name: 'Mercado Pago',
          gateway_type: 'mercadopago',
          access_token: valor,
          is_enabled: true,
          is_sandbox: false,
        });
      }
      setToken('');
      await carregar();
      toast.success('Conta de recebimento salva. Os pagamentos passam a cair nela.');
    } catch (erro) {
      logger.error('Erro ao salvar gateway:', erro);
      toast.error('Não consegui salvar a conta. Confira o token e tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const configurado = Boolean(gateway?.tem_credencial);

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <BanknotesIcon className="w-6 h-6 text-fg-muted-token shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-medium text-fg-token">Conta de recebimento</h3>
          <p className="text-sm text-fg-muted-token">
            Em qual conta do Mercado Pago o dinheiro dos pedidos desta loja cai.
          </p>
        </div>
      </div>

      {carregando ? (
        <div className="h-20 bg-surface-2 rounded animate-pulse" />
      ) : (
        <>
          {!configurado && usaGatewayDaPlataforma ? (
            <div className="flex items-start gap-2 p-3 rounded bg-blue-50 dark:bg-blue-900/20 mb-4">
              <CheckCircleIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-300">
                  Recebe na conta da plataforma
                </p>
                <p className="text-blue-700 dark:text-blue-400">
                  Esta é uma loja própria: os pagamentos caem na conta configurada no
                  servidor, com a contabilidade que você já usa. Não precisa cadastrar nada
                  aqui — só se quiser separar esta loja numa conta diferente.
                </p>
              </div>
            </div>
          ) : configurado ? (
            <div className="flex items-start gap-2 p-3 rounded bg-green-50 dark:bg-green-900/20 mb-4">
              <CheckCircleIcon className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-800 dark:text-green-300">
                  Conta própria configurada
                </p>
                <p className="text-green-700 dark:text-green-400">
                  Os pagamentos desta loja caem na conta dela.
                  {gateway?.connection_type === 'oauth' && ' Conectada via Mercado Pago.'}
                  {gateway?.token_expirado && ' ⚠️ A autorização expirou — reconecte.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 rounded bg-amber-50 dark:bg-amber-900/20 mb-4">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Sem conta própria
                </p>
                <p className="text-amber-700 dark:text-amber-400">
                  Enquanto não configurar, os pagamentos online desta loja não são aceitos.
                </p>
              </div>
            </div>
          )}

          <label className="block text-sm font-medium text-fg-token mb-1" htmlFor="mp-token">
            {configurado
              ? 'Substituir o token'
              : usaGatewayDaPlataforma
                ? 'Usar uma conta separada para esta loja (opcional)'
                : 'Access token do Mercado Pago'}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="mp-token"
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="APP_USR-..."
              autoComplete="off"
              className={CAMPO}
            />
            <Button onClick={salvar} disabled={!token.trim() || salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
          <p className="mt-1 text-xs text-fg-muted-token">
            Pegue em mercadopago.com.br → Seu negócio → Configurações → Gestão e administração →
            Credenciais → <strong>Credenciais de produção</strong>. O token é guardado
            criptografado e nunca é exibido de volta.
          </p>
        </>
      )}
    </Card>
  );
};

export default RecebimentoSection;
