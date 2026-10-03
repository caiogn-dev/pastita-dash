/**
 * ComboEditor — criar e editar combo numa tela só, com a prévia do cliente ao
 * lado. Substitui o formulário de 3 abas, que expunha o formato do banco
 * (seleções mínimas/máximas, override, SKU, "duplicatas de variantes").
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CameraIcon,
  ChevronDownIcon,
  LinkIcon,
  PlusIcon,
  Squares2X2Icon,
  SwatchIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, NumberField, StringListField, Switch, Textarea } from '../../ui';
import type { StoreCombo, StoreComboPayload, StoreProduct } from '../../../services/storesApi';
import { formatCurrency } from '../../../utils/formatters';
import {
  RascunhoDoCombo,
  GrupoDoCombo,
  TipoDeGrupo,
  rascunhoVazio,
  deCombo,
  paraPayload,
  novoGrupo,
  pendencias as calcularPendencias,
  precoAPartirDe,
} from './rascunhoDoCombo';
import { GrupoDeEscolha } from './GrupoDeEscolha';
import { PreviaDoCombo } from './PreviaDoCombo';

export interface ComboEditorProps {
  combo?: StoreCombo | null;
  storeId: string;
  produtos: StoreProduct[];
  salvando?: boolean;
  /** Falso quando o combo veio de "Duplicar": nasce como novo. */
  editando?: boolean;
  onSalvar: (payload: StoreComboPayload, foto?: File) => Promise<void>;
  onCancelar: () => void;
}

const Bloco: React.FC<{ titulo: string; acao?: React.ReactNode; children: React.ReactNode }> = ({ titulo, acao, children }) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted-token">{titulo}</h2>
      {acao}
    </div>
    {children}
  </section>
);

