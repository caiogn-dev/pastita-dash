/**
 * Bancada da etiqueta: o papel em cima da mesa, réguas em milímetro, campos
 * que se arrastam e esticam, e um interruptor "Ver como sai" que troca o
 * desenho pelo bitmap real que a impressora vai receber — no mesmo lugar, na
 * mesma escala. Layout é da loja (Zebra e Elgin recebem o mesmo desenho);
 * calibração é da impressora.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowUturnLeftIcon, ArrowUturnRightIcon, ArrowsPointingInIcon, Bars3BottomLeftIcon, Bars3BottomRightIcon, Bars3Icon,
  BoldIcon, ChevronDownIcon, ChevronUpIcon, DocumentDuplicateIcon, EyeIcon, MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon, MinusIcon, PrinterIcon, QrCodeIcon, StopIcon, TableCellsIcon, TrashIcon, ViewfinderCircleIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, PageShell, Select } from '../../components/ui';
import { Loading } from '../../components/common';
import { getStores } from '../../services/storesApi';
import { normalizePaginatedResponse } from '../../services/api';
import {
  Calibracao, ElementoDoLayout, LayoutDeEtiqueta, LayoutsDaLoja, ModeloDesenhavel, MODELOS_DESENHAVEIS, PrintAgent,
  TipoDeElemento, calibracaoDoAgente, carregarLayouts, enviarEtiquetasParaAgente, imprimeEtiquetas,
  imprimirGradeDeCalibracao, listPrintAgents, previewDeEtiquetas, salvarCalibracao, salvarLayout,
} from '../../services/printing';
import {
  Alca, ETIQUETA_DE_EXEMPLO, Historico, ajustarPapelAoBloco, blocoMm, comPapel, duplicarElemento, editarElemento, encaixar,
  encaixarNasGuias, guiasDoLayout, margemEsquerda, moverCamada, moverElemento, nomeDoElemento, novoElemento,
  irmaosDoRolo, problemaDoLayout, redimensionarPorAlca, removerElemento, temMargensMedidas, textoDeExemplo,
} from './editorDeEtiqueta';

const PX_POR_MM_REAL = 96 / 25.4;
const ZOOMS = [2, 3, 4, PX_POR_MM_REAL, 5, 6, 8, 10, 12, 16];
const REGUA = 22; // px
const TOLERANCIA_GUIA = 0.4; // mm

const NOME_DO_MODELO: Record<ModeloDesenhavel, string> = { validade: 'Validade', 'nutricao-qr': 'QR da tabela nutricional', produto: 'Produto com código de barras', nutricao: 'Tabela nutricional' };
const NOMES: Record<TipoDeElemento, string> = { texto: 'Texto', qr: 'QR Code', barras: 'Código de barras', linha: 'Linha', caixa: 'Caixa', tabela: 'Tabela nutricional' };
const CAMPOS = [
  { valor: 'name', rotulo: 'Nome do produto' }, { valor: 'manip', rotulo: 'Data de manipulação' },
  { valor: 'val', rotulo: 'Data de validade' }, { valor: 'price', rotulo: 'Preço' },
  { valor: 'description', rotulo: 'Descrição' }, { valor: 'barcode', rotulo: 'Código de barras' },
  { valor: 'publicUrl', rotulo: 'Link da tabela nutricional' },
  { valor: 'ingredients', rotulo: 'Ingredientes' }, { valor: 'allergens', rotulo: 'Alergênicos' },
];
const CAMPOS_RAPIDOS: { rotulo: string; texto: string; tamanho: number; negrito: boolean }[] = [
  { rotulo: 'Nome do produto', texto: '{name}', tamanho: 2.6, negrito: true },
  { rotulo: 'Validade', texto: 'Val.: {val}', tamanho: 2.8, negrito: true },
  { rotulo: 'Manipulação', texto: 'Manip.: {manip}', tamanho: 2.1, negrito: false },
  { rotulo: 'Preço', texto: '{price}', tamanho: 4, negrito: true },
];
const FONTES = [
  { valor: 'sans', rotulo: 'Arial' }, { valor: 'estreita', rotulo: 'Arial estreita' },
  { valor: 'serif', rotulo: 'Times' }, { valor: 'mono', rotulo: 'Courier' },
];
const CSS_FONTE: Record<string, string> = {
  sans: 'Arial, "Liberation Sans", Helvetica, sans-serif',
  estreita: '"Arial Narrow", "Liberation Sans Narrow", Arial, sans-serif',
  serif: '"Times New Roman", "Liberation Serif", Times, serif',
  mono: '"Courier New", "Liberation Mono", monospace',
};
const MODOS_DE_MIDIA = [
  { valor: 'gap', rotulo: 'Picotado com vão (gap)' },
  { valor: 'continuo', rotulo: 'Contínuo (sem vão)' },
  { valor: 'auto', rotulo: 'Não mexer na impressora' },
];
const ALCAS: { alca: Alca; cursor: string; estilo: (w: number, h: number) => React.CSSProperties }[] = [
  { alca: 'no', cursor: 'nwse-resize', estilo: () => ({ left: -4, top: -4 }) },
  { alca: 'n', cursor: 'ns-resize', estilo: (w) => ({ left: w / 2 - 4, top: -4 }) },
  { alca: 'ne', cursor: 'nesw-resize', estilo: (w) => ({ left: w - 4, top: -4 }) },
  { alca: 'l', cursor: 'ew-resize', estilo: (w, h) => ({ left: w - 4, top: h / 2 - 4 }) },
  { alca: 'sd', cursor: 'nwse-resize', estilo: (w, h) => ({ left: w - 4, top: h - 4 }) },
  { alca: 's', cursor: 'ns-resize', estilo: (w, h) => ({ left: w / 2 - 4, top: h - 4 }) },
  { alca: 'so', cursor: 'nesw-resize', estilo: (_w, h) => ({ left: -4, top: h - 4 }) },
  { alca: 'o', cursor: 'ew-resize', estilo: (_w, h) => ({ left: -4, top: h / 2 - 4 }) },
];

const Ferramenta: React.FC<{ rotulo: string; dica?: string; ativo?: boolean; desabilitado?: boolean; onClick: () => void; children: React.ReactNode; 'data-testid'?: string }> = ({ rotulo, dica, ativo, desabilitado, onClick, children, ...resto }) => (
  <button
    type="button" title={dica ?? rotulo} aria-label={rotulo} aria-pressed={ativo} disabled={desabilitado} onClick={onClick}
    data-testid={resto['data-testid']}
    className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-sm transition-colors disabled:opacity-40 ${ativo ? 'bg-brand/20 text-fg-token' : 'text-fg-muted-token hover:bg-surface-2 hover:text-fg-token'}`}
  >
    {children}
  </button>
);
/** Medida em mm, compacta: rótulo curto em cima, campo embaixo. Corrige a faixa só ao sair. */
const Medida: React.FC<{ rotulo: string; valor: number; onMudar: (v: number) => void; min?: number; max?: number; step?: number; sufixo?: string; desabilitado?: boolean; 'data-testid'?: string }> = ({ rotulo, valor, onMudar, min = 0, max = 1000, step = 0.5, sufixo = 'mm', desabilitado, ...resto }) => {
  const [texto, setTexto] = useState(String(valor));
  useEffect(() => { setTexto(String(valor)); }, [valor]);
  const confirmar = () => {
    const n = Number(texto.replace(',', '.'));
    const corrigido = Number.isFinite(n) && texto.trim() !== '' ? Math.min(max, Math.max(min, n)) : valor;
    setTexto(String(corrigido));
    if (corrigido !== valor) onMudar(corrigido);
  };
  return (
    <label className="block text-xs text-fg-muted-token">
      <span className="block truncate">{rotulo}</span>
      <span className="mt-0.5 flex items-center gap-1">
        <input type="number" inputMode="decimal" min={min} max={max} step={step} value={texto} disabled={desabilitado} aria-label={rotulo}
          className="controle h-8 w-full px-2 text-right text-sm tabular-nums text-fg-token disabled:opacity-60" data-testid={resto['data-testid']}
          onChange={(e) => setTexto(e.target.value)} onBlur={confirmar} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } }} />
        {sufixo && <span className="w-6 shrink-0 text-xs">{sufixo}</span>}
      </span>
    </label>
  );
};
const Separador: React.FC = () => <span className="mx-1 h-5 w-px bg-border-token" aria-hidden="true" />;
const T: React.FC<{ negrito?: boolean }> = ({ negrito }) => <span className={`font-serif text-base leading-none ${negrito ? 'font-bold' : ''}`}>T</span>;

