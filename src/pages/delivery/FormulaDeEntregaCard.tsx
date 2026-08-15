/**
 * O preço da entrega em cinco campos, com o resultado à vista.
 *
 * Antes eram DUAS telas discordando: `StoreSettingsPage` gravava a fórmula em
 * `metadata` e esta página mantinha 16 faixas de 1 km no banco. As faixas
 * tinham precedência, então a fórmula que o dono editava não valia nada — e as
 * 16 linhas eram três números digitados dezesseis vezes, com uma
 * irregularidade escondida (a faixa 3-5km cobria 2 km).
 *
 * Aqui a fórmula é a fonte. A prévia ao lado existe porque taxa base, raio
 * plano e R$/km não dizem nada sozinhos: o dono pensa em "quanto custa entregar
 * no Plano Diretor", não em coeficientes. Ele digita e vê o preço mudar.
 */
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, Button } from '../../components/ui';
import {
  precoParaDistancia,
  previaDePrecos,
  problemasDaFormula,
  type FormulaDeEntrega,
} from './precoDaEntrega';

/** Chaves reais em `store.metadata` — o backend lê exatamente estas. */
const CHAVES = {
  taxaBase: 'delivery_base_fee',
  raioPlanoKm: 'delivery_flat_km',
  porKm: 'delivery_fee_per_km',
  encareceEmKm: 'delivery_far_km',
  porKmLonge: 'delivery_fee_per_km_far',
  raioMaximoKm: 'delivery_max_distance',
  taxaMaxima: 'delivery_max_fee',
} as const;

const numeroOuNulo = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function lerFormula(metadata: Record<string, unknown>): FormulaDeEntrega {
  return {
    taxaBase: numeroOuNulo(metadata[CHAVES.taxaBase]) ?? 7,
    // `delivery_free_km` é o nome legado da mesma ideia; o backend aceita os dois.
    raioPlanoKm: numeroOuNulo(metadata[CHAVES.raioPlanoKm]) ?? numeroOuNulo(metadata.delivery_free_km) ?? 2,
    porKm: numeroOuNulo(metadata[CHAVES.porKm]) ?? 1,
    encareceEmKm: numeroOuNulo(metadata[CHAVES.encareceEmKm]),
    porKmLonge: numeroOuNulo(metadata[CHAVES.porKmLonge]),
    raioMaximoKm: numeroOuNulo(metadata[CHAVES.raioMaximoKm])
      ?? numeroOuNulo(metadata.delivery_max_km) ?? 16,
    taxaMaxima: numeroOuNulo(metadata[CHAVES.taxaMaxima]),
  };
}

