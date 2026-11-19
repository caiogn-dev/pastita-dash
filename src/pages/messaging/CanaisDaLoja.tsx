/**
 * Delivery e pagamento na aba Integrações — os canais que são da LOJA (o
 * WhatsApp e o Instagram são da empresa e a tela os lê à parte).
 *
 * Uma chamada só, `GET /stores/integracoes/?store=`: se ela cai, a seção diz
 * que caiu em vez de pintar três cartões "não conectado" — o lojista tentaria
 * conectar o Mercado Pago que já recebe o dinheiro dele.
 *
 * 99Food não tem botão de conectar: a credencial é da plataforma e a loja é
 * reconhecida pelo aviso da 99. iFood fica "Em breve" até a plataforma ter o
 * aplicativo homologado no iFood.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useStore } from '../../hooks/useStore';
import { IfoodIcon, MercadoPagoIcon, NinetyNineFoodIcon } from '../../components/brand/BrandIcons';
import { Beneficio, Cartao, Grupo, Selo, botaoPrimario, botaoSecundario } from './pecasDeIntegracao';

interface EstadoDosCanais {
  '99food': { ativo: boolean; ultimo_pedido_em: string | null; pedidos_30_dias: number };
  ifood: { disponivel: boolean; conectado: boolean; loja: string; erro: string };
  mercado_pago: { conectado: boolean };
}

const quando = (iso: string | null) => {
  if (!iso) return '';
  const data = new Date(iso);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export const CanaisDaLoja: React.FC = () => {
  const { storeId, storeSlug } = useStore();
  const [estado, setEstado] = useState<EstadoDosCanais | null>(null);
  const [falhou, setFalhou] = useState(false);

  const carregar = useCallback(async () => {
    if (!storeId) return;
    setFalhou(false);
    try {
      const resposta = await api.get('/stores/integracoes/', { params: { store: storeId } });
      setEstado(resposta.data as EstadoDosCanais);
    } catch {
      setFalhou(true);
    }
  }, [storeId]);

  useEffect(() => { carregar(); }, [carregar]);

  if (!storeId) return null;

  if (falhou) {
    return (
      <div role="alert" className="flex items-center gap-3 rounded-xl border border-border-token bg-danger-soft px-5 py-4">
        <span className="flex-1 text-sm text-fg-token">Não conseguimos carregar delivery e pagamento agora.</span>
        <button type="button" onClick={carregar} className="text-sm font-semibold underline">Tentar de novo</button>
      </div>
    );
  }

  if (!estado) {
    return <p role="status" className="text-sm text-fg-muted-token">Carregando delivery e pagamento…</p>;
  }

  const loja = (caminho: string) => `/stores/${storeSlug || storeId}/${caminho}`;
  const noventa = estado['99food'];
  const ifood = estado.ifood;
  const mp = estado.mercado_pago;

  return (
    <>
      <Grupo titulo="Delivery">
        <Cartao
          icone={<NinetyNineFoodIcon size={48} />}
          titulo="99Food"
          subtitulo={noventa.ativo
            ? `${noventa.pedidos_30_dias} pedidos em 30 dias${noventa.ultimo_pedido_em ? ` · último ${quando(noventa.ultimo_pedido_em)}` : ''}`
            : 'Ainda não ativado'}
          selo={noventa.ativo ? <Selo tom="ok">Recebendo pedidos</Selo> : <Selo tom="neutro">Desligado</Selo>}
        >
          <ul className="flex flex-col gap-3">
            <Beneficio titulo="Pedido da 99 no seu quadro,">com o número da 99 na comanda.</Beneficio>
            <Beneficio titulo="Aceite automático">e impressão na hora.</Beneficio>
            <Beneficio titulo="Repasse conferido">pedido a pedido.</Beneficio>
          </ul>
          {noventa.ativo && (
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <Link to={`${loja('orders/historico')}?canal=99food`} className={botaoPrimario}>Ver pedidos</Link>
              <Link to="/analytics/vendas" className={botaoSecundario}>Importar repasse</Link>
            </div>
          )}
        </Cartao>

        <Cartao
          icone={<IfoodIcon size={48} />}
          titulo="iFood"
          subtitulo={ifood.conectado ? (ifood.loja || 'Loja conectada') : 'Pedidos do iFood no mesmo painel'}
          selo={ifood.conectado
            ? (ifood.erro ? <Selo tom="perigo">Precisa reconectar</Selo> : <Selo tom="ok">Recebendo pedidos</Selo>)
            : <Selo tom="breve">Em breve</Selo>}
        >
          <ul className="flex flex-col gap-3">
            <Beneficio titulo="Um quadro só">para site, WhatsApp, 99 e iFood.</Beneficio>
            <Beneficio titulo="Comanda única">na mesma impressora.</Beneficio>
          </ul>
        </Cartao>
      </Grupo>

      <Grupo titulo="Pagamento">
        <Cartao
          icone={<MercadoPagoIcon size={48} />}
          titulo="Mercado Pago"
          subtitulo="PIX e cartão do cardápio"
          selo={mp.conectado ? <Selo tom="ok">Recebendo na sua conta</Selo> : <Selo tom="neutro">Não conectado</Selo>}
        >
          <ul className="flex flex-col gap-3">
            <Beneficio titulo="O dinheiro cai direto">na sua conta do Mercado Pago.</Beneficio>
            <Beneficio titulo="Pedido confirmado sozinho">quando o PIX é pago.</Beneficio>
          </ul>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <Link to={loja('payments')} className={mp.conectado ? botaoSecundario : botaoPrimario}>
              {mp.conectado ? 'Gerenciar' : 'Conectar'}
            </Link>
          </div>
        </Cartao>
      </Grupo>
    </>
  );
};
