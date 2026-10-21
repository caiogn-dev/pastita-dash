/**
 * Salvar único para seções que gravam em OUTRO lugar que não a loja.
 *
 * A página de configurações já tinha um Salvar só para tudo que é da loja. Mas
 * Vale (gateway do Pagar.me), Vale por QR Code, Acréscimo do vale e Nota
 * fiscal (config fiscal) tinham cada uma o seu botão: mexia-se em duas,
 * salvava-se uma, e a outra se perdia ao sair da aba. Agora cada seção diz à
 * página quantas alterações tem e entrega como validar, gravar e descartar; a
 * barra de alterações conta tudo e o Salvar grava tudo.
 *
 * Fora de um `SalvarJunto` (teste isolado, outra tela) a seção continua com o
 * botão dela — `useParteDoSalvar` devolve `false` e ela o desenha.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface ParteDoSalvar {
  /** Quantas alterações entram na contagem da barra (0 = nada mudou). */
  mudancas: number;
  /** O problema que impede salvar, ou null. A seção também o mostra no lugar. */
  validar?: () => string | null;
  /** Grava. Falhou = lança (a seção já mostrou o motivo no lugar). */
  salvar: () => Promise<void>;
  descartar: () => void;
}

interface Registro {
  registrar: (id: string, parte: React.MutableRefObject<ParteDoSalvar>) => () => void;
  contar: (id: string, mudancas: number) => void;
}

const Contexto = createContext<Registro | null>(null);

/** Dentro do salvar único? Se não, a seção desenha o próprio botão. */
export function useParteDoSalvar(id: string, parte: ParteDoSalvar): boolean {
  const registro = useContext(Contexto);
  const ref = useRef(parte);
  ref.current = parte;

  useEffect(() => registro?.registrar(id, ref), [registro, id]);
  useEffect(() => { registro?.contar(id, parte.mudancas); }, [registro, id, parte.mudancas]);

  return registro !== null;
}

export function useSalvarJunto() {
  const partes = useRef(new Map<string, React.MutableRefObject<ParteDoSalvar>>());
  const [contagem, setContagem] = useState<Record<string, number>>({});

  const registro = useMemo<Registro>(() => ({
    registrar: (id, parte) => {
      partes.current.set(id, parte);
      return () => {
        partes.current.delete(id);
        setContagem(({ [id]: _, ...resto }) => resto);
      };
    },
    contar: (id, n) => setContagem((atual) => (atual[id] === n ? atual : { ...atual, [id]: n })),
  }), []);

  const comMudanca = useCallback(
    () => [...partes.current.entries()].filter(([id]) => (contagem[id] || 0) > 0).map(([, p]) => p.current),
    [contagem],
  );

  return {
    registro,
    mudancas: Object.values(contagem).reduce((a, b) => a + b, 0),
    mudouEm: (...ids: string[]) => ids.some((id) => (contagem[id] || 0) > 0),
    /** Primeiro problema entre as seções alteradas; todas mostram o seu. */
    validar: (): string | null => comMudanca().map((p) => p.validar?.() ?? null).find(Boolean) ?? null,
    salvar: async () => {
      for (const parte of comMudanca()) await parte.salvar();
    },
    descartar: () => { for (const parte of comMudanca()) parte.descartar(); },
  };
}

export const SalvarJunto: React.FC<{ registro: Registro; children: React.ReactNode }> = ({ registro, children }) => (
  <Contexto.Provider value={registro}>{children}</Contexto.Provider>
);
