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
import { SalvarJunto, useSalvarJunto } from '../stores/salvarJunto';

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
    } catch (e) {
      logger.error('Erro ao salvar pagamentos da loja:', e);
      toast.error('Não foi possível salvar. As alterações continuam aqui.');
    } finally {
      setSalvando(false);
    }
  };

  const extras = (loja ?? {}) as CamposExtras;

  return (
    <PageShell titulo="Pagamentos" className="mx-auto max-w-4xl">
      {falhou ? (
        <FalhaAoCarregar titulo="Não foi possível carregar os pagamentos da loja" onTentarDeNovo={carregar} />
      ) : !loja ? (
        <Loading />
      ) : (
        <SalvarJunto registro={juntas.registro}>
          <div className="flex flex-col gap-6">
            <RecebimentoSection storeId={loja.id} usaGatewayDaPlataforma={Boolean(extras.usa_gateway_da_plataforma)} />
            <VoucherSection storeId={loja.id} />
            <ValePorLinkSection
              storeId={loja.id}
              ligadas={extras.vale_por_link_brands || []}
              whatsapp={loja.whatsapp_number || ''}
            />
            <AcrescimoDoValeSection storeId={loja.id} percentualAtual={Number(extras.voucher_fee_percent) || 0} />
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
