/**
 * Layout da comanda: o servidor monta o papel a partir deste desenho.
 * Blocos ligam/desligam e sobem/descem; a prévia à direita é desenhada com as
 * mesmas `linhas` que viram bytes na impressora (POST comanda/previa/).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowDownIcon, ArrowUpIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { Button, FalhaAoCarregar, PageShell, Secao, Select, Switch, Textarea } from '../../components/ui';
import { Loading } from '../../components/common';
import { useStore } from '../../hooks/useStore';
import {
  LayoutDaComanda as Layout,
  LinhaDaComanda,
  getLayoutDaComanda,
  imprimirTesteDaComanda,
  previaDaComanda,
  salvarLayoutDaComanda,
} from '../../services/printing';

const NOMES: Record<string, { nome: string; resumo: string }> = {
  cabecalho: { nome: 'Cabeçalho da loja', resumo: 'Nome e dados da loja' },
  numero: { nome: 'Número e tipo', resumo: 'Número do pedido, entrega ou retirada' },
  pagamento: { nome: 'Pagamento', resumo: 'Forma de pagamento e quanto cobrar' },
  cliente: { nome: 'Cliente', resumo: 'Nome e telefone' },
  endereco: { nome: 'Endereço', resumo: 'Onde entregar' },
  avisos: { nome: 'Avisos', resumo: 'Atenção da loja e agendamento' },
  itens: { nome: 'Itens', resumo: 'Pratos e quantidades' },
  totais: { nome: 'Totais e descontos', resumo: 'Subtotal, frete e total' },
  observacao: { nome: 'Observação do cliente', resumo: 'Recado do pedido' },
  mensagem: { nome: 'Mensagem da loja', resumo: 'Texto fixo no fim' },
  codigo_barras: { nome: 'Código de barras', resumo: 'Código do pedido' },
};

const SEPARADORES = [
  { valor: 'tracejado', rotulo: 'Tracejado' },
  { valor: 'linha', rotulo: 'Linha' },
  { valor: 'espaco', rotulo: 'Espaço' },
];
const PAPEIS = [
  { valor: '48', rotulo: '80 mm' },
  { valor: '32', rotulo: '58 mm' },
];
const VIAS = [
  { valor: '1', rotulo: '1 via' },
  { valor: '2', rotulo: '2 vias' },
];

const ALINHAR = { esquerda: 'left', centro: 'center', direita: 'right' } as const;

const Barras: React.FC<{ texto: string }> = ({ texto }) => {
  const barras = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => {
        const c = texto.charCodeAt(i % Math.max(texto.length, 1)) || 7;
        return 1 + ((c + i * 3) % 3);
      }),
    [texto],
  );
  return (
    <div data-testid="previa-barras" className="flex h-12 items-stretch justify-center gap-px py-1" aria-label="Código de barras">
      {barras.map((w, i) => (
        <span key={i} style={{ width: w }} className={i % 2 === 0 ? 'bg-black' : 'bg-transparent'} />
      ))}
    </div>
  );
};

const Linha: React.FC<{ linha: LinhaDaComanda }> = ({ linha }) => {
  if (linha.tipo === 'corte') return null;
  if (linha.tipo === 'espaco') return <div className="h-[1.2em]" aria-hidden />;
  if (linha.tipo === 'codigo_barras') return <Barras texto={linha.texto} />;
  const dupla = linha.altura_dupla || linha.largura_dupla;
  return (
    <div
      data-testid="previa-linha"
      data-invertido={linha.invertido ? 'true' : undefined}
      className={linha.invertido ? 'bg-black text-white' : undefined}
      style={{
        whiteSpace: 'pre',
        textAlign: ALINHAR[linha.alinhar ?? 'esquerda'],
        fontWeight: linha.negrito ? 700 : 400,
        fontSize: linha.altura_dupla ? '2em' : linha.largura_dupla ? '1.4em' : undefined,
        lineHeight: dupla ? 1.1 : 1.25,
        minHeight: '1.2em',
      }}
    >
      {linha.texto}
    </div>
  );
};

const LayoutDaComandaPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const { store } = useStore();
  const slug = storeId || store?.slug || '';

  const [layout, setLayout] = useState<Layout | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [linhas, setLinhas] = useState<LinhaDaComanda[]>([]);
  const [colunas, setColunas] = useState(48);
  const [salvando, setSalvando] = useState(false);
  const [imprimindo, setImprimindo] = useState(false);
  const seq = useRef(0);

  const carregar = useCallback(async () => {
    setFalhou(false);
    try {
      const { data } = await getLayoutDaComanda(slug);
      setLayout(data);
    } catch {
      setFalhou(true);
    }
  }, [slug]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!layout) return undefined;
    const t = setTimeout(async () => {
      const minha = ++seq.current;
      try {
        const { data } = await previaDaComanda(slug, layout);
        if (minha !== seq.current) return;
        setLinhas(data.linhas ?? []);
        setColunas(data.colunas || layout.colunas);
      } catch {
        /* a prévia some sozinha; o Salvar continua valendo */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [layout, slug]);

  const mudar = (parcial: Partial<Layout>) => setLayout((l) => (l ? { ...l, ...parcial } : l));
  const ligar = (id: string, ligado: boolean) =>
    setLayout((l) => (l ? { ...l, blocos: l.blocos.map((b) => (b.id === id ? { ...b, ligado } : b)) } : l));
  const mover = (i: number, d: number) =>
    setLayout((l) => {
      if (!l) return l;
      const j = i + d;
      if (j < 0 || j >= l.blocos.length) return l;
      const blocos = [...l.blocos];
      [blocos[i], blocos[j]] = [blocos[j], blocos[i]];
      return { ...l, blocos };
    });

  const salvar = async () => {
    if (!layout) return;
    setSalvando(true);
    try {
      const { data } = await salvarLayoutDaComanda(slug, layout);
      if (data) setLayout(data);
      toast.success('Layout salvo');
    } catch {
      toast.error('Não foi possível salvar');
    } finally {
      setSalvando(false);
    }
  };

  const imprimirTeste = async () => {
    if (!layout) return;
    setImprimindo(true);
    try {
      await imprimirTesteDaComanda(slug, layout);
      toast.success('Teste enviado para a impressora');
    } catch {
      toast.error('Não foi possível imprimir o teste');
    } finally {
      setImprimindo(false);
    }
  };

  const trilha = [{ rotulo: 'Impressão', href: `/stores/${storeId}/printing` }, { rotulo: 'Layout da comanda' }];

  if (falhou) {
    return (
      <PageShell titulo="Layout da comanda" trilha={trilha}>
        <FalhaAoCarregar titulo="Não foi possível carregar o layout" onTentarDeNovo={carregar} />
      </PageShell>
    );
  }
  if (!layout) {
    return (
      <PageShell titulo="Layout da comanda" trilha={trilha}>
        <Loading />
      </PageShell>
    );
  }

  const mensagemLigada = layout.blocos.some((b) => b.id === 'mensagem' && b.ligado);

  return (
    <PageShell
      titulo="Layout da comanda"
      trilha={trilha}
      acoes={
        <div className="flex gap-2">
          <Button variant="outline" onClick={imprimirTeste} disabled={imprimindo} leftIcon={<PrinterIcon className="h-4 w-4" />}>
            Imprimir teste
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            Salvar
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-4">
          <Secao titulo="Blocos">
            <ul className="divide-y divide-border-token">
              {layout.blocos.map((b, i) => {
                const info = NOMES[b.id];
                if (!info) return null;
                return (
                  <li key={b.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg-token">{info.nome}</p>
                      <p className="truncate text-caption text-fg-muted-token">{info.resumo}</p>
                    </div>
                    <Button variant="ghost" size="sm" aria-label={`Subir ${info.nome}`} disabled={i === 0} onClick={() => mover(i, -1)}>
                      <ArrowUpIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label={`Descer ${info.nome}`} disabled={i === layout.blocos.length - 1} onClick={() => mover(i, 1)}>
                      <ArrowDownIcon className="h-4 w-4" />
                    </Button>
                    <Switch ligado={b.ligado} onMudar={(v) => ligar(b.id, v)} rotulo={info.nome} />
                  </li>
                );
              })}
            </ul>
          </Secao>

          <Secao titulo="Papel">
            <div className="grid gap-3 sm:grid-cols-3">
              <Select rotulo="Separador" opcoes={SEPARADORES} valor={layout.separador} onMudar={(v) => mudar({ separador: v as Layout['separador'] })} />
              <Select rotulo="Papel" opcoes={PAPEIS} valor={String(layout.colunas)} onMudar={(v) => mudar({ colunas: Number(v) as Layout['colunas'] })} />
              <Select rotulo="Vias" opcoes={VIAS} valor={String(layout.vias)} onMudar={(v) => mudar({ vias: Number(v) as Layout['vias'] })} />
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-fg-token">Itens grandes</span>
                <Switch ligado={layout.itens_grandes} onMudar={(v) => mudar({ itens_grandes: v })} rotulo="Itens grandes" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-fg-token">Preços nos itens</span>
                <Switch ligado={layout.precos_nos_itens} onMudar={(v) => mudar({ precos_nos_itens: v })} rotulo="Preços nos itens" />
              </div>
              <Textarea
                label="Mensagem da loja"
                value={layout.mensagem}
                maxLength={200}
                disabled={!mensagemLigada}
                onChange={(e) => mudar({ mensagem: e.target.value.slice(0, 200) })}
              />
            </div>
          </Secao>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="overflow-x-auto rounded-lg border border-border-token bg-surface-sunken p-4">
            <div
              data-testid="previa-papel"
              className="mx-auto bg-white p-3 font-mono text-[12px] text-black shadow"
              style={{ width: `${colunas}ch`, boxSizing: 'content-box' }}
            >
              {linhas.map((l, i) => (
                <Linha key={i} linha={l} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default LayoutDaComandaPage;
