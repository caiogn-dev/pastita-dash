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
  ArrowUturnLeftIcon, ArrowUturnRightIcon, ChevronDownIcon, ChevronUpIcon, DocumentDuplicateIcon,
  MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, NumberField, PageShell, Select, Switch } from '../../components/ui';
import { Loading } from '../../components/common';
import { getStores } from '../../services/storesApi';
import { normalizePaginatedResponse } from '../../services/api';
import {
  Calibracao, ElementoDoLayout, LayoutDeEtiqueta, LayoutsDaLoja, ModeloDesenhavel, MODELOS_DESENHAVEIS, PrintAgent,
  TipoDeElemento, calibracaoDoAgente, carregarLayouts, enviarEtiquetasParaAgente, imprimeEtiquetas,
  imprimirGradeDeCalibracao, listPrintAgents, previewDeEtiquetas, salvarCalibracao, salvarLayout,
} from '../../services/printing';
import {
  Alca, ETIQUETA_DE_EXEMPLO, Historico, ajustarPapelAoBloco, blocoMm, duplicarElemento, editarElemento, encaixar,
  encaixarNasGuias, guiasDoLayout, margemEsquerda, moverCamada, moverElemento, nomeDoElemento, novoElemento,
  problemaDoLayout, redimensionarPorAlca, removerElemento, textoDeExemplo,
} from './editorDeEtiqueta';

const PX_POR_MM_REAL = 96 / 25.4;
const ZOOMS = [2, 3, 4, PX_POR_MM_REAL, 5, 6, 8, 10, 12, 16];
const REGUA = 22; // px
const TOLERANCIA_GUIA = 0.4; // mm

