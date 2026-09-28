/**
 * Editor visual da etiqueta ("Zebra Designer" do painel): arrasta os campos
 * em mm, vê a prévia REAL (o bitmap que a impressora vai receber) e calibra
 * a impressora com uma grade impressa — sem medir rolo com régua.
 *
 * Layout é da LOJA (igual na Zebra e na Elgin). Calibração é da IMPRESSORA
 * (cada agent guarda o seu deslocamento).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Button, Modal, Select } from '../../components/ui';
import { NumField } from './NumField';
import {
  Calibracao, ElementoDoLayout, LayoutDeEtiqueta, ModeloDesenhavel, PrintAgent, TipoDeElemento,
  calibracaoDoAgente, imprimirGradeDeCalibracao, previewDeEtiquetas, salvarCalibracao, salvarLayout,
} from '../../services/printing';
import {
  ETIQUETA_DE_EXEMPLO, ajustarPapelAoBloco, blocoMm, editarElemento, escalaDoCanvas, margemEsquerda,
  moverElemento, novoElemento, problemaDoLayout, redimensionarElemento, removerElemento, textoDeExemplo,
} from './editorDeEtiqueta';

interface Props {
  open: boolean;
  onClose: () => void;
  storeUuid: string;
  modelo: ModeloDesenhavel;
  layout: LayoutDeEtiqueta;
  padrao: boolean;
  agentes: PrintAgent[];
  agenteInicial?: string;
  onSalvo: (layout: LayoutDeEtiqueta, padrao: boolean) => void;
}

const LARGURA_DO_CANVAS = 700;
const NOMES: Record<TipoDeElemento, string> = { texto: 'Texto', qr: 'QR Code', barras: 'Código de barras', linha: 'Linha', caixa: 'Caixa' };
const CAMPOS = [
  { valor: 'name', rotulo: 'Nome do produto' }, { valor: 'manip', rotulo: 'Data de manipulação' },
  { valor: 'val', rotulo: 'Data de validade' }, { valor: 'price', rotulo: 'Preço' },
  { valor: 'description', rotulo: 'Descrição' }, { valor: 'barcode', rotulo: 'Código de barras' },
  { valor: 'publicUrl', rotulo: 'Link da tabela nutricional' },
];
const ALINHAR = [{ valor: 'esquerda', rotulo: 'Esquerda' }, { valor: 'centro', rotulo: 'Centro' }, { valor: 'direita', rotulo: 'Direita' }];

const rotuloNoCanvas = (e: ElementoDoLayout): string => {
  if (e.tipo === 'texto') return textoDeExemplo(e.texto || '', ETIQUETA_DE_EXEMPLO);
  if (e.tipo === 'qr') return 'QR';
  if (e.tipo === 'barras') return '▌▌▌ ▌▌ ▌▌▌';
  return '';
};

export const EditorDeEtiqueta: React.FC<Props> = ({ open, onClose, storeUuid, modelo, layout, padrao, agentes, agenteInicial, onSalvo }) => {
  const [rascunho, setRascunho] = useState<LayoutDeEtiqueta>(layout);
  const [selecionado, setSelecionado] = useState<string | null>(layout.elementos[0]?.id ?? null);
  const [preview, setPreview] = useState<{ png: string; largura: number; altura: number } | null>(null);
  const [previewErro, setPreviewErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [agente, setAgente] = useState(agenteInicial ?? agentes[0]?.id ?? '');
  const [cal, setCal] = useState<Calibracao>({});
  const [imprimindoGrade, setImprimindoGrade] = useState(false);
  const arrasto = useRef<{ id: string; x0: number; y0: number; ex: number; ey: number } | null>(null);

  useEffect(() => { if (open) { setRascunho(layout); setSelecionado(layout.elementos[0]?.id ?? null); } }, [open, layout]);
  useEffect(() => {
    const a = agentes.find((x) => x.id === agente);
    setCal(a ? { desloc_x: 0, desloc_y: 0, escuro: 10, ...calibracaoDoAgente(a) } : {});
  }, [agente, agentes]);

  const escala = escalaDoCanvas(rascunho.papel.largura, LARGURA_DO_CANVAS);
  const px = (mm: number) => mm * escala;
  const margem = margemEsquerda(rascunho);
  const problema = problemaDoLayout(rascunho);
  const elemento = rascunho.elementos.find((e) => e.id === selecionado) ?? null;
  const exemplos = useMemo(() => Array.from({ length: rascunho.papel.colunas }, () => ETIQUETA_DE_EXEMPLO), [rascunho.papel.colunas]);

  // Prévia real: o backend desenha o bitmap que vai para a impressora.
  useEffect(() => {
    if (!open || problema) return undefined;
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const { data } = await previewDeEtiquetas({ store: storeUuid, modelo, layout: rascunho, etiquetas: exemplos });
        if (vivo) { setPreview({ png: data.png, largura: data.largura_mm, altura: data.altura_mm }); setPreviewErro(null); }
      } catch {
        if (vivo) setPreviewErro('Não deu para gerar a prévia agora.');
      }
    }, 400);
    return () => { vivo = false; clearTimeout(t); };
  }, [open, rascunho, storeUuid, modelo, exemplos, problema]);

  const iniciarArrasto = (e: React.PointerEvent<HTMLDivElement>, el: ElementoDoLayout) => {
    e.preventDefault();
    setSelecionado(el.id);
    arrasto.current = { id: el.id, x0: e.clientX, y0: e.clientY, ex: el.x, ey: el.y };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const arrastar = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrasto.current;
    if (!a) return;
    const dx = (e.clientX - a.x0) / escala; const dy = (e.clientY - a.y0) / escala;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    setRascunho((l) => {
      const atual = l.elementos.find((x) => x.id === a.id);
      return atual ? moverElemento(l, a.id, a.ex + dx - atual.x, a.ey + dy - atual.y) : l;
    });
  };
  const soltar = () => { arrasto.current = null; };

  const patch = (p: Partial<ElementoDoLayout>) => { if (elemento) setRascunho((l) => editarElemento(l, elemento.id, p)); };
  const setEtiqueta = (p: Partial<LayoutDeEtiqueta['etiqueta']>) => setRascunho((l) => ({ ...l, etiqueta: { ...l.etiqueta, ...p } }));
  const setPapel = (p: Partial<LayoutDeEtiqueta['papel']>) => setRascunho((l) => ({ ...l, papel: { ...l.papel, ...p } }));

  const salvar = async () => {
    if (problema) { toast.error(problema); return; }
    setSalvando(true);
    try {
      const { data } = await salvarLayout(storeUuid, modelo, rascunho);
      onSalvo(data.layout, data.padrao);
      toast.success('Layout salvo. Vale para todas as impressoras desta loja.');
      onClose();
    } catch { toast.error('Não foi possível salvar o layout.'); } finally { setSalvando(false); }
  };
  const restaurar = async () => {
    setSalvando(true);
    try {
      const { data } = await salvarLayout(storeUuid, modelo, null);
      setRascunho(data.layout); onSalvo(data.layout, data.padrao);
      toast.success('Layout padrão restaurado.');
    } catch { toast.error('Não foi possível restaurar.'); } finally { setSalvando(false); }
  };
  const imprimirGrade = async () => {
    if (!agente) return;
    setImprimindoGrade(true);
    try {
      await imprimirGradeDeCalibracao({ store: storeUuid, agent: agente, modelo, layout: rascunho });
      toast.success('Grade enviada. Compare a moldura impressa com a borda da etiqueta e digite o deslocamento.');
    } catch { toast.error('Não foi possível imprimir a grade.'); } finally { setImprimindoGrade(false); }
  };
  const salvarCal = async () => {
    if (!agente) return;
    try {
      await salvarCalibracao(agente, cal);
      toast.success('Calibração salva nesta impressora.');
    } catch { toast.error('Não foi possível salvar a calibração.'); }
  };

  const nomeDoAgente = agentes.find((a) => a.id === agente);

  return (
    <Modal open={open} onClose={onClose} title={`Layout da etiqueta · ${modelo === 'validade' ? 'Validade' : modelo === 'nutricao-qr' ? 'QR Nutrição' : 'Produto'}`} className="max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]" data-testid="editor-etiqueta">
        <div className="space-y-4 min-w-0">
          {/* Canvas */}
          <div className="overflow-x-auto">
            <div
              data-testid="editor-canvas"
              className="relative bg-white text-black border border-border-token select-none"
              style={{ width: px(rascunho.papel.largura), height: px(rascunho.etiqueta.altura) }}
              onPointerMove={arrastar} onPointerUp={soltar} onPointerLeave={soltar}
            >
              {Array.from({ length: rascunho.papel.colunas }).map((_, col) => {
                const x = px(margem + col * (rascunho.etiqueta.largura + rascunho.papel.espaco));
                return (
                  <div key={col} className="absolute top-0 border border-dashed border-gray-400"
                    style={{ left: x, width: px(rascunho.etiqueta.largura), height: px(rascunho.etiqueta.altura) }}>
                    {rascunho.elementos.map((el) => {
                      const ativo = col === 0;
                      const sel = ativo && el.id === selecionado;
                      const fonte = el.tipo === 'texto' ? Math.max(6, px(el.tamanho || 2.5) * 0.85) : 10;
                      return (
                        <div
                          key={el.id}
                          role={ativo ? 'button' : undefined}
                          aria-label={ativo ? `${NOMES[el.tipo]} ${el.id}` : undefined}
                          data-testid={ativo ? `el-${el.id}` : undefined}
                          onPointerDown={ativo ? (e) => iniciarArrasto(e, el) : undefined}
                          className={`absolute overflow-hidden leading-tight ${ativo ? 'cursor-move' : 'opacity-40 pointer-events-none'} ${sel ? 'ring-2 ring-brand bg-brand/10' : 'ring-1 ring-gray-300/70'} ${el.tipo === 'linha' || el.tipo === 'caixa' ? '' : 'px-0.5'}`}
                          style={{
                            left: px(el.x), top: px(el.y), width: px(el.w), height: px(el.h),
                            fontSize: fonte, fontWeight: el.negrito ? 700 : 400,
                            textAlign: el.alinhar === 'centro' ? 'center' : el.alinhar === 'direita' ? 'right' : 'left',
                            background: el.tipo === 'linha' ? '#000' : undefined,
                            border: el.tipo === 'caixa' ? `${Math.max(1, px(el.espessura || 0.3))}px solid #000` : undefined,
                            fontFamily: el.tipo === 'texto' ? 'Verdana, "DejaVu Sans", sans-serif' : undefined,
                          }}
                        >
                          {rotuloNoCanvas(el)}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-fg-muted-token">
            Arraste os campos. Só a 1ª coluna é editável; as outras repetem. Papel {rascunho.papel.largura} mm,
            {' '}{rascunho.papel.colunas} × {rascunho.etiqueta.largura} mm ocupando {blocoMm(rascunho)} mm, margem de {margem.toFixed(1)} mm por lado.
          </p>
          {problema && <p className="text-sm text-danger-token" role="alert">{problema}</p>}

          {/* Prévia real */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-fg-token">Prévia real (o que a impressora recebe)</p>
            {preview ? (
              <img
                src={`data:image/png;base64,${preview.png}`}
                alt="Prévia da etiqueta como será impressa"
                data-testid="editor-preview"
                className="border border-border-token bg-white"
                style={{ width: px(preview.largura), height: px(preview.altura), imageRendering: 'pixelated' }}
              />
            ) : (
              <p className="text-xs text-fg-muted-token">{previewErro ?? 'Gerando prévia…'}</p>
            )}
          </div>

          {/* Calibração da impressora */}
          {agentes.length > 0 && (
            <div className="rounded-lg border border-border-token bg-surface-2 p-3 space-y-2" data-testid="editor-calibracao">
              <p className="text-sm font-semibold text-fg-token">Calibrar a impressora</p>
              <p className="text-xs text-fg-muted-token">
                Imprima a grade: ela desenha a moldura e uma régua em mm onde o programa acha que a etiqueta está.
                Se a moldura saiu 2 mm à direita da borda real, digite −2 em horizontal. Fica salvo só nesta impressora.
              </p>
              <Select rotulo="Impressora" opcoes={agentes.map((a) => ({ valor: a.id, rotulo: `${a.name} · ${a.printer_name}` }))} valor={agente} onMudar={setAgente} />
              <div className="grid gap-2 sm:grid-cols-3">
                <NumField label="Horizontal" value={cal.desloc_x ?? 0} min={-30} max={30} step={0.5} onChange={(v) => setCal((c) => ({ ...c, desloc_x: v }))} testId="cal-x" />
                <NumField label="Vertical" value={cal.desloc_y ?? 0} min={-15} max={15} step={0.5} onChange={(v) => setCal((c) => ({ ...c, desloc_y: v }))} testId="cal-y" />
                <NumField label="Escurecimento" value={cal.escuro ?? 10} min={0} max={30} step={1} suffix="" onChange={(v) => setCal((c) => ({ ...c, escuro: v }))} testId="cal-escuro" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" disabled={!agente || imprimindoGrade || !!problema} onClick={imprimirGrade} data-testid="cal-imprimir-grade">
                  {imprimindoGrade ? 'Enviando…' : `Imprimir grade na ${nomeDoAgente?.name ?? 'impressora'}`}
                </Button>
                <Button variant="secondary" size="sm" disabled={!agente} onClick={salvarCal} data-testid="cal-salvar">Salvar calibração</Button>
              </div>
            </div>
          )}
        </div>

        {/* Painel de propriedades */}
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-fg-token">Papel e etiqueta</p>
            <NumField label="Largura da etiqueta" value={rascunho.etiqueta.largura} min={5} max={300} onChange={(v) => setEtiqueta({ largura: v })} testId="lay-larg" />
            <NumField label="Altura da etiqueta" value={rascunho.etiqueta.altura} min={5} max={300} onChange={(v) => setEtiqueta({ altura: v })} testId="lay-alt" />
            <NumField label="Colunas no rolo" value={rascunho.papel.colunas} min={1} max={12} step={1} suffix="" onChange={(v) => setPapel({ colunas: Math.round(v) })} testId="lay-cols" />
            <NumField label="Vão entre colunas" value={rascunho.papel.espaco} min={0} max={50} onChange={(v) => setPapel({ espaco: v })} testId="lay-vao" />
            <NumField label="Largura do papel" value={rascunho.papel.largura} min={5} max={400} onChange={(v) => setPapel({ largura: v })} testId="lay-papel" />
            <button type="button" className="text-xs text-brand underline" onClick={() => setRascunho(ajustarPapelAoBloco)}>
              Papel = colunas ({blocoMm(rascunho)} mm)
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-fg-token">Adicionar</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(NOMES) as TipoDeElemento[]).map((t) => (
                <Button key={t} size="sm" variant="secondary" onClick={() => setRascunho((l) => { const n = novoElemento(l, t); setSelecionado(n.elementos[n.elementos.length - 1].id); return n; })}>
                  + {NOMES[t]}
                </Button>
              ))}
            </div>
          </div>

          {elemento ? (
            <div className="space-y-2 rounded-lg border border-border-token p-3" data-testid="editor-props">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-fg-token">{NOMES[elemento.tipo]}</p>
                <button type="button" aria-label="Remover elemento" className="text-fg-muted-token hover:text-danger-token"
                  onClick={() => { setRascunho((l) => removerElemento(l, elemento.id)); setSelecionado(null); }}>
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              {elemento.tipo === 'texto' && (
                <>
                  <label className="block text-xs text-fg-muted-token">
                    Texto (use {'{name}'}, {'{val}'}, {'{manip}'}, {'{price}'})
                    <input className="controle mt-1 h-9 w-full px-2 text-sm" value={elemento.texto || ''} onChange={(e) => patch({ texto: e.target.value })} data-testid="prop-texto" />
                  </label>
                  <NumField label="Tamanho da letra" value={elemento.tamanho ?? 2.5} min={0.8} max={60} step={0.1} onChange={(v) => patch({ tamanho: v })} />
                  <NumField label="Linhas" value={elemento.linhas ?? 1} min={1} max={20} step={1} suffix="" onChange={(v) => patch({ linhas: Math.round(v) })} />
                  <label className="flex items-center gap-2 text-sm text-fg-muted-token">
                    <input type="checkbox" checked={!!elemento.negrito} onChange={(e) => patch({ negrito: e.target.checked })} /> Negrito
                  </label>
                  <Select rotulo="Alinhar" opcoes={ALINHAR} valor={elemento.alinhar ?? 'esquerda'} onMudar={(v) => patch({ alinhar: v as ElementoDoLayout['alinhar'] })} />
                </>
              )}
              {(elemento.tipo === 'qr' || elemento.tipo === 'barras') && (
                <Select rotulo="Conteúdo" opcoes={CAMPOS} valor={elemento.campo ?? ''} onMudar={(v) => patch({ campo: v as ElementoDoLayout['campo'] })} />
              )}
              {elemento.tipo === 'caixa' && (
                <NumField label="Espessura" value={elemento.espessura ?? 0.3} min={0.1} max={10} step={0.1} onChange={(v) => patch({ espessura: v })} />
              )}
              <NumField label="X" value={elemento.x} min={0} max={300} step={0.1} onChange={(v) => setRascunho((l) => moverElemento(l, elemento.id, v - elemento.x, 0))} testId="prop-x" />
              <NumField label="Y" value={elemento.y} min={0} max={300} step={0.1} onChange={(v) => setRascunho((l) => moverElemento(l, elemento.id, 0, v - elemento.y))} testId="prop-y" />
              <NumField label="Largura" value={elemento.w} min={0.5} max={300} step={0.1} onChange={(v) => setRascunho((l) => redimensionarElemento(l, elemento.id, v, elemento.h))} testId="prop-w" />
              <NumField label="Altura" value={elemento.h} min={0.5} max={300} step={0.1} onChange={(v) => setRascunho((l) => redimensionarElemento(l, elemento.id, elemento.w, v))} testId="prop-h" />
            </div>
          ) : (
            <p className="text-xs text-fg-muted-token">Clique num campo do desenho para editar.</p>
          )}

          <div className="flex flex-col gap-2 pt-2 border-t border-border-token">
            <Button variant="primary" disabled={salvando || !!problema} onClick={salvar} data-testid="editor-salvar">
              {salvando ? 'Salvando…' : 'Salvar layout da loja'}
            </Button>
            <Button variant="secondary" disabled={salvando || padrao} onClick={restaurar} data-testid="editor-restaurar">Restaurar padrão</Button>
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EditorDeEtiqueta;