type Arrasto =
  | { tipo: 'mover'; id: string; x0: number; y0: number; ex: number; ey: number }
  | { tipo: 'alca'; id: string; alca: Alca; x0: number; y0: number; base: LayoutDeEtiqueta };

/** Régua em mm, desenhada em SVG para ficar nítida em qualquer zoom. */
const Regua: React.FC<{ mm: number; escala: number; eixo: 'x' | 'y' }> = ({ mm, escala, eixo }) => {
  const total = Math.ceil(mm);
  const passoNumero = escala < 3 ? 10 : 5;
  const comprimento = mm * escala;
  const marcas = Array.from({ length: total + 1 }, (_, i) => i);
  return (
    <svg
      className="block text-fg-muted-token"
      width={eixo === 'x' ? comprimento : REGUA} height={eixo === 'x' ? REGUA : comprimento}
      aria-hidden="true"
    >
      {marcas.map((i) => {
        const p = i * escala;
        const alto = i % 10 === 0 ? REGUA * 0.6 : i % 5 === 0 ? REGUA * 0.38 : REGUA * 0.2;
        return eixo === 'x'
          ? <line key={i} x1={p} x2={p} y1={REGUA} y2={REGUA - alto} stroke="currentColor" strokeWidth={i % 5 === 0 ? 1 : 0.6} />
          : <line key={i} y1={p} y2={p} x1={REGUA} x2={REGUA - alto} stroke="currentColor" strokeWidth={i % 5 === 0 ? 1 : 0.6} />;
      })}
      {marcas.filter((i) => i > 0 && i % passoNumero === 0).map((i) => (
        eixo === 'x'
          ? <text key={`t${i}`} x={i * escala + 2} y={9} fontSize={9} fill="currentColor" className="tabular-nums">{i}</text>
          : <text key={`t${i}`} x={2} y={i * escala - 2} fontSize={9} fill="currentColor" className="tabular-nums">{i}</text>
      ))}
    </svg>
  );
};

