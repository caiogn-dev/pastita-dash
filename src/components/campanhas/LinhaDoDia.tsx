/**
 * A campanha grátis ao longo do dia — uma barra por hora.
 *
 * O WhatsApp só deixa mandar texto livre de graça dentro de 24 h da última
 * mensagem do cliente, então nem todo mundo recebe no horário escolhido: quem
 * fecharia a janela antes recebe antes. Sem ver isso, o dono acha que a
 * campanha sai toda às 20h — e em 18/set 352 de 380 ficaram de fora sem
 * ninguém entender por quê.
 */
import React from 'react';
import type { FaixaDaApi } from '../../pages/marketing/whatsapp/linhaDoDia';
import { montarLinhaDoDia, resumoDaAgenda } from '../../pages/marketing/whatsapp/linhaDoDia';

interface Props {
  faixas: FaixaDaApi[];
  horarioDaCampanha?: string | null;
  agora?: string | Date;
  /** Campanha rodando: mostra o que já saiu em cada faixa. */
  aoVivo?: boolean;
}

export const LinhaDoDia: React.FC<Props> = ({ faixas, horarioDaCampanha, agora, aoVivo }) => {
  const linha = montarLinhaDoDia({ faixas, horarioDaCampanha, agora });
  const maior = Math.max(1, ...linha.horas.map((h) => h.quantidade));

  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="text-sm font-semibold text-fg-token">
        {aoVivo ? 'Como está saindo hoje' : resumoDaAgenda(linha)}
      </figcaption>
      <ul className="flex items-end gap-1" role="list">
        {linha.horas.map((h) => {
          const altura = Math.round((h.quantidade / maior) * 56);
          const rotulo = h.quantidade === 1 ? '1 pessoa' : `${h.quantidade} pessoas`;
          return (
            <li key={h.hora} className="flex flex-1 flex-col items-center gap-1">
              <span
                title={`${h.hora}h — ${rotulo}${h.enviadas ? `, ${h.enviadas} já ${h.enviadas === 1 ? 'recebeu' : 'receberam'}` : ''}`}
                aria-label={`${h.hora} horas: ${rotulo}${h.enviadas ? `, ${h.enviadas} já receberam` : ''}`}
                className={`w-full rounded-t ${
                  h.eDaCampanha ? 'bg-brand' : h.passou ? 'bg-success-token' : 'bg-border-token'
                }`}
                style={{ height: `${Math.max(h.quantidade ? 6 : 2, altura)}px` }}
              />
              <span className={`text-caption ${h.eAgora ? 'font-bold text-fg-token' : 'text-fg-muted-token'}`}>
                {h.hora % 3 === 2 || h.eDaCampanha ? `${h.hora}h` : ''}
              </span>
            </li>
          );
        })}
      </ul>
      {aoVivo && (
        <p className="text-caption text-fg-muted-token">
          {linha.totalEnviado} já {linha.totalEnviado === 1 ? 'recebeu' : 'receberam'} ·{' '}
          {linha.horas.reduce((s, h) => s + h.quantidade - h.enviadas, 0)} ainda no aguardo
        </p>
      )}
    </figure>
  );
};

export default LinhaDoDia;