const NOME_DO_MODELO: Record<ModeloDesenhavel, string> = { validade: 'Validade', 'nutricao-qr': 'QR da tabela nutricional', produto: 'Produto com código de barras' };
const NOMES: Record<TipoDeElemento, string> = { texto: 'Texto', qr: 'QR Code', barras: 'Código de barras', linha: 'Linha', caixa: 'Caixa' };
const CAMPOS = [
  { valor: 'name', rotulo: 'Nome do produto' }, { valor: 'manip', rotulo: 'Data de manipulação' },
  { valor: 'val', rotulo: 'Data de validade' }, { valor: 'price', rotulo: 'Preço' },
  { valor: 'description', rotulo: 'Descrição' }, { valor: 'barcode', rotulo: 'Código de barras' },
  { valor: 'publicUrl', rotulo: 'Link da tabela nutricional' },
];
const CAMPOS_RAPIDOS: { rotulo: string; texto: string; tamanho: number; negrito: boolean }[] = [
  { rotulo: 'Nome do produto', texto: '{name}', tamanho: 2.6, negrito: true },
  { rotulo: 'Validade', texto: 'Val.: {val}', tamanho: 2.8, negrito: true },
  { rotulo: 'Manipulação', texto: 'Manip.: {manip}', tamanho: 2.1, negrito: false },
  { rotulo: 'Preço', texto: '{price}', tamanho: 4, negrito: true },
];
const ALINHAR = [{ valor: 'esquerda', rotulo: 'Esquerda' }, { valor: 'centro', rotulo: 'Centro' }, { valor: 'direita', rotulo: 'Direita' }];
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
  const setPapel = (p: Partial<LayoutDeEtiqueta['papel']>) => aplicar({ ...layout, papel: { ...layout.papel, ...p } });
  const adicionar = (tipo: TipoDeElemento, extra: Partial<ElementoDoLayout> = {}) => {
    const l = novoElemento(layout, tipo);
    const novo = l.elementos[l.elementos.length - 1];
    const comExtra = { ...l, elementos: l.elementos.map((e) => (e.id === novo.id ? { ...e, ...extra } : e)) };
    aplicar(comExtra); setSelecionado(novo.id);
  };
  const desfazer = () => { const l = historico.current?.desfazer(); if (l) { setLayoutRaw(l); setSujo(true); } };
  const refazer = () => { const l = historico.current?.refazer(); if (l) { setLayoutRaw(l); setSujo(true); } };

  const salvar = async () => {
    if (problema) { toast.error(problema); return; }
    setOcupado('salvar');
    try {
      const { data } = await salvarLayout(storeUuid, modelo, layout);
      setLayouts({ ...layouts, [modelo]: data }); setSujo(false);
      toast.success('Layout salvo para todas as impressoras da loja.');
    } catch { toast.error('Não foi possível salvar o layout.'); } finally { setOcupado(null); }
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
    setOcupado('grade');
    try {
      await imprimirGradeDeCalibracao({ store: storeUuid, agent: agente, modelo, layout });
      toast.success(`Grade enviada para ${nomeDoAgente?.name ?? 'a impressora'}. Compare a moldura com a borda da etiqueta.`);
    } catch { toast.error('Não foi possível imprimir a grade.'); } finally { setOcupado(null); }
  };
  const imprimirTeste = async () => {
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

  return (
    <PageShell
      variante="quadro"
      titulo="Desenho da etiqueta"
      descricao={`${NOME_DO_MODELO[modelo]} · ${nomeDaLoja}${padrao ? ' · layout padrão' : sujo ? ' · alterações não salvas' : ' · layout da loja'}`}
      trilha={[{ rotulo: 'Etiquetas', href: `/stores/${storeId}/etiquetas` }, { rotulo: NOME_DO_MODELO[modelo] }]}
      acoes={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" aria-label="Desfazer" disabled={!historico.current?.podeDesfazer} onClick={desfazer} data-testid="des-desfazer"><ArrowUturnLeftIcon className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" aria-label="Refazer" disabled={!historico.current?.podeRefazer} onClick={refazer}><ArrowUturnRightIcon className="w-4 h-4" /></Button>
          <span className="mx-1 h-5 w-px bg-border-token" aria-hidden="true" />
          <Button variant="ghost" size="sm" aria-label="Diminuir zoom" disabled={zoomIdx === 0} onClick={() => setZoomIdx((z) => Math.max(0, z - 1))}><MagnifyingGlassMinusIcon className="w-4 h-4" /></Button>
          <button type="button" className="tabular-nums text-sm text-fg-muted-token hover:text-fg-token" title="Voltar ao tamanho real" onClick={() => setZoomIdx(3)}>
            {Math.round((escala / PX_POR_MM_REAL) * 100)}%
          </button>
          <Button variant="ghost" size="sm" aria-label="Aumentar zoom" disabled={zoomIdx === ZOOMS.length - 1} onClick={() => setZoomIdx((z) => Math.min(ZOOMS.length - 1, z + 1))}><MagnifyingGlassPlusIcon className="w-4 h-4" /></Button>
          <span className="mx-1 h-5 w-px bg-border-token" aria-hidden="true" />
          <Switch rotulo="Ver como sai" ligado={verComoSai} onMudar={setVerComoSai} />
          <span className="text-sm text-fg-muted-token">Ver como sai</span>
          <span className="mx-1 h-5 w-px bg-border-token" aria-hidden="true" />
          <Button variant="secondary" size="sm" disabled={!!ocupado || padrao} onClick={restaurar}>Restaurar padrão</Button>
          <Button variant="primary" size="sm" disabled={!!ocupado || !!problema || !sujo} onClick={salvar} data-testid="des-salvar">
            {ocupado === 'salvar' ? 'Salvando…' : 'Salvar layout'}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_320px]" data-testid="designer">
        {/* ---------- coluna esquerda: adicionar + camadas ---------- */}
        <aside className="space-y-4">
          <div className="superficie p-3 space-y-2">
            <p className="text-sm font-semibold text-fg-token">Adicionar</p>
            <div className="grid grid-cols-1 gap-1">
              {CAMPOS_RAPIDOS.map((c) => (
                <button key={c.texto} type="button" className="controle h-8 px-2 text-left text-sm hover:bg-surface-2"
                  onClick={() => adicionar('texto', { texto: c.texto, tamanho: c.tamanho, negrito: c.negrito, w: Math.min(30, layout.etiqueta.largura - 2), h: c.tamanho * 1.3 })}>
                  {c.rotulo}
                </button>
              ))}
            </div>
            <p className="pt-1 text-xs text-fg-muted-token">Outros</p>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(NOMES) as TipoDeElemento[]).map((t) => (
                <Button key={t} size="xs" variant="secondary" onClick={() => adicionar(t)}>{NOMES[t]}</Button>
              ))}
            </div>
          </div>

          <div className="superficie p-3 space-y-1" data-testid="des-camadas">
            <p className="text-sm font-semibold text-fg-token">Camadas</p>
            <p className="text-xs text-fg-muted-token">De cima para baixo: a primeira é desenhada por último.</p>
            <ul className="space-y-0.5">
              {[...layout.elementos].reverse().map((e) => (
                <li key={e.id} className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-sm ${e.id === selecionado ? 'bg-brand/15 text-fg-token' : 'text-fg-muted-token hover:bg-surface-2'}`}>
                  <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => setSelecionado(e.id)}>
                    <span className="text-xs text-fg-muted-token">{NOMES[e.tipo]} · </span>{nomeDoElemento(e)}
                  </button>
                  <button type="button" aria-label="Subir camada" className="p-0.5 hover:text-fg-token" onClick={() => aplicar(moverCamada(layout, e.id, 'cima'))}><ChevronUpIcon className="w-3.5 h-3.5" /></button>
                  <button type="button" aria-label="Descer camada" className="p-0.5 hover:text-fg-token" onClick={() => aplicar(moverCamada(layout, e.id, 'baixo'))}><ChevronDownIcon className="w-3.5 h-3.5" /></button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ---------- centro: a mesa ---------- */}
        <section className="min-w-0 space-y-2">
          <div ref={mesaRef} className="superficie overflow-auto bg-surface-2 p-4" style={{ maxHeight: '70vh' }} data-testid="des-mesa"
            onPointerDown={(e) => { if (e.target === e.currentTarget) setSelecionado(null); }}>
            <div className="inline-grid" style={{ gridTemplateColumns: `${REGUA}px ${larguraPapel}px`, gridTemplateRows: `${REGUA}px ${alturaPapel}px` }}>
              <div />
              <Regua mm={layout.papel.largura} escala={escala} eixo="x" />
              <Regua mm={layout.etiqueta.altura} escala={escala} eixo="y" />
              {/* o papel */}
              <div
                className="relative select-none shadow-repouso"
                style={{ width: larguraPapel, height: alturaPapel, background: '#fff', color: '#111' }}
                data-testid="des-papel"
                onPointerDown={(e) => { if (e.target === e.currentTarget) setSelecionado(null); }}
              >
                {verComoSai && preview && (
                  <img src={`data:image/png;base64,${preview.png}`} alt="Prévia real da impressão" data-testid="des-preview"
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
                              textAlign: el.alinhar === 'centro' ? 'center' : el.alinhar === 'direita' ? 'right' : 'left',
                              fontFamily: 'Verdana, "Bitstream Vera Sans", "DejaVu Sans", sans-serif',
                              background: el.tipo === 'linha' ? '#111' : el.tipo === 'qr' || el.tipo === 'barras' ? 'rgba(0,0,0,.06)' : undefined,
                              border: el.tipo === 'caixa' ? `${Math.max(1, px(el.espessura || 0.3))}px solid #111` : undefined,
                              boxShadow: sel ? '0 0 0 1.5px var(--brand)' : ativa ? '0 0 0 1px rgba(0,0,0,.12)' : undefined,
                            }}
                          >
                            {el.tipo === 'texto' ? textoDeExemplo(el.texto || '', ETIQUETA_DE_EXEMPLO) : el.tipo === 'qr' ? <span className="text-xs">QR</span> : el.tipo === 'barras' ? <span className="text-xs">|||| ||| ||||</span> : null}
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
                {/* guias de encaixe */}
                {guia.x != null && <div className="pointer-events-none absolute top-0 h-full w-px bg-info-token" style={{ left: px(margem + guia.x) }} />}
                {guia.y != null && <div className="pointer-events-none absolute left-0 w-full h-px bg-info-token" style={{ top: px(guia.y) }} />}
              </div>
            </div>
          </div>
          <p className="text-xs text-fg-muted-token">
            Arraste para mover, puxe as alças para esticar. Setas movem 0,5 mm (com Shift, 0,1 mm). Ctrl+Z desfaz, Ctrl+D duplica, Delete apaga.
            Segure Alt para não encaixar nas guias. Papel {layout.papel.largura} mm · {layout.papel.colunas} × {layout.etiqueta.largura} mm = {blocoMm(layout)} mm · margem {margem.toFixed(1)} mm.
          </p>
          {problema && <p className="text-sm text-danger-token" role="alert">{problema}</p>}
        </section>

        {/* ---------- coluna direita ---------- */}
        <aside className="space-y-4">
          <div className="superficie p-3 space-y-2" data-testid="des-props">
            {elemento ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-fg-token">{NOMES[elemento.tipo]}</p>
                  <span className="flex gap-1">
                    <button type="button" aria-label="Duplicar elemento" className="p-1 text-fg-muted-token hover:text-fg-token" onClick={() => { const l = duplicarElemento(layout, elemento.id); aplicar(l); setSelecionado(l.elementos[l.elementos.length - 1].id); }}><DocumentDuplicateIcon className="w-4 h-4" /></button>
                    <button type="button" aria-label="Remover elemento" className="p-1 text-fg-muted-token hover:text-danger-token" onClick={() => { aplicar(removerElemento(layout, elemento.id)); setSelecionado(null); }}><TrashIcon className="w-4 h-4" /></button>
                  </span>
                </div>
                {elemento.tipo === 'texto' && (
                  <>
                    <Input label="Texto" value={elemento.texto || ''} onChange={(e) => patch({ texto: e.target.value })} hint="Use {name}, {val}, {manip}, {price}, {description}" data-testid="prop-texto" />
                    <NumberField rotulo="Tamanho da letra" valor={elemento.tamanho ?? 2.5} min={0.8} max={60} step={0.1} sufixo="mm" onMudar={(v) => patch({ tamanho: v })} />
                    <NumberField rotulo="Linhas" valor={elemento.linhas ?? 1} min={1} max={20} step={1} onMudar={(v) => patch({ linhas: Math.round(v) })} />
                    <div className="flex items-center justify-between text-sm text-fg-muted-token">
                      <span>Negrito</span>
                      <Switch rotulo="Negrito" ligado={!!elemento.negrito} onMudar={(v) => patch({ negrito: v })} />
                    </div>
                    <Select rotulo="Alinhar" opcoes={ALINHAR} valor={elemento.alinhar ?? 'esquerda'} onMudar={(v) => patch({ alinhar: v as ElementoDoLayout['alinhar'] })} />
                  </>
                )}
                {(elemento.tipo === 'qr' || elemento.tipo === 'barras') && (
                  <Select rotulo="Conteúdo" opcoes={CAMPOS} valor={elemento.campo ?? ''} onMudar={(v) => patch({ campo: v as ElementoDoLayout['campo'] })} />
                )}
                {elemento.tipo === 'caixa' && (
                  <NumberField rotulo="Espessura" valor={elemento.espessura ?? 0.3} min={0.1} max={10} step={0.1} sufixo="mm" onMudar={(v) => patch({ espessura: v })} />
                )}
                <div className="space-y-2">
                  <NumberField rotulo="X" valor={elemento.x} min={0} max={300} step={0.1} sufixo="mm" onMudar={(v) => aplicar(moverElemento(layout, elemento.id, v - elemento.x, 0))} data-testid="prop-x" />
                  <NumberField rotulo="Y" valor={elemento.y} min={0} max={300} step={0.1} sufixo="mm" onMudar={(v) => aplicar(moverElemento(layout, elemento.id, 0, v - elemento.y))} data-testid="prop-y" />
                  <NumberField rotulo="Largura" valor={elemento.w} min={0.5} max={300} step={0.1} sufixo="mm" onMudar={(v) => aplicar(redimensionarPorAlca(layout, elemento.id, 'l', v - elemento.w, 0))} data-testid="prop-w" />
                  <NumberField rotulo="Altura" valor={elemento.h} min={0.5} max={300} step={0.1} sufixo="mm" onMudar={(v) => aplicar(redimensionarPorAlca(layout, elemento.id, 's', 0, v - elemento.h))} data-testid="prop-h" />
                </div>
              </>
            ) : (
              <p className="text-sm text-fg-muted-token">Clique num campo do papel para editar. Ou adicione um à esquerda.</p>
            )}
          </div>

          <div className="superficie p-3 space-y-2">
            <p className="text-sm font-semibold text-fg-token">Papel e rolo</p>
            <div className="space-y-2">
              <NumberField rotulo="Etiqueta (largura)" valor={layout.etiqueta.largura} min={5} max={300} step={0.5} sufixo="mm" onMudar={(v) => setEtiqueta({ largura: v })} data-testid="lay-larg" />
              <NumberField rotulo="Etiqueta (altura)" valor={layout.etiqueta.altura} min={5} max={300} step={0.5} sufixo="mm" onMudar={(v) => setEtiqueta({ altura: v })} data-testid="lay-alt" />
              <NumberField rotulo="Colunas" valor={layout.papel.colunas} min={1} max={12} step={1} onMudar={(v) => setPapel({ colunas: Math.round(v) })} data-testid="lay-cols" />
              <NumberField rotulo="Vão entre colunas" valor={layout.papel.espaco} min={0} max={50} step={0.5} sufixo="mm" onMudar={(v) => setPapel({ espaco: v })} data-testid="lay-vao" />
            </div>
            <NumberField rotulo="Largura do rolo inteiro" valor={layout.papel.largura} min={5} max={400} step={0.5} sufixo="mm" onMudar={(v) => setPapel({ largura: v })} data-testid="lay-papel" />
            <button type="button" className="text-xs text-brand underline" onClick={() => aplicar(ajustarPapelAoBloco(layout))}>
              Rolo = colunas ({blocoMm(layout)} mm)
            </button>
            <Select rotulo="Rolo" opcoes={MODOS_DE_MIDIA} valor={layout.papel.modo_midia ?? 'gap'} onMudar={(v) => setPapel({ modo_midia: v as LayoutDeEtiqueta['papel']['modo_midia'] })} data-testid="lay-modo" />
            {layout.papel.modo_midia === 'continuo' && (
              <NumberField rotulo="Passo entre linhas" valor={layout.papel.passo ?? layout.etiqueta.altura} min={layout.etiqueta.altura} max={400} step={0.5} sufixo="mm" onMudar={(v) => setPapel({ passo: v })} data-testid="lay-passo" />
            )}
          </div>

          {agentes.length > 0 && (
            <div className="superficie p-3 space-y-2" data-testid="des-impressora">
              <p className="text-sm font-semibold text-fg-token">Impressora</p>
              <Select rotulo="Impressora" opcoes={agentes.map((a) => ({ valor: a.id, rotulo: `${a.name} · ${a.printer_name}` }))} valor={agente} onMudar={setAgente} />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" disabled={!agente || !!ocupado || !!problema} onClick={imprimirTeste} data-testid="des-teste">
                  {ocupado === 'teste' ? 'Enviando…' : 'Imprimir 1 linha de teste'}
                </Button>
                <Button variant="secondary" size="sm" disabled={!agente || !!ocupado || !!problema} onClick={imprimirGrade} data-testid="cal-imprimir-grade">
                  {ocupado === 'grade' ? 'Enviando…' : 'Imprimir grade de calibração'}
                </Button>
              </div>
              <p className="text-xs text-fg-muted-token">
                A grade desenha a moldura e uma régua em mm onde o programa acha que a etiqueta está. Se a moldura saiu 2 mm à direita da borda real, digite −2 em horizontal.
              </p>
              <div className="space-y-2">
                <NumberField rotulo="Horizontal" valor={cal.desloc_x ?? 0} min={-30} max={30} step={0.5} sufixo="mm" onMudar={(v) => setCal((c) => ({ ...c, desloc_x: v }))} data-testid="cal-x" />
                <NumberField rotulo="Vertical" valor={cal.desloc_y ?? 0} min={-15} max={15} step={0.5} sufixo="mm" onMudar={(v) => setCal((c) => ({ ...c, desloc_y: v }))} data-testid="cal-y" />
                <NumberField rotulo="Escurecimento" valor={cal.escuro ?? 10} min={0} max={30} step={1} onMudar={(v) => setCal((c) => ({ ...c, escuro: v }))} data-testid="cal-escuro" />
              </div>
              <Button variant="secondary" size="sm" disabled={!agente || !!ocupado} onClick={salvarCal} data-testid="cal-salvar">Salvar calibração desta impressora</Button>
              <details className="text-xs text-fg-muted-token">
                <summary className="cursor-pointer">Antes de calibrar, na impressora</summary>
                <ol className="mt-1 list-decimal space-y-1 pl-4">
                  <li>Guia lateral encostado no papel, sem folga. Folga = etiqueta inclinada.</li>
                  <li>Calibrar o sensor a cada rolo novo: ligada, segure FEED até o led verde piscar 2 vezes. Sem isso a Elgin cai em "Contínuo" e desliza a cada etiqueta.</li>
                  <li>Sensor de etiquetas todo à esquerda, tipo "Gap".</li>
                </ol>
              </details>
            </div>
          )}
        </aside>
      </div>
    </PageShell>
  );
};

export default DesignerDeEtiqueta;