export function gravarFormula(
  metadata: Record<string, unknown>,
  f: FormulaDeEntrega,
): Record<string, unknown> {
  // Devolve o metadata INTEIRO: um PATCH com metadata parcial apaga o resto
  // (rastreamento do Meta, Clarity, config fiscal moram no mesmo objeto).
  return {
    ...metadata,
    [CHAVES.taxaBase]: f.taxaBase,
    [CHAVES.raioPlanoKm]: f.raioPlanoKm,
    [CHAVES.porKm]: f.porKm,
    [CHAVES.raioMaximoKm]: f.raioMaximoKm,
    // Opcionais saem do objeto quando vazios, em vez de virar 0 — zero aqui
    // significaria "km de graça" e "taxa teto zero".
    ...(f.encareceEmKm ? { [CHAVES.encareceEmKm]: f.encareceEmKm } : { [CHAVES.encareceEmKm]: undefined }),
    ...(f.porKmLonge ? { [CHAVES.porKmLonge]: f.porKmLonge } : { [CHAVES.porKmLonge]: undefined }),
    ...(f.taxaMaxima ? { [CHAVES.taxaMaxima]: f.taxaMaxima } : { [CHAVES.taxaMaxima]: undefined }),
  };
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CampoProps {
  id: string;
  rotulo: string;
  ajuda: string;
  valor: number | null | undefined;
  onChange: (v: number | null) => void;
  prefixo?: string;
  sufixo?: string;
  opcional?: boolean;
}

/** Um campo numérico com unidade e explicação — repetido 6 vezes, escrito 1. */
const Campo: React.FC<CampoProps> = ({
  id, rotulo, ajuda, valor, onChange, prefixo, sufixo, opcional,
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-fg-token">
      {rotulo}
      {opcional && <span className="ml-1 font-normal text-fg-muted-token">(opcional)</span>}
    </label>
    <div className="mt-1 flex items-center gap-2">
      {prefixo && <span className="text-sm text-fg-muted-token">{prefixo}</span>}
      <input
        id={id}
        type="number"
        min="0"
        step="0.5"
        inputMode="decimal"
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="w-28 rounded border border-border-token bg-transparent px-3 py-2 text-sm text-fg-token"
      />
      {sufixo && <span className="text-sm text-fg-muted-token">{sufixo}</span>}
    </div>
    <p className="mt-1 text-xs text-fg-muted-token">{ajuda}</p>
  </div>
);

interface Props {
  metadataAtual: Record<string, unknown>;
  onSalvar: (novoMetadata: Record<string, unknown>) => Promise<void>;
  /** Quantas faixas antigas ainda existem — só para avisar sobre a precedência. */
  faixasAtivas?: number;
}

export const FormulaDeEntregaCard: React.FC<Props> = ({
  metadataAtual, onSalvar, faixasAtivas = 0,
}) => {
  const [formula, setFormula] = useState<FormulaDeEntrega>(() => lerFormula(metadataAtual));
  const [salvando, setSalvando] = useState(false);

  const campo = (chave: keyof FormulaDeEntrega) => (v: number | null) =>
    setFormula((prev) => ({ ...prev, [chave]: v }));

  const problemas = useMemo(() => problemasDaFormula(formula), [formula]);
  const previa = useMemo(() => previaDePrecos(formula), [formula]);

  const salvar = async () => {
    if (problemas.length > 0) {
      toast.error('Corrija os avisos antes de salvar.');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar(gravarFormula(metadataAtual, formula));
      toast.success('Preço da entrega atualizado');
    } catch {
      toast.error('Não consegui salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-fg-token">Preço da entrega</h2>
        <p className="mt-1 text-sm text-fg-muted-token">
          Uma regra por distância, em vez de uma faixa por quilômetro. O cliente vê
          esse valor no checkout.
        </p>
      </div>

      {/* A precedência precisa estar dita na tela: enquanto houver faixa ativa,
          editar a fórmula não muda o que o cliente paga — foi exatamente esse
          silêncio que fez o dono editar um preço que não valia. */}
      {faixasAtivas > 0 && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-fg-token"
        >
          Existem <strong>{faixasAtivas} faixas manuais ativas</strong>, e elas têm
          prioridade sobre esta regra. Enquanto estiverem ligadas, o cliente paga o
          valor da faixa — não o desta fórmula.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="fe-base" rotulo="Taxa base" prefixo="R$"
            ajuda="Quanto custa qualquer entrega dentro do raio plano."
            valor={formula.taxaBase} onChange={campo('taxaBase')}
          />
          <Campo
            id="fe-plano" rotulo="Raio plano" sufixo="km"
            ajuda="Até aqui o cliente paga só a taxa base."
            valor={formula.raioPlanoKm} onChange={campo('raioPlanoKm')}
          />
          <Campo
            id="fe-porkm" rotulo="Por km adicional" prefixo="R$"
            ajuda="Cada quilômetro além do raio plano."
            valor={formula.porKm} onChange={campo('porKm')}
          />
          <Campo
            id="fe-maximo" rotulo="Raio máximo" sufixo="km"
            ajuda="Acima disso a loja não entrega."
            valor={formula.raioMaximoKm} onChange={campo('raioMaximoKm')}
          />
          <Campo
            id="fe-longe" rotulo="Encarece a partir de" sufixo="km" opcional
            ajuda="Deixe vazio se o preço por km é o mesmo em toda a distância."
            valor={formula.encareceEmKm} onChange={campo('encareceEmKm')}
          />
          <Campo
            id="fe-porkm-longe" rotulo="Por km depois disso" prefixo="R$" opcional
            ajuda="Só vale acima do ponto acima."
            valor={formula.porKmLonge} onChange={campo('porKmLonge')}
          />
          <Campo
            id="fe-teto" rotulo="Taxa máxima" prefixo="R$" opcional
            ajuda="Teto: com ele, longe demais fica caro em vez de indisponível."
            valor={formula.taxaMaxima} onChange={campo('taxaMaxima')}
          />
        </div>

        {/* Taxa base e R$/km não dizem nada sozinhos. O dono pensa em bairro e
            em distância, então a tela responde na moeda dele. */}
        <div className="rounded-xl border border-border-token bg-surface-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted-token">
            Quanto o cliente paga
          </p>
          <ul className="mt-3 space-y-2" data-testid="previa-de-precos">
            {previa.map(({ km, resultado }) => (
              <li key={km} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-fg-muted-token">{km} km</span>
                <span className="font-semibold tabular-nums text-fg-token">
                  {resultado.tipo === 'cobrado' ? fmt(resultado.valor) : 'Não entrega'}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-border-token pt-3 text-xs text-fg-muted-token">
            Atende até <strong>{formula.raioMaximoKm} km</strong>
            {(() => {
              const noLimite = precoParaDistancia(formula, formula.raioMaximoKm);
              return noLimite.tipo === 'cobrado' ? `, por ${fmt(noLimite.valor)}.` : '.';
            })()}
          </p>
        </div>
      </div>

      {problemas.length > 0 && (
        <ul role="alert" className="mt-4 space-y-1">
          {problemas.map((p) => (
            <li key={p} className="text-sm text-[var(--danger)]">{p}</li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex justify-end">
        <Button onClick={salvar} disabled={salvando || problemas.length > 0}>
          {salvando ? 'Salvando…' : 'Salvar preço'}
        </Button>
      </div>
    </Card>
  );
};

export default FormulaDeEntregaCard;
