import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button } from '../../components/ui';
import { paymentsService } from '../../services/payments';
import logger from '../../services/logger';
import { LogoMercadoPago } from './LogoMercadoPago';

interface GatewayDaLoja {
  id: string;
  name: string;
  gateway_type: string;
  is_enabled: boolean;
  is_sandbox: boolean;
  connection_type?: 'manual' | 'oauth';
  tem_credencial?: boolean;
  token_expirado?: boolean;
  external_account_id?: string;
}

interface RecebimentoSectionProps {
  storeId: string;
  /** Loja do próprio dono: recebe na conta da plataforma, e isso é o certo. */
  usaGatewayDaPlataforma?: boolean;
}

const CAMPO =
  'w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand';

/**
 * Por que o motivo do erro vira frase e não código na tela: o lojista que
 * clica em "Conectar" e volta sem nada não tem como saber se recusou a
 * autorização, se o link venceu ou se o Mercado Pago recusou a aplicação — e
 * cada um desses tem uma ação diferente. O backend manda `?mp=erro&motivo=`.
 */
const MOTIVOS: Record<string, string> = {
  state_invalido: 'O link de conexão venceu. Clique em conectar de novo.',
  loja_nao_encontrada: 'Não encontrei a loja dessa conexão.',
  nao_autorizado: 'A autorização foi recusada na tela do Mercado Pago.',
  troca_falhou: 'O Mercado Pago recusou a autorização. Tente de novo.',
  sem_token: 'O Mercado Pago não devolveu a credencial. Tente de novo.',
};

/**
 * Onde a loja diz em QUAL conta o dinheiro do cliente cai.
 *
 * Sem isto, o pagamento usa a conta da plataforma — o que só é aceitável nas
 * lojas do próprio dono. Numa loja de cliente, seria intermediar dinheiro de
 * terceiro sem contrato, e o checkout hoje falha de propósito até a conta ser
 * cadastrada aqui.
 *
 * São dois caminhos, e o OAuth é o bom: além de dispensar o lojista de caçar
 * credencial em painel de desenvolvedor, ele devolve a public key da MESMA
 * conta. O token colado à mão não devolve — e sem a public key da conta certa,
 * o cartão é tokenizado com a chave de uma conta e cobrado com o token de
 * outra, combinação que o Mercado Pago recusa. Por isso o campo manual ficou
 * como plano B, escondido.
 */
export const RecebimentoSection: React.FC<RecebimentoSectionProps> = ({
  storeId,
  usaGatewayDaPlataforma = false,
}) => {
  const [gateway, setGateway] = useState<GatewayDaLoja | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [token, setToken] = useState('');
  const [mostrarManual, setMostrarManual] = useState(false);
  const [params, setParams] = useSearchParams();

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

  // Volta do Mercado Pago: o backend redireciona para cá com o resultado.
  // Os parâmetros saem da URL depois de lidos para não repetir o toast a cada
  // re-render nem deixar o lojista com um "conectado!" colado na barra.
  useEffect(() => {
    const resultado = params.get('mp');
    if (!resultado) return;

    if (resultado === 'ok') {
      toast.success('Conta conectada. Os pagamentos desta loja caem nela.');
      carregar();
    } else {
      const motivo = params.get('motivo') || '';
      toast.error(MOTIVOS[motivo] ?? 'Não consegui conectar a conta. Tente de novo.');
    }

    const limpo = new URLSearchParams(params);
    limpo.delete('mp');
    limpo.delete('motivo');
    setParams(limpo, { replace: true });
  }, [params, setParams, carregar]);

  const conectar = async () => {
    setConectando(true);
    try {
      const url = await paymentsService.getMercadoPagoAuthUrl(storeId);
      // Mesma aba de propósito: o Mercado Pago devolve o lojista por
      // redirecionamento, e popup bloqueado deixaria o fluxo travado sem aviso.
      window.location.href = url;
    } catch (erro: unknown) {
      logger.error('Erro ao iniciar conexão com o Mercado Pago:', erro);
      const status = (erro as { response?: { status?: number } })?.response?.status;
      toast.error(
        status === 503
          ? 'A conexão com o Mercado Pago ainda não está liberada nesta instalação.'
          : 'Não consegui abrir o Mercado Pago. Tente de novo.',
      );
      setConectando(false);
    }
  };

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
  const viaOauth = gateway?.connection_type === 'oauth';

  const botaoMercadoPago = (
    <button
      type="button"
      onClick={conectar}
      disabled={conectando}
      className={[
        'group inline-flex items-center gap-3 rounded-lg px-5 py-3',
        'bg-[#FFE600] hover:bg-[#FFEB3B] active:bg-[#F5DC00]',
        'text-[#2D3277] font-semibold text-sm',
        'shadow-sm hover:shadow transition-all',
        'focus:outline-none focus:ring-2 focus:ring-[#00A6E0] focus:ring-offset-2',
        'focus:ring-offset-surface disabled:opacity-60 disabled:cursor-not-allowed',
      ].join(' ')}
    >
      <LogoMercadoPago className="w-9 h-7 shrink-0" />
      <span>{conectando ? 'Abrindo o Mercado Pago...' : 'Conectar conta do Mercado Pago'}</span>
      {!conectando && (
        <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );

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
          {configurado ? (
            <div className="flex items-start gap-2 p-3 rounded bg-green-50 dark:bg-green-900/20 mb-4">
              <CheckCircleIcon className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-800 dark:text-green-300">
                  Conta própria configurada
                </p>
                <p className="text-green-700 dark:text-green-400">
                  Os pagamentos desta loja caem na conta dela.
                  {viaOauth && ' Conectada pelo Mercado Pago.'}
                  {viaOauth && gateway?.external_account_id
                    ? ` Conta ${gateway.external_account_id}.`
                    : ''}
                  {gateway?.token_expirado && ' ⚠️ A autorização expirou — reconecte.'}
                </p>
              </div>
            </div>
          ) : usaGatewayDaPlataforma ? (
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

          <div className="flex flex-col items-start gap-2">
            {botaoMercadoPago}
            <p className="text-xs text-fg-muted-token max-w-md">
              {configurado
                ? 'Conectar de novo troca a conta que recebe — o dinheiro dos próximos pedidos passa a cair na conta autorizada agora.'
                : 'Você entra na sua conta do Mercado Pago e autoriza o Cardapidex. Não precisa copiar nenhuma credencial, e o PIX e o cartão passam a cair direto na sua conta.'}
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-border-token">
            <button
              type="button"
              onClick={() => setMostrarManual(v => !v)}
              className="text-xs text-fg-muted-token hover:text-fg-token underline underline-offset-2"
            >
              {mostrarManual ? 'Esconder' : 'Prefiro colar o token manualmente'}
            </button>

            {mostrarManual && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-fg-token mb-1" htmlFor="mp-token">
                  {configurado ? 'Substituir o token' : 'Access token do Mercado Pago'}
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
                  Em mercadopago.com.br → Seu negócio → Configurações → Gestão e administração
                  → Credenciais → <strong>Credenciais de produção</strong>. O token é guardado
                  criptografado e nunca é exibido de volta. Atenção: pelo token colado o
                  <strong> cartão pode não funcionar</strong>, porque a chave pública fica sendo
                  a da plataforma — conectando pelo botão acima, as duas vêm juntas.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
};

export default RecebimentoSection;
