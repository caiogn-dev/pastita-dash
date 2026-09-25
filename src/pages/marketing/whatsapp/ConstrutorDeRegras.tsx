/**
 * O construtor de público: campo · operador · valor.
 *
 * O padrão tem nome — *query builder* (a Cloudflare chama de expression
 * builder) — e a convenção é a mesma em todo lugar: condições do mesmo grupo
 * somam E, grupos diferentes somam OU. Seguir a convenção é metade da
 * usabilidade: quem já montou regra em outro sistema entende esta sem ler
 * ajuda.
 *
 * O vocabulário vem do SERVIDOR. Se a tela mantivesse a própria lista de
 * operadores, ela ofereceria "termina com" para um campo numérico, o servidor
 * recusaria, e o lojista levaria a culpa.
 */
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { campaignsService } from '../../../services/campaigns';
import {
  REGRA_VAZIA,
  adicionarCondicao,
  adicionarGrupo,
  mudarCondicao,
  quantosValores,
  regraLimpa,
  removerCondicao,
  temAlgumaCondicao,
  type CampoDoCatalogo,
  type Condicao,
  type Regra,
} from './regrasDePublico';

// `controle` é a classe do sistema (ver src/index.css): altura, borda e foco
// iguais aos do resto do painel.
const CAMPO = 'controle';

interface Props {
  storeIds?: string[];
  /** Sobe a regra pronta (só o que está completo) a cada mudança. */
  onRegra?: (regra: Regra) => void;
}

const LinhaDaCondicao: React.FC<{
  condicao: Condicao;
  campos: CampoDoCatalogo[];
  onMudar: (m: Partial<Condicao>) => void;
  onRemover: () => void;
}> = ({ condicao, campos, onMudar, onRemover }) => {
  const campo = campos.find((c) => c.campo === condicao.campo);
  const caixas = quantosValores(campo, condicao.operador);
  const valores = Array.isArray(condicao.valor)
    ? condicao.valor
    : [condicao.valor ?? '', ''];

  const tipoDoInput = campo?.tipo === 'numero' || campo?.tipo === 'data' ? 'number' : 'text';
  const unidade = campo?.operadores_detalhe.find((o) => o.operador === condicao.operador)?.unidade;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Campo"
        className={`${CAMPO} min-w-40 flex-1`}
        value={condicao.campo ?? ''}
        onChange={(e) => onMudar({ campo: e.target.value })}
      >
        <option value="">Selecione</option>
        {campos.map((c) => <option key={c.campo} value={c.campo}>{c.rotulo}</option>)}
      </select>

      <select
        aria-label="Operador"
        className={`${CAMPO} min-w-40 flex-1`}
        value={condicao.operador ?? ''}
        disabled={!campo}
        onChange={(e) => onMudar({ operador: e.target.value })}
      >
        <option value="">Selecione</option>
        {campo?.operadores_detalhe.map((o) => (
          <option key={o.operador} value={o.operador}>{o.rotulo}</option>
        ))}
      </select>

      <div className="flex flex-1 items-center gap-2">
        {Array.from({ length: caixas }).map((_, i) => (
          <input
            key={i}
            aria-label={caixas > 1 ? `Valor ${i + 1}` : 'Valor'}
            type={tipoDoInput}
            className={`${CAMPO} w-full min-w-24`}
            placeholder="Valor"
            disabled={!condicao.operador}
            value={String(valores[i] ?? '')}
            onChange={(e) => {
              const novos = [...valores];
              novos[i] = e.target.value;
              onMudar({ valor: caixas > 1 ? novos.slice(0, caixas) : e.target.value });
            }}
          />
        ))}
        {unidade && <span className="shrink-0 text-caption text-fg-muted-token">{unidade}</span>}
      </div>

      <button
        type="button"
        aria-label="Remover condição"
        onClick={onRemover}
        className="rounded-lg p-2 text-fg-muted-token hover:bg-surface-muted-token hover:text-fg-token"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

export const ConstrutorDeRegras: React.FC<Props> = ({ storeIds, onRegra }) => {
  const [campos, setCampos] = useState<CampoDoCatalogo[]>([]);
  const [regra, setRegra] = useState<Regra>(REGRA_VAZIA);
  const [previa, setPrevia] = useState<{ total: number; de: number; em_portugues: string } | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let vivo = true;
    campaignsService.camposDaAudiencia()
      .then((c) => { if (vivo) setCampos(c); })
      .catch(() => { if (vivo) setErro('Não foi possível carregar os campos.'); });
    return () => { vivo = false; };
  }, []);

  const limpa = useMemo(() => regraLimpa(regra), [regra]);

  // Prévia a cada mudança, com respiro: contar a cada tecla castiga o banco.
  useEffect(() => {
    onRegra?.(limpa);
    if (!temAlgumaCondicao(regra)) { setPrevia(null); return; }
    const t = setTimeout(() => {
      campaignsService.previaPorRegra(limpa, storeIds)
        .then(setPrevia)
        .catch(() => setPrevia(null));
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(limpa), JSON.stringify(storeIds)]);

  const mexer = (nova: Regra) => setRegra(nova);

  return (
    <section className="flex flex-col gap-3">
      {erro && <p className="text-body text-danger-token">{erro}</p>}

      {regra.grupos.map((grupo, iGrupo) => (
        <Fragment key={iGrupo}>
          {iGrupo > 0 && (
            <p className="text-center text-caption font-semibold text-fg-muted-token">
              ou
            </p>
          )}
          <div className="superficie p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-body font-semibold text-fg-token">Grupo {iGrupo + 1}</h4>
              <button
                type="button"
                onClick={() => mexer(adicionarCondicao(regra, iGrupo))}
                className="inline-flex items-center gap-1 rounded-full border border-border-token px-3 py-1.5 text-caption font-semibold text-fg-token hover:bg-surface-muted-token"
              >
                <PlusIcon className="h-4 w-4" /> Condição
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {grupo.condicoes.map((condicao, iCondicao) => (
                <Fragment key={iCondicao}>
                  {iCondicao > 0 && (
                    <span className="text-caption font-semibold text-fg-muted-token">e</span>
                  )}
                  <LinhaDaCondicao
                    condicao={condicao}
                    campos={campos}
                    onMudar={(m) => mexer(mudarCondicao(regra, iGrupo, iCondicao, m))}
                    onRemover={() => mexer(removerCondicao(regra, iGrupo, iCondicao))}
                  />
                </Fragment>
              ))}
            </div>
          </div>
        </Fragment>
      ))}

      <div>
        <button
          type="button"
          onClick={() => mexer(adicionarGrupo(regra))}
          className="inline-flex items-center gap-1 rounded-full border border-border-token px-3 py-2 text-caption font-semibold text-fg-token hover:bg-surface-muted-token"
        >
          <PlusIcon className="h-4 w-4" /> Adicionar grupo
        </button>
      </div>

      {/* A regra em português + o tamanho: é o que o dono confere antes de
          gastar envio. Número sem frase não diz se a regra é a que ele quis. */}
      {previa && (
        <p className="superficie p-4 text-body text-fg-token" role="status">
          <strong className="text-lead font-bold">{previa.total}</strong>{' '}
          {previa.total === 1 ? 'pessoa' : 'pessoas'} de {previa.de} —{' '}
          <span className="text-fg-muted-token">{previa.em_portugues}</span>
        </p>
      )}
    </section>
  );
};

export default ConstrutorDeRegras;
