/**
 * Configurações → Pagamentos: como a loja recebe (26/10).
 *
 * O item "Pagamentos" do menu abria um EXTRATO e não configurava nada;
 * conectar o Mercado Pago, o vale, o acréscimo e o caixa moravam escondidos em
 * Geral → Recebimento. Quem procurava "onde conecto o Mercado Pago" abria
 * Pagamentos e achava uma tabela. O extrato agora é Financeiro → Pagamentos
 * recebidos.
 *
 * As seções gravam cada uma no seu endpoint, mas contam na mesma barra e
 * gravam no mesmo Salvar (`salvarJunto`). O Caixa grava no ato.
 *
 * Ordem (26/11), do que o cliente vê ao que é interno:
 *   1. Como o cliente paga — uma linha por forma; a configuração de cada uma
 *      aninhada nela (Vale → bandeiras → chaves). O vale liga num lugar só.
 *   2. Onde o dinheiro cai — Mercado Pago.
 *   3. Acréscimo do vale — só com algum vale ligado.
 *   4. Caixa.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import { BarraDeAlteracoes, FalhaAoCarregar, PageShell } from '../../components/ui';
import { Loading } from '../../components/common';
import { getStore, type Store } from '../../services/storesApi';
import logger from '../../services/logger';
import { useStore } from '../../hooks';
import RecebimentoSection from '../stores/RecebimentoSection';
import VoucherSection from '../stores/VoucherSection';
import ValePorLinkSection from '../stores/ValePorLinkSection';
import AcrescimoDoValeSection from '../stores/AcrescimoDoValeSection';
import CaixaDinheiroSection from '../stores/CaixaDinheiroSection';
import FormasNoCardapioSection from '../stores/FormasNoCardapioSection';
import { SalvarJunto, useSalvarJunto } from '../stores/salvarJunto';

/** Formas de vale: o acréscimo só faz sentido com uma delas ligada. */
const VALES = ['voucher', 'voucher_link'];

type CamposExtras = {
  usa_gateway_da_plataforma?: boolean;
  vale_por_link_brands?: string[];
  voucher_fee_percent?: number;
};

export const PagamentosDaLojaPage: React.FC = () => {
  const { storeId: daRota } = useParams<{ storeId?: string }>();
  const { storeId: doContexto } = useStore();
  const lojaId = daRota || doContexto || null;

  const [loja, setLoja] = useState<Store | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [versao, setVersao] = useState(0);
  const [formasLigadas, setFormasLigadas] = useState<string[]>([]);
  const juntas = useSalvarJunto();

  const carregar = useCallback(async () => {
    if (!lojaId) return;
    setFalhou(false);
    try {
      setLoja(await getStore(lojaId));
    } catch (e) {
      logger.error('Erro ao carregar pagamentos da loja:', e);
      setFalhou(true);
    }
  }, [lojaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    const problema = juntas.validar();
    if (problema) {
      toast.error(problema);
      return;
    }
    const quantas = juntas.mudancas;
    setSalvando(true);
    try {
      await juntas.salvar();
      toast.success(quantas === 1 ? 'Alteração salva' : `${quantas} alterações salvas`);
      await carregar();
      // A disponibilidade das formas depende do que acabou de gravar (o vale
      // só fica disponível com o gateway ligado): busca de novo.
      setVersao((v) => v + 1);
    } catch (e) {
      logger.error('Erro ao salvar pagamentos da loja:', e);
      toast.error('Não foi possível salvar. As alterações continuam aqui.');
    } finally {
      setSalvando(false);
    }
  };

  const extras = (loja ?? {}) as CamposExtras;
  const valeLigado = formasLigadas.some((m) => VALES.includes(m));

  return (
    <PageShell titulo="Pagamentos" className="mx-auto max-w-4xl">
      {falhou ? (
        <FalhaAoCarregar titulo="Não foi possível carregar os pagamentos da loja" onTentarDeNovo={carregar} />
      ) : !loja ? (
        <Loading />
      ) : (
        <SalvarJunto registro={juntas.registro}>
          <div className="flex flex-col gap-6">
            <FormasNoCardapioSection
              storeId={loja.id}
              versao={versao}
              onMudar={setFormasLigadas}
              detalhes={{
                voucher: (interruptor) => <VoucherSection storeId={loja.id} interruptor={interruptor} />,
                voucher_link: (interruptor) => (
                  <ValePorLinkSection
                    storeId={loja.id}
                    ligadas={extras.vale_por_link_brands || []}
                    whatsapp={loja.whatsapp_number || ''}
                    interruptor={interruptor}
                  />
                ),
              }}
            />
            <RecebimentoSection storeId={loja.id} usaGatewayDaPlataforma={Boolean(extras.usa_gateway_da_plataforma)} />
            {valeLigado && (
              <AcrescimoDoValeSection storeId={loja.id} percentualAtual={Number(extras.voucher_fee_percent) || 0} />
            )}
            <CaixaDinheiroSection loja={loja} onSalvo={setLoja} />
          </div>
        </SalvarJunto>
      )}
      <BarraDeAlteracoes
        quantidade={juntas.mudancas}
        salvando={salvando}
        onSalvar={salvar}
        onDescartar={juntas.descartar}
      />
    </PageShell>
  );
};

export default PagamentosDaLojaPage;
