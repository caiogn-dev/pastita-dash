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
  distanciasDaPrevia,
  fraseDoPreco,
  previaDePrecos,
  problemasDaFormula,
  soValorFixo,
  type FormulaDeEntrega,
} from './precoDaEntrega';
import { formatCurrency, formatNumber } from '../../utils/formatters';

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
  const legadas: Record<string, unknown> = {};
  // O backend lê `delivery_max_km` e `max_delivery_distance_km` ANTES de
  // `delivery_max_distance`. Loja com chave antiga ignorava o raio salvo aqui.
  for (const k of ['delivery_max_km', 'max_delivery_distance_km']) {
    if (metadata[k] !== undefined && metadata[k] !== null) legadas[k] = f.raioMaximoKm;
  }
  return {
    ...metadata,
    [CHAVES.taxaBase]: f.taxaBase,
    [CHAVES.raioPlanoKm]: f.raioPlanoKm,
    [CHAVES.porKm]: f.porKm,
    [CHAVES.raioMaximoKm]: f.raioMaximoKm,
    ...legadas,
    // Opcionais saem do objeto quando vazios, em vez de virar 0 — zero aqui
    // significaria "km de graça" e "taxa teto zero".
    ...(f.encareceEmKm ? { [CHAVES.encareceEmKm]: f.encareceEmKm } : { [CHAVES.encareceEmKm]: undefined }),
    ...(f.porKmLonge ? { [CHAVES.porKmLonge]: f.porKmLonge } : { [CHAVES.porKmLonge]: undefined }),
    ...(f.taxaMaxima ? { [CHAVES.taxaMaxima]: f.taxaMaxima } : { [CHAVES.taxaMaxima]: undefined }),
  };
}

/**
 * "Não entrego depois" é a fórmula com o máximo colado no raio fixo — sem
 * degrau e sem teto, porque um teto transformaria "não entrego" em "entrego
 * caro" (o backend atende acima do máximo quando há teto).
 */
export function formulaEfetiva(f: FormulaDeEntrega, depois: Depois): FormulaDeEntrega {
  if (depois === 'porKm') return f;
  return { ...f, raioMaximoKm: f.raioPlanoKm, encareceEmKm: null, porKmLonge: null, taxaMaxima: null };
}

export type Depois = 'naoEntrega' | 'porKm';

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

const inputNumero =
  'w-24 rounded border border-border-token bg-transparent px-3 py-2 text-base font-semibold tabular-nums text-fg-token';

const OPCOES_DEPOIS: { valor: Depois; rotulo: string }[] = [
  { valor: 'naoEntrega', rotulo: 'Não entrego' },
  { valor: 'porKm', rotulo: 'Cobro por km' },
];

