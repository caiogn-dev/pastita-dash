/**
 * A mensagem como ela chega no WhatsApp do dono: balão, *negrito* e _itálico_.
 *
 * Sem `dangerouslySetInnerHTML`: o texto vem de dado de cliente (nome de
 * produto, nome de pessoa) e é montado em nós React.
 */
import React, { Fragment } from 'react';

const MARCAS = /(\*[^*\n]+\*|_[^_\n]+_)/g;

export function formatarLinha(linha: string): React.ReactNode[] {
  return linha.split(MARCAS).filter(Boolean).map((pedaco, i) => {
    if (pedaco.length > 2 && pedaco.startsWith('*') && pedaco.endsWith('*')) return <strong key={i}>{pedaco.slice(1, -1)}</strong>;
    if (pedaco.length > 2 && pedaco.startsWith('_') && pedaco.endsWith('_')) return <em key={i}>{pedaco.slice(1, -1)}</em>;
    return <Fragment key={i}>{pedaco}</Fragment>;
  });
}

export const MensagemDoWhatsApp: React.FC<{ texto: string; rodape?: string }> = ({ texto, rodape }) => (
  <figure className="rounded-lg bg-[#0B141A] p-3" aria-label="Prévia da mensagem no WhatsApp">
    <div className="ml-auto max-w-[92%] rounded-lg rounded-tr-sm bg-[#005C4B] px-3 py-2 text-sm leading-snug text-[#E9EDEF] shadow">
      {texto.split('\n').map((linha, i) => (
        <p key={i} className={linha.trim() ? '' : 'h-2'}>{formatarLinha(linha)}</p>
      ))}
      <p className="mt-1 text-right text-xs text-[#8696A0]">08:00 ✓✓</p>
    </div>
    {rodape && <figcaption className="mt-2 text-center text-xs text-[#8696A0]">{rodape}</figcaption>}
  </figure>
);