const DesignerDeEtiqueta: React.FC = () => {
  const { storeId, modelo: modeloParam } = useParams<{ storeId: string; modelo: string }>();
  const navigate = useNavigate();
  const modelo: ModeloDesenhavel = (MODELOS_DESENHAVEIS as string[]).includes(modeloParam || '') ? (modeloParam as ModeloDesenhavel) : 'validade';

  const [carregando, setCarregando] = useState(true);
  const [storeUuid, setStoreUuid] = useState<string>('');
  const [nomeDaLoja, setNomeDaLoja] = useState('');
  const [agentes, setAgentes] = useState<PrintAgent[]>([]);
  const [layouts, setLayouts] = useState<LayoutsDaLoja | null>(null);

  const historico = useRef<Historico | null>(null);
  const [layout, setLayoutRaw] = useState<LayoutDeEtiqueta | null>(null);
  const [sujo, setSujo] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [zoomIdx, setZoomIdx] = useState(5);
  const [verComoSai, setVerComoSai] = useState(false);
  const [preview, setPreview] = useState<{ png: string; largura: number; altura: number } | null>(null);
  const [guia, setGuia] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [agente, setAgente] = useState('');
  const [cal, setCal] = useState<Calibracao>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const arrasto = useRef<Arrasto | null>(null);
  const mesaRef = useRef<HTMLDivElement>(null);

  const escala = ZOOMS[zoomIdx];
  const px = useCallback((mm: number) => mm * escala, [escala]);

  // Aplica um layout novo: rascunho na tela + passo no histórico.
  const aplicar = useCallback((l: LayoutDeEtiqueta, gravar = true) => {
    setLayoutRaw(l); setSujo(true);
    if (gravar) historico.current?.gravar(l);
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await getStores();
        const lojas = normalizePaginatedResponse<{ id: string; slug: string; name: string }>(res as unknown as { results?: unknown[] });
        const loja = lojas.find((s) => s.slug === storeId);
        if (!loja) { toast.error('Loja não encontrada.'); return; }
        const [ag, lay] = await Promise.all([listPrintAgents(loja.slug), carregarLayouts(loja.id)]);
        if (!vivo) return;
        const lista = normalizePaginatedResponse<PrintAgent>(ag.data).filter((a) => a.is_active && a.status === 'active' && imprimeEtiquetas(a));
        setStoreUuid(loja.id); setNomeDaLoja(loja.name); setAgentes(lista); setLayouts(lay.data);
        const inicial = lay.data[modelo].layout;
        historico.current = new Historico(inicial);
        setLayoutRaw(inicial); setSelecionado(inicial.elementos[0]?.id ?? null);
        // Zoom inicial: o maior degrau em que o rolo inteiro cabe na mesa.
        const larguraMesa = (mesaRef.current?.clientWidth ?? 900) - REGUA - 40;
        const cabe = ZOOMS.map((z, i) => [z, i] as const).filter(([z]) => z * inicial.papel.largura <= larguraMesa);
        setZoomIdx(cabe.length ? cabe[cabe.length - 1][1] : 0);
        const casa = lista.find((a) => (modelo === 'produto' ? /zdesigner|zebra/i : /elgin/i).test(a.printer_name || '')) ?? lista[0];
        setAgente(casa?.id ?? '');
      } catch {
        toast.error('Não foi possível abrir o desenho da etiqueta.');
      } finally { if (vivo) setCarregando(false); }
    })();
    return () => { vivo = false; };
  }, [storeId, modelo]);

  useEffect(() => {
    const a = agentes.find((x) => x.id === agente);
    setCal(a ? { desloc_x: 0, desloc_y: 0, escuro: 10, ...calibracaoDoAgente(a) } : {});
  }, [agente, agentes]);

  const problema = layout ? problemaDoLayout(layout) : null;
  const exemplos = useMemo(() => Array.from({ length: layout?.papel.colunas ?? 1 }, () => ETIQUETA_DE_EXEMPLO), [layout?.papel.colunas]);

  // Prévia real, com atraso curto para não bater no backend a cada pixel arrastado.
  useEffect(() => {
    if (!layout || !storeUuid || problema) return undefined;
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const { data } = await previewDeEtiquetas({ store: storeUuid, modelo, layout, etiquetas: exemplos });
        if (vivo) setPreview({ png: data.png, largura: data.largura_mm, altura: data.altura_mm });
      } catch { /* a prévia é conveniência: sem ela o desenho continua editável */ }
    }, 350);
    return () => { vivo = false; clearTimeout(t); };
  }, [layout, storeUuid, modelo, exemplos, problema]);

  // ---- arrastar / esticar ----------------------------------------------------
  const iniciarMover = (e: React.PointerEvent, el: ElementoDoLayout) => {
    e.preventDefault(); e.stopPropagation();
    setSelecionado(el.id);
    arrasto.current = { tipo: 'mover', id: el.id, x0: e.clientX, y0: e.clientY, ex: el.x, ey: el.y };
  };
  const iniciarAlca = (e: React.PointerEvent, el: ElementoDoLayout, alca: Alca) => {
    e.preventDefault(); e.stopPropagation();
    if (!layout) return;
    arrasto.current = { tipo: 'alca', id: el.id, alca, x0: e.clientX, y0: e.clientY, base: layout };
  };
  useEffect(() => {
    const mover = (e: PointerEvent) => {
      const a = arrasto.current;
      if (!a || !layout) return;
      const dx = (e.clientX - a.x0) / escala; const dy = (e.clientY - a.y0) / escala;
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      if (a.tipo === 'mover') {
        const el = layout.elementos.find((x) => x.id === a.id);
        if (!el) return;
        // Primeiro a guia (borda/centro de algo), depois a grade de 0,5 mm.
        const cru = { x: a.ex + dx, y: a.ey + dy, w: el.w, h: el.h };
        const enc = e.altKey ? { x: cru.x, y: cru.y, guiaX: null, guiaY: null } : encaixarNasGuias(cru, guiasDoLayout(layout, a.id), TOLERANCIA_GUIA);
        const x = enc.guiaX != null ? enc.x : encaixar(cru.x);
        const y = enc.guiaY != null ? enc.y : encaixar(cru.y);
        setGuia({ x: enc.guiaX, y: enc.guiaY });
        setLayoutRaw(moverElemento(layout, a.id, x - el.x, y - el.y));
      } else {
        setLayoutRaw(redimensionarPorAlca(a.base, a.id, a.alca, encaixar(dx), encaixar(dy)));
      }
    };
    const soltar = () => {
      if (arrasto.current && layout) { historico.current?.gravar(layout); setSujo(true); }
      arrasto.current = null; setGuia({ x: null, y: null });
    };
    window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar);
    return () => { window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); };
  }, [layout, escala]);

  useEffect(() => {
    if (!sujo) return undefined;
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [sujo]);

  // ---- teclado ---------------------------------------------------------------
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      if (!layout) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); const l = e.shiftKey ? historico.current?.refazer() : historico.current?.desfazer(); if (l) { setLayoutRaw(l); setSujo(true); } return; }
      if (ctrl && e.key.toLowerCase() === 'y') { e.preventDefault(); const l = historico.current?.refazer(); if (l) { setLayoutRaw(l); setSujo(true); } return; }
      if (!selecionado) return;
      if (ctrl && e.key.toLowerCase() === 'd') { e.preventDefault(); const l = duplicarElemento(layout, selecionado); aplicar(l); setSelecionado(l.elementos[l.elementos.length - 1].id); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); aplicar(removerElemento(layout, selecionado)); setSelecionado(null); return; }
      const passo = e.shiftKey ? 0.1 : 0.5;
      const d: Record<string, [number, number]> = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] };
      if (d[e.key]) { e.preventDefault(); aplicar(moverElemento(layout, selecionado, ...d[e.key])); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [layout, selecionado, aplicar]);

  if (carregando) return <Loading />;
  if (!layout || !layouts) {
    return (
      <PageShell titulo="Desenho da etiqueta" descricao="Não foi possível abrir esta loja.">
        <Button variant="secondary" onClick={() => navigate(-1)}>Voltar</Button>
      </PageShell>
    );
  }

  const elemento = layout.elementos.find((e) => e.id === selecionado) ?? null;
  const margem = margemEsquerda(layout);
  const padrao = layouts[modelo].padrao && !sujo;
  const nomeDoAgente = agentes.find((a) => a.id === agente);

  const patch = (p: Partial<ElementoDoLayout>) => { if (elemento) aplicar(editarElemento(layout, elemento.id, p)); };
  const setEtiqueta = (p: Partial<LayoutDeEtiqueta['etiqueta']>) => aplicar({ ...layout, etiqueta: { ...layout.etiqueta, ...p } });
  const setPapel = (p: Partial<LayoutDeEtiqueta['papel']>) => aplicar(comPapel(layout, p));
  const adicionar = (tipo: TipoDeElemento, extra: Partial<ElementoDoLayout> = {}) => {
    const l = novoElemento(layout, tipo);
    const novo = l.elementos[l.elementos.length - 1];
    const comExtra = { ...l, elementos: l.elementos.map((e) => (e.id === novo.id ? { ...e, ...extra } : e)) };
    aplicar(comExtra); setSelecionado(novo.id);
  };
  const desfazer = () => { const l = historico.current?.desfazer(); if (l) { setLayoutRaw(l); setSujo(true); } };
  const refazer = () => { const l = historico.current?.refazer(); if (l) { setLayoutRaw(l); setSujo(true); } };

  // O que se imprime é o que fica salvo: Teste e Grade gravam o layout antes.
  // Senão a pessoa calibra num computador e abre noutro sem nada.
  const salvar = async (): Promise<boolean> => {
    if (problema) { toast.error(problema); return false; }
    if (!sujo) return true;
    setOcupado('salvar');
    try {
      const { data } = await salvarLayout(storeUuid, modelo, layout);
      setLayouts({ ...layouts, [modelo]: data }); setSujo(false);
      // O servidor propaga papel e tamanho aos modelos do mesmo rolo: recarrega para a tela saber.
      carregarLayouts(storeUuid).then((r) => setLayouts(r.data)).catch(() => undefined);
      const irmaos = irmaosDoRolo(layouts, modelo);
      toast.success(irmaos.length ? `Layout salvo. Papel aplicado também em ${irmaos.join(' e ')}.` : 'Layout salvo para todas as impressoras da loja.');
      return true;
    } catch { toast.error('Não foi possível salvar o layout.'); return false; } finally { setOcupado(null); }
  };
  const restaurar = async () => {
    setOcupado('restaurar');
    try {
      const { data } = await salvarLayout(storeUuid, modelo, null);
      setLayouts({ ...layouts, [modelo]: data }); historico.current = new Historico(data.layout); setLayoutRaw(data.layout); setSujo(false);
      setSelecionado(data.layout.elementos[0]?.id ?? null);
      toast.success('Layout padrão restaurado.');
    } catch { toast.error('Não foi possível restaurar.'); } finally { setOcupado(null); }
  };
  const imprimirGrade = async () => {
    if (!(await salvar())) return;
    setOcupado('grade');
    try {
      await imprimirGradeDeCalibracao({ store: storeUuid, agent: agente, modelo, layout });
      toast.success(`Grade enviada para ${nomeDoAgente?.name ?? 'a impressora'}. Compare a moldura com a borda da etiqueta.`);
    } catch { toast.error('Não foi possível imprimir a grade.'); } finally { setOcupado(null); }
  };
  const imprimirTeste = async () => {
    if (!(await salvar())) return;
    setOcupado('teste');
    try {
      await enviarEtiquetasParaAgente({ store: storeUuid, agent: agente, modelo, etiquetas: exemplos, motor: 'bitmap', layout });
      toast.success(`Etiqueta de teste enviada para ${nomeDoAgente?.name ?? 'a impressora'}.`);
    } catch { toast.error('Não foi possível imprimir o teste.'); } finally { setOcupado(null); }
  };
  const salvarCal = async () => {
    setOcupado('cal');
    try {
      await salvarCalibracao(agente, cal);
      setAgentes((lista) => lista.map((a) => (a.id === agente ? { ...a, metadata: { ...(a.metadata || {}), calibracao: cal } } : a)));
      toast.success(`Calibração salva em ${nomeDoAgente?.name ?? 'impressora'}.`);
    } catch { toast.error('Não foi possível salvar a calibração.'); } finally { setOcupado(null); }
  };

  const larguraPapel = px(layout.papel.largura); const alturaPapel = px(layout.etiqueta.altura);
  const alturaVao = px(layout.papel.vao_linhas ?? 0);

  return (
    <PageShell
      variante="quadro"
      titulo="Desenho da etiqueta"
      descricao={`${NOME_DO_MODELO[modelo]} · ${nomeDaLoja}${padrao ? ' · layout padrão' : sujo ? ' · alterações não salvas' : ' · layout da loja'}`}
      trilha={[{ rotulo: 'Etiquetas', href: `/stores/${storeId}/etiquetas` }, { rotulo: NOME_DO_MODELO[modelo] }]}
      acoes={
        <div className="flex flex-wrap items-center gap-1">
          <Ferramenta rotulo="Desfazer" dica="Desfazer (Ctrl+Z)" desabilitado={!historico.current?.podeDesfazer} onClick={desfazer} data-testid="des-desfazer"><ArrowUturnLeftIcon className="w-4 h-4" /></Ferramenta>
          <Ferramenta rotulo="Refazer" dica="Refazer (Ctrl+Y)" desabilitado={!historico.current?.podeRefazer} onClick={refazer}><ArrowUturnRightIcon className="w-4 h-4" /></Ferramenta>
          <Separador />
          <Ferramenta rotulo="Diminuir zoom" desabilitado={zoomIdx === 0} onClick={() => setZoomIdx((z) => Math.max(0, z - 1))}><MagnifyingGlassMinusIcon className="w-4 h-4" /></Ferramenta>
          <button type="button" className="w-12 text-center tabular-nums text-sm text-fg-muted-token hover:text-fg-token" title="Tamanho real" onClick={() => setZoomIdx(3)}>
            {Math.round((escala / PX_POR_MM_REAL) * 100)}%
          </button>
          <Ferramenta rotulo="Aumentar zoom" desabilitado={zoomIdx === ZOOMS.length - 1} onClick={() => setZoomIdx((z) => Math.min(ZOOMS.length - 1, z + 1))}><MagnifyingGlassPlusIcon className="w-4 h-4" /></Ferramenta>
          <Separador />
          <Ferramenta rotulo="Ver como sai" dica="Ver como sai na impressora" ativo={verComoSai} onClick={() => setVerComoSai((v) => !v)} data-testid="des-ver-como-sai"><EyeIcon className="w-4 h-4" /><span className="hidden sm:inline">Ver como sai</span></Ferramenta>
          <Separador />
          <Button variant="ghost" size="sm" disabled={!!ocupado || padrao} onClick={restaurar}>Restaurar padrão</Button>
          <Button variant="primary" size="sm" disabled={!!ocupado || !!problema || !sujo} onClick={salvar} data-testid="des-salvar">
            {ocupado === 'salvar' ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)_300px]" data-testid="designer">
        {/* ---------- esquerda: camadas ---------- */}
        <aside className="superficie p-2" data-testid="des-camadas">
          <p className="px-1 pb-1 text-sm font-semibold text-fg-token">Camadas</p>
          <ul className="space-y-0.5">
            {[...layout.elementos].reverse().map((e) => (
              <li key={e.id} className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-sm ${e.id === selecionado ? 'bg-brand/15 text-fg-token' : 'text-fg-muted-token hover:bg-surface-2'}`}>
                <span className="w-4 shrink-0 text-fg-muted-token" aria-hidden="true">
                  {e.tipo === 'texto' ? <T /> : e.tipo === 'qr' ? <QrCodeIcon className="w-4 h-4" /> : e.tipo === 'barras' ? <Bars3Icon className="w-4 h-4 rotate-90" /> : e.tipo === 'linha' ? <MinusIcon className="w-4 h-4" /> : e.tipo === 'tabela' ? <TableCellsIcon className="w-4 h-4" /> : <StopIcon className="w-4 h-4" />}
                </span>
                <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => setSelecionado(e.id)}>{nomeDoElemento(e)}</button>
                <button type="button" aria-label="Subir camada" title="Trazer para frente" className="p-0.5 hover:text-fg-token" onClick={() => aplicar(moverCamada(layout, e.id, 'cima'))}><ChevronUpIcon className="w-3.5 h-3.5" /></button>
                <button type="button" aria-label="Descer camada" title="Enviar para trás" className="p-0.5 hover:text-fg-token" onClick={() => aplicar(moverCamada(layout, e.id, 'baixo'))}><ChevronDownIcon className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
        </aside>

        {/* ---------- centro: ferramentas + formatação + mesa ---------- */}
        <section className="min-w-0 space-y-2">
          <div className="superficie flex flex-wrap items-center gap-1 p-1.5" role="toolbar" aria-label="Inserir">
            <Ferramenta rotulo="Texto" onClick={() => adicionar('texto')}><T /><span>Texto</span></Ferramenta>
            {CAMPOS_RAPIDOS.map((c) => (
              <Ferramenta key={c.texto} rotulo={c.rotulo} onClick={() => adicionar('texto', { texto: c.texto, tamanho: c.tamanho, negrito: c.negrito, w: Math.min(30, layout.etiqueta.largura - 2), h: c.tamanho * 1.3 })}>
                <span>{c.rotulo}</span>
              </Ferramenta>
            ))}
            <Separador />
            <Ferramenta rotulo="QR Code" onClick={() => adicionar('qr')}><QrCodeIcon className="w-4 h-4" /></Ferramenta>
            <Ferramenta rotulo="Código de barras" onClick={() => adicionar('barras')}><Bars3Icon className="w-4 h-4 rotate-90" /></Ferramenta>
            <Ferramenta rotulo="Linha" onClick={() => adicionar('linha')}><MinusIcon className="w-4 h-4" /></Ferramenta>
            <Ferramenta rotulo="Caixa" onClick={() => adicionar('caixa')}><StopIcon className="w-4 h-4" /></Ferramenta>
            {(
              <>
                <Separador />
                <Ferramenta rotulo="Tabela nutricional" onClick={() => adicionar('tabela')} data-testid="tool-tabela"><TableCellsIcon className="w-4 h-4" /><span>Tabela</span></Ferramenta>
                <Ferramenta rotulo="Ingredientes" onClick={() => adicionar('texto', { texto: 'INGREDIENTES: {ingredients}', tamanho: 1.7, linhas: 10, w: 32, h: 25 })}><span>Ingredientes</span></Ferramenta>
                <Ferramenta rotulo="Alergênicos" onClick={() => adicionar('texto', { texto: '{allergens}', tamanho: 1.8, negrito: true, linhas: 4, w: 32, h: 10 })}><span>Alergênicos</span></Ferramenta>
              </>
            )}
          </div>

          {elemento && (
            <div className="superficie flex flex-wrap items-center gap-1 p-1.5" role="toolbar" aria-label="Formatação" data-testid="des-formatacao">
              {elemento.tipo === 'texto' && (
                <>
                  <select aria-label="Fonte" className="controle h-8 px-2 text-sm" value={elemento.fonte ?? 'sans'} onChange={(e) => patch({ fonte: e.target.value as ElementoDoLayout['fonte'] })} data-testid="fmt-fonte">
                    {FONTES.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
                  </select>
                  <span className="inline-flex items-center" title="Tamanho da letra (mm)">
                    <Ferramenta rotulo="Letra menor" onClick={() => patch({ tamanho: Math.max(0.8, Number(((elemento.tamanho ?? 2.5) - 0.2).toFixed(1))) })}><MinusIcon className="w-3.5 h-3.5" /></Ferramenta>
                    <span className="w-10 text-center tabular-nums text-sm text-fg-token" data-testid="fmt-tamanho">{(elemento.tamanho ?? 2.5).toFixed(1)}</span>
                    <Ferramenta rotulo="Letra maior" onClick={() => patch({ tamanho: Math.min(60, Number(((elemento.tamanho ?? 2.5) + 0.2).toFixed(1))) })}><span className="text-base leading-none">+</span></Ferramenta>
                  </span>
                  <Separador />
                  <Ferramenta rotulo="Negrito" ativo={!!elemento.negrito} onClick={() => patch({ negrito: !elemento.negrito })} data-testid="fmt-negrito"><BoldIcon className="w-4 h-4" /></Ferramenta>
                  <Separador />
                  <Ferramenta rotulo="Alinhar à esquerda" ativo={(elemento.alinhar ?? 'esquerda') === 'esquerda'} onClick={() => patch({ alinhar: 'esquerda' })}><Bars3BottomLeftIcon className="w-4 h-4" /></Ferramenta>
                  <Ferramenta rotulo="Centralizar" ativo={elemento.alinhar === 'centro'} onClick={() => patch({ alinhar: 'centro' })}><Bars3Icon className="w-4 h-4" /></Ferramenta>
                  <Ferramenta rotulo="Alinhar à direita" ativo={elemento.alinhar === 'direita'} onClick={() => patch({ alinhar: 'direita' })}><Bars3BottomRightIcon className="w-4 h-4" /></Ferramenta>
                  <Separador />
                  <Ferramenta rotulo="Uma linha, encolhe até caber" ativo={elemento.ajuste === 'encolher'} onClick={() => patch({ ajuste: elemento.ajuste === 'encolher' ? 'quebrar' : 'encolher', linhas: elemento.ajuste === 'encolher' ? (elemento.linhas ?? 1) : 1 })} data-testid="fmt-encolher"><ArrowsPointingInIcon className="w-4 h-4" /></Ferramenta>
                  {elemento.ajuste !== 'encolher' && (
                    <span className="inline-flex items-center" title="Linhas (auto = quantas couberem na caixa)">
                      <Ferramenta rotulo="Menos linhas" onClick={() => patch({ linhas: Math.max(0, (elemento.linhas ?? 0) - 1) })}><MinusIcon className="w-3.5 h-3.5" /></Ferramenta>
                      <span className="w-12 text-center tabular-nums text-sm text-fg-token" data-testid="fmt-linhas">{(elemento.linhas ?? 0) === 0 ? 'auto' : `${elemento.linhas} lin`}</span>
                      <Ferramenta rotulo="Mais linhas" onClick={() => { const n = Math.min(20, (elemento.linhas ?? 0) + 1); const alturaMinima = Number((n * (elemento.tamanho ?? 2.5) * 1.15 + 0.6).toFixed(1)); patch({ linhas: n, h: Math.max(elemento.h, alturaMinima) }); }}><span className="text-base leading-none">+</span></Ferramenta>
                    </span>
                  )}
                  <Separador />
                </>
              )}
              {(elemento.tipo === 'qr' || elemento.tipo === 'barras') && (
                <>
                  <select aria-label="Conteúdo" className="controle h-8 px-2 text-sm" value={elemento.campo ?? ''} onChange={(e) => patch({ campo: e.target.value as ElementoDoLayout['campo'] })}>
                    {CAMPOS.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
                  </select>
                  <Separador />
                </>
              )}
              {elemento.tipo === 'tabela' && (
                <>
                  <select aria-label="Fonte" className="controle h-8 px-2 text-sm" value={elemento.fonte ?? 'sans'} onChange={(e) => patch({ fonte: e.target.value as ElementoDoLayout['fonte'] })}>
                    {FONTES.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
                  </select>
                  <Separador />
                </>
              )}
              {elemento.tipo === 'caixa' && (
                <span className="inline-flex items-center" title="Espessura (mm)">
                  <Ferramenta rotulo="Borda mais fina" onClick={() => patch({ espessura: Math.max(0.1, Number(((elemento.espessura ?? 0.3) - 0.1).toFixed(1))) })}><MinusIcon className="w-3.5 h-3.5" /></Ferramenta>
                  <span className="w-8 text-center tabular-nums text-sm text-fg-token">{(elemento.espessura ?? 0.3).toFixed(1)}</span>
                  <Ferramenta rotulo="Borda mais grossa" onClick={() => patch({ espessura: Math.min(10, Number(((elemento.espessura ?? 0.3) + 0.1).toFixed(1))) })}><span className="text-base leading-none">+</span></Ferramenta>
                  <Separador />
                </span>
              )}
              <Ferramenta rotulo="Centralizar na etiqueta" onClick={() => aplicar(moverElemento(layout, elemento.id, (layout.etiqueta.largura - elemento.w) / 2 - elemento.x, 0))}><ViewfinderCircleIcon className="w-4 h-4" /></Ferramenta>
              <Ferramenta rotulo="Duplicar" dica="Duplicar (Ctrl+D)" onClick={() => { const l = duplicarElemento(layout, elemento.id); aplicar(l); setSelecionado(l.elementos[l.elementos.length - 1].id); }}><DocumentDuplicateIcon className="w-4 h-4" /></Ferramenta>
              <Ferramenta rotulo="Remover elemento" dica="Remover (Delete)" onClick={() => { aplicar(removerElemento(layout, elemento.id)); setSelecionado(null); }}><TrashIcon className="w-4 h-4" /></Ferramenta>
            </div>
          )}

          <div ref={mesaRef} className="superficie overflow-auto bg-surface-2 p-4" style={{ maxHeight: '66vh' }} data-testid="des-mesa"
            onPointerDown={(e) => { if (e.target === e.currentTarget) setSelecionado(null); }}>
            <div className="inline-grid" style={{ gridTemplateColumns: `${REGUA}px ${larguraPapel}px`, gridTemplateRows: `${REGUA}px ${alturaPapel + alturaVao}px` }}>
              <div />
              <Regua mm={layout.papel.largura} escala={escala} eixo="x" />
              <Regua mm={layout.etiqueta.altura + (layout.papel.vao_linhas ?? 0)} escala={escala} eixo="y" />
              <div
                className="relative select-none shadow-repouso"
                style={{ width: larguraPapel, height: alturaPapel + alturaVao, background: alturaVao ? `linear-gradient(#fff, #fff) 0 0 / 100% ${alturaPapel}px no-repeat, repeating-linear-gradient(45deg, rgba(0,0,0,.08) 0 3px, transparent 3px 8px)` : '#fff', color: '#111' }}
                data-testid="des-papel"
                onPointerDown={(e) => { if (e.target === e.currentTarget) setSelecionado(null); }}
              >
                {verComoSai && preview && (
                  <img src={`data:image/png;base64,${preview.png}`} alt="Como sai na impressora" data-testid="des-preview"
                    className="pointer-events-none absolute left-0 top-0"
                    style={{ width: px(preview.largura), height: px(preview.altura), imageRendering: escala > 4 ? 'pixelated' : 'auto' }} />
                )}
                {Array.from({ length: layout.papel.colunas }).map((_, col) => {
                  const x = px(margem + col * (layout.etiqueta.largura + layout.papel.espaco));
                  const ativa = col === 0;
                  return (
                    <div key={col} className="absolute top-0" style={{ left: x, width: px(layout.etiqueta.largura), height: alturaPapel, outline: '1px dashed rgba(0,0,0,.25)', outlineOffset: -1 }}>
                      {!verComoSai && layout.elementos.map((el) => {
                        const sel = ativa && el.id === selecionado;
                        const w = px(el.w); const h = px(el.h);
                        return (
                          <div
                            key={el.id}
                            role={ativa ? 'button' : undefined}
                            tabIndex={ativa ? 0 : undefined}
                            aria-label={ativa ? `${NOMES[el.tipo]}: ${nomeDoElemento(el)}` : undefined}
                            data-testid={ativa ? `el-${el.id}` : undefined}
                            onPointerDown={ativa ? (e) => iniciarMover(e, el) : undefined}
                            onFocus={ativa ? () => setSelecionado(el.id) : undefined}
                            className={`absolute overflow-hidden leading-tight ${ativa ? 'cursor-move' : 'pointer-events-none opacity-40'} ${el.tipo === 'linha' || el.tipo === 'caixa' ? '' : 'px-px'}`}
                            style={{
                              left: px(el.x), top: px(el.y), width: w, height: h,
                              fontSize: el.tipo === 'texto' ? Math.max(4, px(el.tamanho || 2.5) * 0.85) : Math.max(8, px(2)),
                              fontWeight: el.negrito ? 700 : 400,
                              whiteSpace: el.ajuste === 'encolher' ? 'nowrap' : 'normal',
                              textAlign: el.alinhar === 'centro' ? 'center' : el.alinhar === 'direita' ? 'right' : 'left',
                              fontFamily: CSS_FONTE[el.fonte ?? 'sans'],
                              background: el.tipo === 'linha' ? '#111' : el.tipo === 'qr' || el.tipo === 'barras' ? 'rgba(0,0,0,.06)' : undefined,
                              border: el.tipo === 'caixa' ? `${Math.max(1, px(el.espessura || 0.3))}px solid #111` : undefined,
                              boxShadow: sel ? '0 0 0 1.5px var(--brand)' : ativa ? '0 0 0 1px rgba(0,0,0,.12)' : undefined,
                            }}
                          >
                            {el.tipo === 'texto' ? textoDeExemplo(el.texto || '', ETIQUETA_DE_EXEMPLO)
                              : el.tipo === 'qr' ? <QrCodeIcon className="h-full w-full opacity-60" />
                                : el.tipo === 'barras' ? <span className="text-xs">|||| ||| ||||</span>
                                  : el.tipo === 'tabela' ? (
                                    <div className="flex h-full w-full flex-col" style={{ border: '2px solid #111', fontFamily: CSS_FONTE.sans }}>
                                      <div className="truncate text-center font-bold" style={{ fontSize: Math.max(6, Math.min(h * 0.07, w * 0.055)), borderBottom: '1px solid #111' }}>INFORMAÇÃO NUTRICIONAL</div>
                                      <div style={{ fontSize: Math.max(4, h * 0.035), padding: '0 2px', borderBottom: '3px solid #111' }}>Porções por embalagem · Porção</div>
                                      <div className="flex-1" style={{ backgroundImage: 'repeating-linear-gradient(#111 0 1px, transparent 1px 100%)', backgroundSize: `100% ${Math.max(4, (h * 0.58) / 11)}px`, backgroundPosition: '0 0', opacity: 0.35 }} />
                                    </div>
                                  ) : null}
                            {sel && ALCAS.map((a) => (
                              <span key={a.alca} role="presentation" data-testid={`alca-${a.alca}`}
                                onPointerDown={(e) => iniciarAlca(e, el, a.alca)}
                                className="absolute h-2 w-2 rounded-sm bg-brand"
                                style={{ ...a.estilo(w, h), cursor: a.cursor, boxShadow: '0 0 0 1px #fff' }} />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {guia.x != null && <div className="pointer-events-none absolute top-0 h-full w-px bg-info-token" style={{ left: px(margem + guia.x) }} />}
                {guia.y != null && <div className="pointer-events-none absolute left-0 w-full h-px bg-info-token" style={{ top: px(guia.y) }} />}
              </div>
            </div>
          </div>
          <p className="text-xs tabular-nums text-fg-muted-token">
            {layout.papel.largura} mm · {layout.papel.colunas} × {layout.etiqueta.largura} × {layout.etiqueta.altura} mm · margem {margem.toFixed(1)} mm
            {problema && <span className="ml-2 text-danger-token" role="alert">{problema}</span>}
          </p>
        </section>

        {/* ---------- direita ---------- */}
        <aside className="space-y-3">
          {elemento && (
            <div className="superficie p-3 space-y-2" data-testid="des-props">
              <p className="text-sm font-semibold text-fg-token">{NOMES[elemento.tipo]}</p>
              {elemento.tipo === 'texto' && (
                <Input label="Texto" value={elemento.texto || ''} onChange={(e) => patch({ texto: e.target.value })} data-testid="prop-texto" />
              )}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                <Medida rotulo="X" valor={elemento.x} min={0} max={300} step={0.1} onMudar={(v) => aplicar(moverElemento(layout, elemento.id, v - elemento.x, 0))} data-testid="prop-x" />
                <Medida rotulo="Y" valor={elemento.y} min={0} max={300} step={0.1} onMudar={(v) => aplicar(moverElemento(layout, elemento.id, 0, v - elemento.y))} data-testid="prop-y" />
                <Medida rotulo="Largura" valor={elemento.w} min={0.5} max={300} step={0.1} onMudar={(v) => aplicar(redimensionarPorAlca(layout, elemento.id, 'l', v - elemento.w, 0))} data-testid="prop-w" />
                <Medida rotulo="Altura" valor={elemento.h} min={0.5} max={300} step={0.1} onMudar={(v) => aplicar(redimensionarPorAlca(layout, elemento.id, 's', 0, v - elemento.h))} data-testid="prop-h" />
              </div>
            </div>
          )}

          <div className="superficie p-3 space-y-2">
            <p className="text-sm font-semibold text-fg-token">Etiqueta</p>
            {irmaosDoRolo(layouts, modelo).length > 0 && (
              <p className="text-xs text-fg-muted-token" data-testid="des-rolo-irmaos">Mesmo rolo que {irmaosDoRolo(layouts, modelo).join(' e ')}</p>
            )}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <Medida rotulo="Largura" valor={layout.etiqueta.largura} min={5} max={300} onMudar={(v) => setEtiqueta({ largura: v })} data-testid="lay-larg" />
              <Medida rotulo="Altura" valor={layout.etiqueta.altura} min={5} max={300} onMudar={(v) => setEtiqueta({ altura: v })} data-testid="lay-alt" />
              <Medida rotulo="Colunas" valor={layout.papel.colunas} min={1} max={12} step={1} sufixo="" onMudar={(v) => setPapel({ colunas: Math.round(v) })} data-testid="lay-cols" />
              <Medida rotulo="Vão colunas" valor={layout.papel.espaco} min={0} max={50} onMudar={(v) => setPapel({ espaco: v })} data-testid="lay-vao" />
              <Medida rotulo="Vão linhas" valor={layout.papel.vao_linhas ?? 0} min={0} max={100} onMudar={(v) => setPapel({ vao_linhas: v })} data-testid="lay-vao-linhas" />
              {temMargensMedidas(layout)
                ? <Medida rotulo="Rolo" valor={layout.papel.largura} min={5} max={400} desabilitado onMudar={() => undefined} />
                : <Medida rotulo="Rolo" valor={layout.papel.largura} min={5} max={400} onMudar={(v) => setPapel({ largura: v })} data-testid="lay-papel" />}
              <Medida rotulo="Margem esq." valor={layout.papel.margem_esquerda ?? 0} min={0} max={200} onMudar={(v) => setPapel({ margem_esquerda: v })} data-testid="lay-margem-esq" />
              <Medida rotulo="Margem dir." valor={layout.papel.margem_direita ?? 0} min={0} max={200} onMudar={(v) => setPapel({ margem_direita: v })} data-testid="lay-margem-dir" />
            </div>
            <Select rotulo="Tipo de rolo" opcoes={MODOS_DE_MIDIA} valor={layout.papel.modo_midia ?? 'gap'} onMudar={(v) => setPapel({ modo_midia: v as LayoutDeEtiqueta['papel']['modo_midia'] })} data-testid="lay-modo" />
            {layout.papel.modo_midia === 'continuo' && (
              <Medida rotulo="Passo entre linhas" valor={layout.papel.passo ?? layout.etiqueta.altura} min={layout.etiqueta.altura} max={400} onMudar={(v) => setPapel({ passo: v })} data-testid="lay-passo" />
            )}
            {!temMargensMedidas(layout) && Math.abs(layout.papel.largura - blocoMm(layout)) > 0.01 && (
              <button type="button" className="text-xs text-brand underline" onClick={() => aplicar(ajustarPapelAoBloco(layout))}>Rolo = {blocoMm(layout)} mm</button>
            )}
          </div>

          {agentes.length > 0 && (
            <div className="superficie p-3 space-y-2" data-testid="des-impressora">
              <p className="text-sm font-semibold text-fg-token">Impressora</p>
              <Select rotuloOculto="Impressora" opcoes={agentes.map((a) => ({ valor: a.id, rotulo: `${a.name} · ${a.printer_name}` }))} valor={agente} onMudar={setAgente} />
              <div className="flex flex-wrap gap-1.5">
                <Button variant="secondary" size="sm" disabled={!agente || !!ocupado || !!problema} onClick={imprimirTeste} data-testid="des-teste" title="Imprime uma linha com dados de exemplo">
                  <PrinterIcon className="w-4 h-4" />{ocupado === 'teste' ? 'Enviando…' : 'Teste'}
                </Button>
                <Button variant="secondary" size="sm" disabled={!agente || !!ocupado || !!problema} onClick={imprimirGrade} data-testid="cal-imprimir-grade" title="Imprime moldura e régua em mm; leia o deslocamento e ajuste abaixo">
                  <ViewfinderCircleIcon className="w-4 h-4" />{ocupado === 'grade' ? 'Enviando…' : 'Grade'}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                <Medida rotulo="Horizontal" valor={cal.desloc_x ?? 0} min={-30} max={30} onMudar={(v) => setCal((c) => ({ ...c, desloc_x: v }))} data-testid="cal-x" />
                <Medida rotulo="Vertical" valor={cal.desloc_y ?? 0} min={-15} max={15} onMudar={(v) => setCal((c) => ({ ...c, desloc_y: v }))} data-testid="cal-y" />
                <Medida rotulo="Escuro" valor={cal.escuro ?? 10} min={0} max={30} step={1} sufixo="" onMudar={(v) => setCal((c) => ({ ...c, escuro: v }))} data-testid="cal-escuro" />
              </div>
              <Button variant="secondary" size="sm" disabled={!agente || !!ocupado} onClick={salvarCal} data-testid="cal-salvar">Salvar calibração</Button>
            </div>
          )}
        </aside>
      </div>
    </PageShell>
  );
};

export default DesignerDeEtiqueta;