export const FormulaDeEntregaCard: React.FC<Props> = ({
  metadataAtual, onSalvar, faixasAtivas = 0,
}) => {
  const [formula, setFormula] = useState<FormulaDeEntrega>(() => lerFormula(metadataAtual));
  const [depois, setDepois] = useState<Depois>(() =>
    soValorFixo(lerFormula(metadataAtual)) ? 'naoEntrega' : 'porKm');
  const [salvando, setSalvando] = useState(false);

  const campo = (chave: keyof FormulaDeEntrega) => (v: number | null) =>
    setFormula((prev) => ({ ...prev, [chave]: v }));

  const escolherDepois = (novo: Depois) => {
    setDepois(novo);
    // Vindo de "não entrego", o máximo está colado no raio fixo: sem abrir
    // espaço, "cobro por km" não cobraria km nenhum.
    if (novo === 'porKm') {
      setFormula((prev) => (prev.raioMaximoKm > prev.raioPlanoKm
        ? prev
        : { ...prev, raioMaximoKm: prev.raioPlanoKm + 5 }));
    }
  };

  const efetiva = useMemo(() => formulaEfetiva(formula, depois), [formula, depois]);
  const problemas = useMemo(() => {
    if (depois === 'naoEntrega' && !(Number(formula.raioPlanoKm) > 0)) {
      return ['Diga até quantos km vale o valor fixo.'];
    }
    return problemasDaFormula(efetiva);
  }, [efetiva, depois, formula.raioPlanoKm]);
  const previa = useMemo(() => previaDePrecos(efetiva, distanciasDaPrevia(efetiva)), [efetiva]);

  const salvar = async () => {
    if (problemas.length > 0) {
      toast.error('Corrija os avisos antes de salvar.');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar(gravarFormula(metadataAtual, efetiva));
      toast.success('Preço da entrega atualizado');
    } catch {
      toast.error('Não consegui salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const numero = (v: string) => (v === '' ? null : Number(v));

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-fg-token">Preço da entrega</h2>
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
        <div className="space-y-5">
          {/* A regra em forma de frase. Eram sete campos técnicos ("taxa base",
              "raio plano") para dizer "R$ 5 até 5 km" — o dono não achava a
              entrega fixa que já existia (13/11). */}
          <div className="flex flex-wrap items-center gap-2 text-base text-fg-token">
            <span className="font-medium">Entrega</span>
            <span className="text-fg-muted-token">R$</span>
            <input
              aria-label="Valor fixo da entrega"
              type="number" min="0" step="0.5" inputMode="decimal"
              value={formula.taxaBase ?? ''}
              onChange={(e) => campo('taxaBase')(numero(e.target.value))}
              className={inputNumero}
            />
            <span className="font-medium">até</span>
            <input
              aria-label="Distância do valor fixo (km)"
              type="number" min="0" step="0.5" inputMode="decimal"
              value={formula.raioPlanoKm ?? ''}
              onChange={(e) => campo('raioPlanoKm')(numero(e.target.value))}
              className={inputNumero}
            />
            <span className="font-medium">km</span>
          </div>

          <fieldset className="border-t border-border-token pt-4">
            <legend className="mb-2 text-sm font-medium text-fg-token">
              Depois de {formatNumber(Number(formula.raioPlanoKm) || 0, { maximumFractionDigits: 2 })} km
            </legend>
            <div className="flex flex-wrap gap-2">
              {OPCOES_DEPOIS.map((o) => (
                <label
                  key={o.valor}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border-token px-3 py-2 text-sm text-fg-token has-[:checked]:border-brand has-[:checked]:bg-surface-2 has-[:checked]:font-semibold"
                >
                  <input
                    type="radio"
                    name="depois-do-fixo"
                    value={o.valor}
                    checked={depois === o.valor}
                    onChange={() => escolherDepois(o.valor)}
                    className="accent-[var(--brand)]"
                  />
                  {o.rotulo}
                </label>
              ))}
            </div>

            {depois === 'porKm' && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo
                    id="fe-porkm" rotulo="Por km adicional" prefixo="R$"
                    ajuda="Cada km além do valor fixo."
                    valor={formula.porKm} onChange={campo('porKm')}
                  />
                  <Campo
                    id="fe-maximo" rotulo="Entrego até" sufixo="km"
                    ajuda="Acima disso a loja não entrega."
                    valor={formula.raioMaximoKm} onChange={campo('raioMaximoKm')}
                  />
                </div>
                <details className="group" open={Boolean(formula.encareceEmKm || formula.porKmLonge || formula.taxaMaxima)}>
                  <summary className="cursor-pointer text-sm font-medium text-brand-ink">
                    Mais opções
                  </summary>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Campo
                      id="fe-longe" rotulo="Encarece a partir de" sufixo="km" opcional
                      ajuda="Vazio = mesmo preço por km em toda a distância."
                      valor={formula.encareceEmKm} onChange={campo('encareceEmKm')}
                    />
                    <Campo
                      id="fe-porkm-longe" rotulo="Por km depois disso" prefixo="R$" opcional
                      ajuda="Só vale acima do ponto acima."
                      valor={formula.porKmLonge} onChange={campo('porKmLonge')}
                    />
                    <Campo
                      id="fe-teto" rotulo="Taxa máxima" prefixo="R$" opcional
                      ajuda="Com teto, longe demais fica caro em vez de indisponível."
                      valor={formula.taxaMaxima} onChange={campo('taxaMaxima')}
                    />
                  </div>
                </details>
              </div>
            )}
          </fieldset>
        </div>

        <div className="superficie-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted-token">
            Quanto o cliente paga
          </p>
          <ul className="mt-3 space-y-2" data-testid="previa-de-precos">
            {previa.map(({ km, resultado }) => (
              <li key={km} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-fg-muted-token">{formatNumber(km, { maximumFractionDigits: 2 })} km</span>
                <span className="font-semibold tabular-nums text-fg-token">
                  {resultado.tipo === 'cobrado' ? formatCurrency(resultado.valor) : 'Não entrega'}
                </span>
              </li>
            ))}
          </ul>
          {problemas.length === 0 && (
            <p data-testid="frase-do-preco" className="mt-3 border-t border-border-token pt-3 text-sm font-medium text-fg-token">
              {fraseDoPreco(efetiva)}
            </p>
          )}
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
