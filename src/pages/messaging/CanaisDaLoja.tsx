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
 * aplicativo homologado no iFood; com ele, o lojista conecta aqui: pega o
 * código, autoriza no Portal do Parceiro e cola o código de autorização.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useStore } from '../../hooks/useStore';
import { IfoodIcon, MercadoPagoIcon, NinetyNineFoodIcon } from '../../components/brand/BrandIcons';
import { Beneficio, Cartao, Grupo, Selo, botaoDiscreto, botaoPrimario, botaoSecundario } from './pecasDeIntegracao';

interface EstadoIfood { disponivel: boolean; conectado: boolean; loja: string; erro: string }

interface EstadoDosCanais {
  '99food': { ativo: boolean; ultimo_pedido_em: string | null; pedidos_30_dias: number };
  ifood: EstadoIfood;
  mercado_pago: { conectado: boolean };
}

const quando = (iso: string | null) => {
  if (!iso) return '';
  const data = new Date(iso);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const motivo = (erro: unknown) =>
  (erro as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  || 'Não deu certo. Tente de novo.';

/** Conectar, concluir e desconectar o iFood dentro do cartão. */
const AcoesDoIfood: React.FC<{
  storeId: string;
  ifood: EstadoIfood;
  aoMudar: (novo: EstadoIfood) => void;
}> = ({ storeId, ifood, aoMudar }) => {
  const [passo, setPasso] = useState<{ user_code: string; url: string } | null>(null);
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const params = { params: { store: storeId } };

  const executar = async (acao: () => Promise<void>) => {
    setOcupado(true);
    setErro('');
    try { await acao(); } catch (e) { setErro(motivo(e)); } finally { setOcupado(false); }
  };

  const iniciar = () => executar(async () => {
    const r = await api.post('/stores/integracoes/ifood/iniciar/', null, params);
    setPasso(r.data as { user_code: string; url: string });
  });
  const concluir = () => executar(async () => {
    const r = await api.post('/stores/integracoes/ifood/concluir/', { authorization_code: codigo.trim() }, params);
    setPasso(null);
    setCodigo('');
    aoMudar(r.data as EstadoIfood);
  });
  const desconectar = () => executar(async () => {
    const r = await api.post('/stores/integracoes/ifood/desconectar/', null, params);
    aoMudar(r.data as EstadoIfood);
  });

  const aviso = erro && <p role="alert" className="text-sm text-danger-token">{erro}</p>;

  if (passo) {
    return (
      <div className="mt-auto flex flex-col gap-4">
        <div className="flex flex-col items-center gap-1 rounded-xl bg-surface-muted-token px-4 py-4">
          <span className="font-mono text-2xl font-bold tracking-widest text-fg-token">{passo.user_code}</span>
        </div>
        <a href={passo.url} target="_blank" rel="noopener noreferrer" className={`${botaoSecundario} justify-center`}>
          Abrir portal do iFood
        </a>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) concluir(); }}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-semibold text-fg-token">
            Código de autorização
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              autoComplete="off"
              className="h-11 rounded-xl border border-border-token bg-surface-token px-3 font-mono text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </label>
          <button type="submit" disabled={ocupado || !codigo.trim()} className={botaoPrimario}>Concluir</button>
          <button type="button" onClick={() => setPasso(null)} className={botaoDiscreto}>Cancelar</button>
        </form>
        {aviso}
      </div>
    );
  }

  return (
    <div className="mt-auto flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {!ifood.conectado && (
          <button type="button" onClick={iniciar} disabled={ocupado} className={botaoPrimario}>Conectar iFood</button>
        )}
        {ifood.conectado && ifood.erro && (
          <button type="button" onClick={iniciar} disabled={ocupado} className={botaoPrimario}>Reconectar</button>
        )}
        {ifood.conectado && (
          <button type="button" onClick={desconectar} disabled={ocupado} className={botaoDiscreto}>Desconectar</button>
        )}
      </div>
      {aviso}
    </div>
  );
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
            : ifood.disponivel ? <Selo tom="neutro">Não conectado</Selo> : <Selo tom="breve">Em breve</Selo>}
        >
          <ul className="flex flex-col gap-3">
            <Beneficio titulo="Um quadro só">para site, WhatsApp, 99 e iFood.</Beneficio>
            <Beneficio titulo="Comanda única">na mesma impressora.</Beneficio>
          </ul>
          {ifood.disponivel && (
            <AcoesDoIfood
              storeId={storeId}
              ifood={ifood}
              aoMudar={(novo) => setEstado((atual) => (atual ? { ...atual, ifood: novo } : atual))}
            />
          )}
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
