import React, { useState } from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  GiftIcon,
  ArrowPathIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline';
import { NumberField, Select } from '../../ui';
import type { StoreProduct } from '../../../services/storesApi';
import { formatCurrency } from '../../../utils/formatters';
import {
  GrupoDoCombo,
  ModoDaRegra,
  OpcaoDoGrupo,
  regraDoGrupo,
  comRegra,
  comRepeticao,
  adicionarProdutos,
  removerOpcao,
  escolherProdutoBase,
  marcarComoBrinde,
  ehBrinde,
  aplicarDesconto,
  tituloParaOCliente,
} from './rascunhoDoCombo';
import { SeletorDeProdutos } from './SeletorDeProdutos';

interface Props {
  grupo: GrupoDoCombo;
  produtos: StoreProduct[];
  pendencia?: string;
  onMudar: (g: GrupoDoCombo) => void;
  onRemover: () => void;
  onSubir?: () => void;
  onDescer?: () => void;
}

const MODOS: { modo: ModoDaRegra; rotulo: string }[] = [
  { modo: 'exatamente', rotulo: 'Exatamente' },
  { modo: 'ate', rotulo: 'Até' },
  { modo: 'entre', rotulo: 'De … a' },
];

const Chip: React.FC<{ ligado: boolean; onClick: () => void; icone: React.ElementType; children: React.ReactNode }> = ({
  ligado, onClick, icone: Icone, children,
}) => (
  <button
    type="button"
    aria-pressed={ligado}
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
      ligado ? 'border-brand bg-brand-soft text-fg-token' : 'border-border-token text-fg-muted-token hover:bg-surface-2'
    }`}
  >
    <Icone className="h-4 w-4" />
    {children}
  </button>
);

const LinhaDaOpcao: React.FC<{
  opcao: OpcaoDoGrupo;
  podeRepetir: boolean;
  maximoDoGrupo: number;
  onMudar: (o: OpcaoDoGrupo) => void;
  onRemover: () => void;
}> = ({ opcao, podeRepetir, maximoDoGrupo, onMudar, onRemover }) => {
  const [editando, setEditando] = useState(false);
  const temPrecoProprio = opcao.precoProprio !== undefined;
  const semEstoque = opcao.estoque === 0;

  return (
    <li className="rounded-xl border border-border-token">
      <div className="flex items-center gap-3 p-2">
        {opcao.foto ? (
          <img src={opcao.foto} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" loading="lazy" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2" aria-hidden="true">
            <PhotoIcon className="h-5 w-5 text-fg-muted-token" />
          </span>
        )}
        <button
          type="button"
          onClick={() => setEditando(v => !v)}
          aria-expanded={editando}
          aria-label={`Ajustar ${opcao.nome}`}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-sm font-medium text-fg-token">{opcao.nome}</span>
          <span className="flex items-center gap-2 text-xs">
            {opcao.precoProprio === 0 ? (
              <span className="font-semibold text-success-token">Grátis</span>
            ) : (
              <span className={temPrecoProprio ? 'font-semibold text-fg-token' : 'text-fg-muted-token'}>
                {formatCurrency(opcao.precoProprio ?? opcao.preco)}
              </span>
            )}
            {temPrecoProprio && <span className="text-fg-muted-token line-through">{formatCurrency(opcao.preco)}</span>}
            {podeRepetir && opcao.maximo < maximoDoGrupo && (
              <span className="text-fg-muted-token">até {opcao.maximo}×</span>
            )}
            {semEstoque && <span className="font-semibold text-warning-token">Sem estoque</span>}
          </span>
        </button>
        <button
          type="button"
          onClick={onRemover}
          aria-label={`Tirar ${opcao.nome}`}
          className="rounded-lg p-1.5 text-fg-muted-token hover:bg-surface-2 hover:text-danger-token"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
      {editando && (
        <div className="grid grid-cols-2 gap-3 border-t border-border-token p-3">
          <div>
            <NumberField
              rotulo="Preço no combo"
              valor={opcao.precoProprio ?? opcao.preco}
              min={0}
              step={0.01}
              onMudar={v => onMudar({ ...opcao, precoProprio: v === opcao.preco ? undefined : v })}
            />
            {temPrecoProprio && (
              <button
                type="button"
                onClick={() => onMudar({ ...opcao, precoProprio: undefined })}
                className="mt-1 text-xs font-semibold text-brand-ink hover:underline"
              >
                Usar {formatCurrency(opcao.preco)}
              </button>
            )}
          </div>
          {podeRepetir && (
            <NumberField
              rotulo="Máximo desta opção"
              valor={opcao.maximo}
              min={1}
              max={maximoDoGrupo}
              onMudar={v => onMudar({ ...opcao, maximo: Math.max(1, Math.min(maximoDoGrupo, Math.round(v))) })}
            />
          )}
        </div>
      )}
    </li>
  );
};

export const GrupoDeEscolha: React.FC<Props> = ({
  grupo, produtos, pendencia, onMudar, onRemover, onSubir, onDescer,
}) => {
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [categoriasAbertas, setCategoriasAbertas] = useState(false);
  const categorias = Object.entries(
    produtos.reduce<Record<string, StoreProduct[]>>((acc, p) => {
      const nome = p.category_name || 'Sem categoria';
      (acc[nome] ||= []).push(p);
      return acc;
    }, {}),
  ).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  const [desconto, setDesconto] = useState(0);
  const regra = regraDoGrupo(grupo);
  const brinde = ehBrinde(grupo);
  const produtosComVariacao = produtos.filter(p => (p.variants || []).length > 0);

  const mudarModo = (modo: ModoDaRegra) =>
    onMudar(comRegra(grupo, modo, grupo.maximo, modo === 'entre' ? Math.max(1, grupo.minimo) : grupo.minimo));

  const mudarOpcao = (o: OpcaoDoGrupo) =>
    onMudar({ ...grupo, opcoes: grupo.opcoes.map(x => (x.chave === o.chave ? o : x)) });

  return (
    <section
      className={`superficie p-4 space-y-4 ${pendencia ? 'ring-1 ring-danger-token' : ''}`}
      aria-label={tituloParaOCliente(grupo, produtos)}
      data-grupo={grupo.chave}
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={grupo.titulo}
          onChange={e => onMudar({ ...grupo, titulo: e.target.value })}
          placeholder={tituloParaOCliente({ ...grupo, titulo: '' }, produtos)}
          aria-label="Título da escolha"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base font-semibold text-fg-token placeholder:text-fg-muted-token focus:ring-0"
        />
        {onSubir && (
          <button type="button" onClick={onSubir} aria-label="Subir" className="rounded-lg p-1.5 text-fg-muted-token hover:bg-surface-2">
            <ArrowUpIcon className="h-4 w-4" />
          </button>
        )}
        {onDescer && (
          <button type="button" onClick={onDescer} aria-label="Descer" className="rounded-lg p-1.5 text-fg-muted-token hover:bg-surface-2">
            <ArrowDownIcon className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onRemover} aria-label="Excluir escolha" className="rounded-lg p-1.5 text-fg-muted-token hover:bg-danger-soft hover:text-danger-token">
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {pendencia && <p className="text-sm font-medium text-danger-token">{pendencia}</p>}

      {grupo.tipo === 'variantes' && (
        <Select
          rotulo="Produto"
          valor={grupo.produtoBaseId || ''}
          vazio="Escolha o produto"
          opcoes={produtosComVariacao.map(p => ({ valor: p.id, rotulo: `${p.name} · ${p.variants.length} variações` }))}
          onMudar={id => {
            const p = produtos.find(x => x.id === id);
            if (p) onMudar(escolherProdutoBase(grupo, p));
          }}
        />
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="inline-flex rounded-xl border border-border-token p-0.5" role="radiogroup" aria-label="Regra">
          {MODOS.map(({ modo, rotulo }) => (
            <button
              key={modo}
              type="button"
              role="radio"
              aria-checked={regra.modo === modo}
              onClick={() => mudarModo(modo)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                regra.modo === modo ? 'bg-brand text-on-brand' : 'text-fg-muted-token hover:bg-surface-2'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        {regra.modo === 'entre' && (
          <NumberField
            rotulo="De"
            valor={grupo.minimo}
            min={0}
            max={grupo.maximo}
            onMudar={v => onMudar(comRegra(grupo, 'entre', grupo.maximo, v))}
          />
        )}
        <NumberField
          rotulo={regra.modo === 'entre' ? 'Até' : 'Quantidade'}
          valor={grupo.maximo}
          min={1}
          onMudar={v => onMudar(comRegra(grupo, regra.modo, v, grupo.minimo))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip ligado={grupo.podeRepetir} onClick={() => onMudar(comRepeticao(grupo, !grupo.podeRepetir))} icone={ArrowPathIcon}>
          Pode repetir
        </Chip>
        <Chip
          ligado={brinde}
          onClick={() => { setDesconto(0); onMudar(brinde ? aplicarDesconto(grupo, 0) : marcarComoBrinde(grupo)); }}
          icone={GiftIcon}
        >
          Brinde
        </Chip>
        {!brinde && grupo.opcoes.length > 0 && (
          <label className="inline-flex items-center gap-1.5 rounded-full border border-border-token px-3 py-1 text-sm text-fg-muted-token">
            Desconto
            <input
              type="number"
              min={0}
              max={100}
              value={desconto || ''}
              placeholder="0"
              onChange={e => {
                const pct = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                setDesconto(pct);
                onMudar(aplicarDesconto(grupo, pct));
              }}
              className="w-12 border-0 bg-transparent p-0 text-right text-sm text-fg-token focus:ring-0"
              aria-label="Desconto em porcentagem"
            />
            %
          </label>
        )}
      </div>

      {grupo.opcoes.length > 0 && (
        <ul className="space-y-2">
          {grupo.opcoes.map(o => (
            <LinhaDaOpcao
              key={o.chave}
              opcao={o}
              podeRepetir={grupo.podeRepetir}
              maximoDoGrupo={grupo.maximo}
              onMudar={mudarOpcao}
              onRemover={() => onMudar(removerOpcao(grupo, o.chave))}
            />
          ))}
        </ul>
      )}

      {grupo.tipo === 'produtos' && (
        <div className="relative grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSeletorAberto(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border-token py-2.5 text-sm font-semibold text-brand-ink hover:bg-surface-2"
          >
            <PlusIcon className="h-4 w-4" />
            {grupo.opcoes.length ? 'Mais opções' : 'Adicionar opções'}
          </button>
          <button
            type="button"
            onClick={() => setCategoriasAbertas(v => !v)}
            aria-expanded={categoriasAbertas}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border-token py-2.5 text-sm font-semibold text-brand-ink hover:bg-surface-2"
          >
            <RectangleStackIcon className="h-4 w-4" />
            Categoria inteira
          </button>
          {categoriasAbertas && (
            <div role="menu" className="superficie-alta absolute right-0 top-full z-20 mt-1 max-h-72 w-full overflow-y-auto py-1 sm:w-1/2">
              {categorias.map(([nome, lista]) => (
                <button
                  key={nome}
                  type="button"
                  role="menuitem"
                  onClick={() => { onMudar(adicionarProdutos(grupo, lista)); setCategoriasAbertas(false); }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-fg-token hover:bg-surface-2"
                >
                  {nome} · {lista.length}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <SeletorDeProdutos
        aberto={seletorAberto}
        produtos={produtos}
        jaEscolhidos={new Set(grupo.opcoes.map(o => o.produtoId || ''))}
        onFechar={() => setSeletorAberto(false)}
        onConfirmar={escolhidos => onMudar(adicionarProdutos(grupo, escolhidos))}
      />
    </section>
  );
};

export default GrupoDeEscolha;
