/**
 * Menu único de downloads dos relatórios.
 *
 * Antes havia dois botões soltos ("Exportar pedidos" e "Exportar aba (CSV)") e
 * o único formato era CSV cru. Agora cada relatório aparece uma vez, com CSV e
 * Excel lado a lado — o CSV continua existindo para quem já tem rotina montada
 * em cima dele, o Excel é opção.
 *
 * O PDF do cardápio entra aqui por ser o mesmo gesto ("quero um arquivo disso"),
 * embora não seja um relatório.
 */
import React, { useState } from 'react';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import toast from 'react-hot-toast';
import { Button } from '../common';
import { reportsService } from '../../services/reports';

export interface FaixaDeDatas {
  start_date?: string;
  end_date?: string;
}

interface Props {
  range: FaixaDeDatas;
  /** Abre a escolha de categorias do cardápio. */
  onEscolherCardapio: () => void;
  /** Export da aba aberta (client-side, já existente). Opcional. */
  onExportarAba?: () => void;
  abaLabel?: string;
  abaDesabilitada?: boolean;
}

type Formato = 'csv' | 'xlsx';

const MenuDownloads: React.FC<Props> = ({
  range, onExportarAba, abaLabel, abaDesabilitada, onEscolherCardapio,
}) => {
  const [baixando, setBaixando] = useState<string | null>(null);

  const baixar = async (
    chave: string,
    fn: () => Promise<void>,
  ) => {
    if (baixando) return; // evita duplo clique gerando dois downloads
    setBaixando(chave);
    try {
      await fn();
    } catch (e) {
      console.error('[downloads]', e);
      toast.error('Não foi possível gerar o arquivo. Tente de novo.');
    } finally {
      setBaixando(null);
    }
  };

  const item = (
    chave: string,
    rotulo: string,
    Icone: typeof TableCellsIcon,
    acao: () => Promise<void>,
  ) => (
    <Menu.Item key={chave}>
      {({ active }) => (
        <button
          type="button"
          onClick={() => void baixar(chave, acao)}
          disabled={!!baixando}
          className={[
            'flex w-full items-center gap-2 px-3 py-2 text-sm text-left',
            active ? 'bg-bg-secondary' : '',
            baixando ? 'opacity-60 cursor-wait' : '',
          ].join(' ')}
        >
          <Icone className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
          <span className="flex-1 text-fg-primary">{rotulo}</span>
          {baixando === chave && (
            <span className="text-xs text-fg-muted">gerando…</span>
          )}
        </button>
      )}
    </Menu.Item>
  );

  const grupo = (titulo: string) => (
    <div className="px-3 pt-2.5 pb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-fg-muted">
      {titulo}
    </div>
  );

  const pedidos = (formato: Formato) => async () => {
    const blob = await reportsService.exportarPedidos({ ...range, fmt: formato });
    reportsService.downloadBlob(blob, reportsService.nomeArquivo('pedidos', formato));
  };
  const itens = (formato: Formato) => async () => {
    const blob = await reportsService.exportarVendasPorItem({ ...range, fmt: formato });
    reportsService.downloadBlob(blob, reportsService.nomeArquivo('vendas-por-item', formato));
  };
  const faturamento = (formato: Formato) => async () => {
    const blob = await reportsService.exportarFaturamento({ ...range, fmt: formato });
    reportsService.downloadBlob(blob, reportsService.nomeArquivo('faturamento', formato));
  };

  return (
    <Menu as="div" className="relative">
      <Menu.Button as={React.Fragment}>
        <Button variant="outline" leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}>
          Baixar
        </Button>
      </Menu.Button>
      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        {/* z-50: acima da navbar (z-40). O <main> não cria mais stacking
            context próprio, então este valor vale de verdade. */}
        <Menu.Items className="absolute right-0 z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-xl border border-border-primary bg-bg-card shadow-2xl focus:outline-none">
          {grupo('Pedidos')}
          {item('pedidos-xlsx', 'Pedidos — Excel (.xlsx)', TableCellsIcon, pedidos('xlsx'))}
          {item('pedidos-csv', 'Pedidos — CSV', DocumentTextIcon, pedidos('csv'))}

          {grupo('Vendas por item')}
          {item('itens-xlsx', 'Vendas por item — Excel', TableCellsIcon, itens('xlsx'))}
          {item('itens-csv', 'Vendas por item — CSV', DocumentTextIcon, itens('csv'))}

          {grupo('Faturamento')}
          {item('fat-xlsx', 'Faturamento — Excel (3 abas)', TableCellsIcon, faturamento('xlsx'))}
          {item('fat-csv', 'Faturamento — CSV', DocumentTextIcon, faturamento('csv'))}

          {grupo('Cardápio')}
          <Menu.Item>
            {({ active }) => (
              <button
                type="button"
                onClick={onEscolherCardapio}
                className={[
                  'flex w-full items-center gap-2 px-3 py-2 text-sm text-left',
                  active ? 'bg-bg-secondary' : '',
                ].join(' ')}
              >
                <DocumentArrowDownIcon className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                <span className="flex-1 text-fg-primary">Cardápio em PDF…</span>
              </button>
            )}
          </Menu.Item>

          {onExportarAba && (
            <>
              {grupo('Aba aberta')}
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={onExportarAba}
                    disabled={abaDesabilitada}
                    className={[
                      'flex w-full items-center gap-2 px-3 py-2 text-sm text-left',
                      active ? 'bg-bg-secondary' : '',
                      abaDesabilitada ? 'opacity-50 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    <DocumentTextIcon className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                    <span className="flex-1 text-fg-primary">
                      {abaLabel || 'Exportar aba'} — CSV
                    </span>
                  </button>
                )}
              </Menu.Item>
            </>
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default MenuDownloads;