export const ComboEditor: React.FC<ComboEditorProps> = ({
  combo, storeId, produtos, salvando = false, editando = !!combo, onSalvar, onCancelar,
}) => {
  const [r, setR] = useState<RascunhoDoCombo>(() => (combo ? deCombo(combo, produtos) : rascunhoVazio()));
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoLocal, setFotoLocal] = useState<string>('');
  const [linkAberto, setLinkAberto] = useState(false);
  const [maisAberto, setMaisAberto] = useState(false);
  const [mostrarPendencias, setMostrarPendencias] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (fotoLocal) URL.revokeObjectURL(fotoLocal); }, [fotoLocal]);

  const pendencias = useMemo(() => calcularPendencias(r), [r]);
  const pendenciaDoGrupo = (chave: string) =>
    mostrarPendencias ? pendencias.find(p => p.grupo === chave)?.texto : undefined;
  const pendenciaGeral = (texto: string) => mostrarPendencias && pendencias.some(p => p.grupo === null && p.texto === texto);

  const mudar = <K extends keyof RascunhoDoCombo>(campo: K, valor: RascunhoDoCombo[K]) =>
    setR(prev => ({ ...prev, [campo]: valor }));

  const mudarGrupo = (g: GrupoDoCombo) =>
    setR(prev => ({ ...prev, grupos: prev.grupos.map(x => (x.chave === g.chave ? g : x)) }));

  const moverGrupo = (indice: number, direcao: -1 | 1) =>
    setR(prev => {
      const grupos = [...prev.grupos];
      const alvo = indice + direcao;
      [grupos[indice], grupos[alvo]] = [grupos[alvo], grupos[indice]];
      return { ...prev, grupos };
    });

  const adicionarGrupo = (tipo: TipoDeGrupo) => setR(prev => ({ ...prev, grupos: [...prev.grupos, novoGrupo(tipo)] }));

  const escolherFoto = (arquivo?: File | null) => {
    if (!arquivo || !arquivo.type.startsWith('image/')) return;
    setFoto(arquivo);
    setFotoLocal(URL.createObjectURL(arquivo));
  };

  const salvar = async () => {
    if (pendencias.length > 0) {
      setMostrarPendencias(true);
      const primeira = pendencias[0];
      const alvo = primeira.grupo
        ? document.querySelector(`[data-grupo="${primeira.grupo}"]`)
        : document.getElementById('combo-identidade');
      alvo?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }
    await onSalvar(paraPayload(r, storeId), foto || undefined);
  };

  const fotoMostrada = fotoLocal || r.fotoUrl;

  return (
    <div className="pb-24">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          {/* Identidade */}
          <div id="combo-identidade" className="superficie flex flex-col gap-4 p-5 sm:flex-row">
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => arquivoRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); escolherFoto(e.dataTransfer.files?.[0]); }}
                aria-label={fotoMostrada ? 'Trocar foto' : 'Escolher foto'}
                className="group relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border-token bg-surface-2 hover:border-brand"
              >
                {fotoMostrada ? (
                  <img src={fotoMostrada} alt="" className="h-full w-full object-cover" />
                ) : (
                  <CameraIcon className="h-8 w-8 text-fg-muted-token group-hover:text-brand" />
                )}
              </button>
              <input
                ref={arquivoRef}
                type="file"
                accept="image/*"
                className="hidden"
                data-testid="combo-foto-arquivo"
                onChange={e => escolherFoto(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => setLinkAberto(v => !v)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-ink hover:underline"
              >
                <LinkIcon className="h-3.5 w-3.5" /> Link da foto
              </button>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <input
                type="text"
                value={r.nome}
                onChange={e => mudar('nome', e.target.value)}
                placeholder="Nome do combo"
                aria-label="Nome do combo"
                aria-invalid={pendenciaGeral('Dê um nome') || undefined}
                className={`w-full border-0 border-b bg-transparent px-0 pb-2 text-2xl font-semibold text-fg-token placeholder:text-fg-muted-token focus:ring-0 ${
                  pendenciaGeral('Dê um nome') ? 'border-danger-token' : 'border-border-token focus:border-brand'
                }`}
              />
              <Textarea
                value={r.descricao}
                onChange={e => mudar('descricao', e.target.value)}
                rows={2}
                placeholder="Descrição para o cliente"
                aria-label="Descrição"
              />
              {linkAberto && (
                <Input
                  value={r.fotoUrl}
                  onChange={e => { mudar('fotoUrl', e.target.value); setFoto(null); setFotoLocal(''); }}
                  placeholder="https://"
                  aria-label="Link da foto"
                />
              )}
            </div>
          </div>

          {/* Preço */}
          <Bloco titulo="Preço">
            <div className="superficie space-y-4 p-5">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Como cobra">
                {[
                  { pelaSoma: false, rotulo: 'Preço fechado', icone: SwatchIcon },
                  { pelaSoma: true, rotulo: 'Soma das escolhas', icone: Squares2X2Icon },
                ].map(({ pelaSoma, rotulo, icone: Icone }) => (
                  <button
                    key={rotulo}
                    type="button"
                    role="radio"
                    aria-checked={r.precoPelaSoma === pelaSoma}
                    onClick={() => mudar('precoPelaSoma', pelaSoma)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                      r.precoPelaSoma === pelaSoma
                        ? 'border-brand bg-brand-soft text-fg-token'
                        : 'border-border-token text-fg-muted-token hover:bg-surface-2'
                    }`}
                  >
                    <Icone className="h-5 w-5" />
                    {rotulo}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <NumberField
                  rotulo={r.precoPelaSoma ? 'Valor base' : 'Preço'}
                  valor={r.preco}
                  min={0}
                  step={0.01}
                  data-testid="combo-preco"
                  onMudar={v => mudar('preco', v)}
                />
                <NumberField
                  rotulo="De (riscado)"
                  valor={r.precoDe ?? 0}
                  min={0}
                  step={0.01}
                  onMudar={v => mudar('precoDe', v > 0 ? v : undefined)}
                />
                <p className="ml-auto text-sm text-fg-muted-token">
                  Cliente paga <span className="font-semibold text-fg-token">{formatCurrency(precoAPartirDe(r))}</span>
                </p>
              </div>
              {pendenciaGeral('Defina o preço') && <p className="text-sm font-medium text-danger-token">Defina o preço</p>}
            </div>
          </Bloco>

          {/* Escolhas do cliente */}
          <Bloco titulo="O cliente escolhe">
            <div className="space-y-3">
              {r.grupos.map((g, i) => (
                <GrupoDeEscolha
                  key={g.chave}
                  grupo={g}
                  produtos={produtos}
                  pendencia={pendenciaDoGrupo(g.chave)}
                  onMudar={mudarGrupo}
                  onRemover={() => setR(prev => ({ ...prev, grupos: prev.grupos.filter(x => x.chave !== g.chave) }))}
                  onSubir={i > 0 ? () => moverGrupo(i, -1) : undefined}
                  onDescer={i < r.grupos.length - 1 ? () => moverGrupo(i, 1) : undefined}
                />
              ))}
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => adicionarGrupo('produtos')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border-token py-4 text-sm font-semibold text-fg-token hover:border-brand hover:bg-surface-2"
                >
                  <PlusIcon className="h-5 w-5" /> Escolha entre produtos
                </button>
                <button
                  type="button"
                  onClick={() => adicionarGrupo('variantes')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border-token py-4 text-sm font-semibold text-fg-token hover:border-brand hover:bg-surface-2"
                >
                  <PlusIcon className="h-5 w-5" /> Escolha de sabor ou tamanho
                </button>
              </div>
            </div>
          </Bloco>

          {/* Vem junto */}
          <Bloco titulo="Vem junto">
            <div className="superficie p-5">
              <StringListField
                label="Itens fixos"
                value={r.inclui}
                onChange={itens => mudar('inclui', itens)}
                placeholder="2 molhos"
                addLabel="Adicionar"
              />
            </div>
          </Bloco>

          {/* Mais */}
          <section className="superficie">
            <button
              type="button"
              onClick={() => setMaisAberto(v => !v)}
              aria-expanded={maisAberto}
              className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-fg-token"
            >
              Destaque, estoque e fidelidade
              <ChevronDownIcon className={`h-4 w-4 text-fg-muted-token transition-transform ${maisAberto ? 'rotate-180' : ''}`} />
            </button>
            {maisAberto && (
              <div className="space-y-4 border-t border-border-token px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fg-token">Destaque no cardápio</span>
                  <Switch ligado={r.destaque} onMudar={v => mudar('destaque', v)} rotulo="Destaque no cardápio" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fg-token">Controlar estoque</span>
                  <Switch ligado={r.controlarEstoque} onMudar={v => mudar('controlarEstoque', v)} rotulo="Controlar estoque" />
                </div>
                {r.controlarEstoque && (
                  <NumberField rotulo="Unidades" valor={r.estoque} min={0} onMudar={v => mudar('estoque', Math.max(0, Math.round(v)))} />
                )}
                <NumberField
                  rotulo="Selos de fidelidade por combo"
                  valor={r.selos ?? 0}
                  min={0}
                  onMudar={v => mudar('selos', v > 0 ? Math.round(v) : undefined)}
                />
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <PreviaDoCombo rascunho={r} produtos={produtos} fotoLocal={fotoLocal} />
        </aside>
      </div>

      {/* Barra de salvar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border-token bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <label className="flex items-center gap-2 text-sm text-fg-token">
            <Switch ligado={r.ativo} onMudar={v => mudar('ativo', v)} rotulo="No cardápio" />
            No cardápio
          </label>
          {mostrarPendencias && pendencias.length > 0 && (
            <span className="text-sm font-medium text-danger-token" role="status">
              {pendencias[0].texto}
              {pendencias.length > 1 ? ` e mais ${pendencias.length - 1}` : ''}
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>
            <Button type="button" onClick={salvar} isLoading={salvando} data-testid="combo-salvar">
              {editando ? 'Salvar' : 'Criar combo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComboEditor;
