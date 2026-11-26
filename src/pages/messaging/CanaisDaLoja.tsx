/**
 * Delivery e pagamento na aba Integrações — os canais que são da LOJA (o
 * WhatsApp e o Instagram são da empresa e a tela os lê à parte).
 *
 * Uma chamada só, `GET /stores/integracoes/?store=`: se ela cai, a seção diz
 * que caiu em vez de pintar três cartões "não conectado" — o lojista tentaria
 * conectar o Mercado Pago que já recebe o dinheiro dele.
 *
 * 99Food não tem botão de conectar: a credencial é da plataforma e a loja é
 * reconhecida pelo aviso da 99. iFood é centralizado: o app do Cardapidex tem
 * uma credencial só; a loja cola o ID dela no iFood (merchant UUID) e aprova o
 * app no Portal do Parceiro. Com o app de entregas, a loja também chama
 * entregador do iFood e pode cobrar o frete pela cotação dele. Sem nenhum dos
 * dois apps configurados na plataforma, o cartão fica "Em breve".
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useStore } from '../../hooks/useStore';
import { IfoodIcon, MercadoPagoIcon, NinetyNineFoodIcon } from '../../components/brand/BrandIcons';
import { Switch } from '../../components/common/Switch';
import { Gaveta, Input, Select } from '../../components/ui';
import { RedeNoIfood } from './LojaNoIfood';
import { Acoes, Cartao, Grupo, Selo, botaoDiscreto, botaoPrimario, botaoSecundario } from './pecasDeIntegracao';

type ChamarEntregador = 'manual' | 'confirmado' | 'pronto';

interface EstadoIfood {
  /** App de pedidos da plataforma configurado. */
  disponivel: boolean;
  /** App de entregas (iFood Entrega) da plataforma configurado. */
  entregas_disponivel: boolean;
  /** Merchant UUID colado pelo lojista; "" se não informado. */
  merchant_id: string;
  /** O iFood confirmou acesso à loja (app aprovado no Portal do Parceiro). */
  conectado: boolean;
  loja: string;
  erro: string;
  frete_pelo_ifood: boolean;
  /** Decimal em string, "0.00". */
  acrescimo_frete: string;
  chamar_entregador: ChamarEntregador;
  tempo_preparo_min: number;
}

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


/** POST no iFood da loja com aviso de erro e trava de clique duplo. */
const useSalvarIfood = (storeId: string, aoMudar: (novo: EstadoIfood) => void) => {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  const enviar = async (url: string, corpo: Record<string, unknown> | null) => {
    if (ocupado) return;
    setOcupado(true);
    setErro('');
    try {
      const r = await api.post(url, corpo, { params: { store: storeId } });
      aoMudar(r.data as EstadoIfood);
    } catch (e) {
      setErro(motivo(e));
    } finally {
      setOcupado(false);
    }
  };

  return { ocupado, erro, setErro, enviar };
};

/** ID da loja no iFood: colar, salvar, desconectar. */
const ConexaoDoIfood: React.FC<{
  storeId: string;
  ifood: EstadoIfood;
  aoMudar: (novo: EstadoIfood) => void;
}> = ({ storeId, ifood, aoMudar }) => {
  const [id, setId] = useState(ifood.merchant_id);
  const { ocupado, erro, enviar } = useSalvarIfood(storeId, aoMudar);

  useEffect(() => { setId(ifood.merchant_id); }, [ifood.merchant_id]);

  const limpo = id.trim();
  const mudou = limpo !== ifood.merchant_id;

  return (
    <div className="flex flex-col gap-2">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (limpo && mudou) enviar('/stores/integracoes/ifood/', { merchant_id: limpo });
        }}
      >
        <div className="min-w-[16rem] flex-1">
          <Input
            label="ID da loja no iFood"
            value={id}
            onChange={(e) => setId(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-sm"
          />
        </div>
        <button type="submit" disabled={ocupado || !limpo || !mudou} className={botaoPrimario}>Salvar</button>
        {ifood.merchant_id && (
          <button
            type="button"
            onClick={() => enviar('/stores/integracoes/ifood/desconectar/', null)}
            disabled={ocupado}
            className={botaoDiscreto}
          >
            Desconectar
          </button>
        )}
      </form>
      {ifood.merchant_id && !ifood.conectado && ifood.erro && (
        <p className="text-sm text-fg-muted-token">{ifood.erro}</p>
      )}
      {erro && <p role="alert" className="text-sm text-danger-token">{erro}</p>}
    </div>
  );
};

const QUANDO_CHAMAR: { valor: ChamarEntregador; rotulo: string }[] = [
  { valor: 'manual', rotulo: 'Manual' },
  { valor: 'confirmado', rotulo: 'Ao confirmar o pedido' },
  { valor: 'pronto', rotulo: 'Quando ficar pronto' },
];

/** "2.50" (servidor) ⇄ "2,50" (tela). */
const paraTela = (decimal: string) => (decimal || '0.00').replace('.', ',');
const paraServidor = (texto: string): string | null => {
  const t = texto.trim().replace(',', '.');
  if (t === '') return '0.00';
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Number(t).toFixed(2);
};

/** Frete pela cotação do iFood e quando chamar o entregador. */
const EntregasDoIfood: React.FC<{
  storeId: string;
  ifood: EstadoIfood;
  aoMudar: (novo: EstadoIfood) => void;
}> = ({ storeId, ifood, aoMudar }) => {
  const [frete, setFrete] = useState(ifood.frete_pelo_ifood);
  const [acrescimo, setAcrescimo] = useState(paraTela(ifood.acrescimo_frete));
  const [chamar, setChamar] = useState<ChamarEntregador>(ifood.chamar_entregador);
  const [preparo, setPreparo] = useState(String(ifood.tempo_preparo_min ?? ''));
  const { ocupado, erro, setErro, enviar } = useSalvarIfood(storeId, aoMudar);

  // O servidor é a verdade: depois de salvar, o rascunho vira o que ele devolveu.
  useEffect(() => {
    setFrete(ifood.frete_pelo_ifood);
    setAcrescimo(paraTela(ifood.acrescimo_frete));
    setChamar(ifood.chamar_entregador);
    setPreparo(String(ifood.tempo_preparo_min ?? ''));
  }, [ifood.frete_pelo_ifood, ifood.acrescimo_frete, ifood.chamar_entregador, ifood.tempo_preparo_min]);

  const mudancas: Record<string, unknown> = {};
  if (frete !== ifood.frete_pelo_ifood) mudancas.frete_pelo_ifood = frete;
  if (frete && paraServidor(acrescimo) !== paraServidor(paraTela(ifood.acrescimo_frete))) {
    mudancas.acrescimo_frete = paraServidor(acrescimo);
  }
  if (chamar !== ifood.chamar_entregador) mudancas.chamar_entregador = chamar;
  if (chamar === 'confirmado' && Number(preparo) !== ifood.tempo_preparo_min) {
    mudancas.tempo_preparo_min = Number(preparo);
  }
  const mudou = Object.keys(mudancas).length > 0;

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mudou) return;
    if (mudancas.acrescimo_frete === null) { setErro('Acréscimo inválido'); return; }
    if ('tempo_preparo_min' in mudancas && !(Number.isInteger(mudancas.tempo_preparo_min) && Number(preparo) > 0)) {
      setErro('Tempo de preparo inválido');
      return;
    }
    enviar('/stores/integracoes/ifood/', mudancas);
  };

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4 border-t border-border-token pt-5">
      <h3 className="text-sm font-bold text-fg-token">Entregas iFood</h3>

      <div className="flex items-center justify-between gap-3">
        <span id={`frete-ifood-${storeId}`} className="text-sm font-semibold text-fg-token">Frete pelo iFood</span>
        <Switch checked={frete} onChange={setFrete} ariaLabelledby={`frete-ifood-${storeId}`} />
      </div>

      {frete && (
        <div className="max-w-[10rem]">
          <Input
            label="Acréscimo no frete (R$)"
            value={acrescimo}
            onChange={(e) => setAcrescimo(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
          />
        </div>
      )}

      <Select
        rotulo="Chamar entregador"
        valor={chamar}
        onMudar={(v) => setChamar(v as ChamarEntregador)}
        opcoes={QUANDO_CHAMAR}
        className="max-w-xs"
      />

      {chamar === 'confirmado' && (
        <div className="max-w-[10rem]">
          <Input
            label="Tempo de preparo (min)"
            type="number"
            min={1}
            step={1}
            value={preparo}
            onChange={(e) => setPreparo(e.target.value)}
            inputMode="numeric"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={ocupado || !mudou} className={botaoPrimario}>Salvar entregas</button>
      </div>
      {erro && <p role="alert" className="text-sm text-danger-token">{erro}</p>}
    </form>
  );
};

const seloDoIfood = (ifood: EstadoIfood) => {
  if (!ifood.disponivel && !ifood.entregas_disponivel) return <Selo tom="breve">Em breve</Selo>;
  if (!ifood.merchant_id) return <Selo tom="neutro">Não conectado</Selo>;
  if (ifood.conectado) return <Selo tom="ok">Conectado</Selo>;
  return <Selo tom="breve">Aguardando autorização</Selo>;
};

export const CanaisDaLoja: React.FC = () => {
  const { storeId, storeSlug } = useStore();
  const [estado, setEstado] = useState<EstadoDosCanais | null>(null);
  const [configurandoIfood, setConfigurandoIfood] = useState(false);
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
  const mudarIfood = (novo: EstadoIfood) => setEstado((atual) => (atual ? { ...atual, ifood: novo } : atual));

  const ifoodLigavel = ifood.disponivel || ifood.entregas_disponivel;

  return (
    <>
      <Grupo titulo="Delivery">
        <Cartao
          icone={<NinetyNineFoodIcon size={44} />}
          titulo="99Food"
          categoria="delivery"
          ativo={noventa.ativo}
          subtitulo={noventa.ativo
            ? `${noventa.pedidos_30_dias} pedidos em 30 dias${noventa.ultimo_pedido_em ? ` · último ${quando(noventa.ultimo_pedido_em)}` : ''}`
            : 'Ainda não ativado'}
          selo={noventa.ativo ? <Selo tom="ok">Recebendo pedidos</Selo> : <Selo tom="neutro">Desligado</Selo>}
        >
          {noventa.ativo && (
            <Acoes>
              <Link to={`${loja('orders/historico')}?canal=99food`} className={botaoPrimario}>Ver pedidos</Link>
              <Link to="/analytics/vendas" className={botaoSecundario}>Importar repasse</Link>
            </Acoes>
          )}
        </Cartao>

        <Cartao
          icone={<IfoodIcon size={44} />}
          titulo="iFood"
          categoria="delivery"
          ativo={ifood.conectado}
          subtitulo={ifood.conectado ? (ifood.loja || 'Loja conectada') : 'Ainda não conectado'}
          selo={seloDoIfood(ifood)}
        >
          {ifoodLigavel && (
            <Acoes>
              <button type="button" className={ifood.conectado ? botaoSecundario : botaoPrimario} onClick={() => setConfigurandoIfood(true)}>
                {ifood.merchant_id ? 'Configurar' : 'Conectar'}
              </button>
            </Acoes>
          )}
        </Cartao>
      </Grupo>

      <Grupo titulo="Pagamento">
        <Cartao
          icone={<MercadoPagoIcon size={44} />}
          titulo="Mercado Pago"
          categoria="pagamento"
          ativo={mp.conectado}
          subtitulo="PIX e cartão do cardápio"
          selo={mp.conectado ? <Selo tom="ok">Recebendo na sua conta</Selo> : <Selo tom="neutro">Não conectado</Selo>}
        >
          <Acoes>
            <Link to={loja('payments')} className={mp.conectado ? botaoSecundario : botaoPrimario}>
              {mp.conectado ? 'Gerenciar' : 'Conectar'}
            </Link>
          </Acoes>
        </Cartao>
      </Grupo>

      {configurandoIfood && ifoodLigavel && (
        <Gaveta ariaLabel="iFood" onClose={() => setConfigurandoIfood(false)} className="max-w-xl">
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-6">
            <header className="flex items-center gap-3">
              <IfoodIcon size={40} />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-fg-token">iFood</h2>
                <p className="truncate text-sm text-fg-muted-token">{ifood.loja || 'Loja no iFood'}</p>
              </div>
              {seloDoIfood(ifood)}
            </header>
            <ConexaoDoIfood storeId={storeId} ifood={ifood} aoMudar={mudarIfood} />
            {ifood.merchant_id && ifood.conectado && <RedeNoIfood storeId={storeId} />}
            {ifood.entregas_disponivel && ifood.merchant_id && (
              <EntregasDoIfood storeId={storeId} ifood={ifood} aoMudar={mudarIfood} />
            )}
            <button type="button" className={`${botaoDiscreto} self-end`} onClick={() => setConfigurandoIfood(false)}>Fechar</button>
          </div>
        </Gaveta>
      )}
    </>
  );
};
