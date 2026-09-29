/**
 * Avisa que o pin do mapa não bate com o endereço que o cliente escreveu.
 *
 * Caso real, pedido CE-2608140823 da Cê Saladas em 14/ago: o cliente escreveu
 * "Av jk 110 sul Clínica DVI" e o pin caiu na 706 Sul — 5,15 km. A entrega foi
 * para a 706 e o frete, que é calculado pelo pin, subiu de R$ 7,00 para
 * R$ 11,00. Ela pagou mais caro para receber no lugar errado.
 *
 * O backend detecta e grava em `metadata.endereco_divergente`. Aqui é onde
 * alguém finalmente VÊ — e tem que ver antes de o entregador sair, senão o
 * aviso não serve para nada.
 *
 * Por isso o desenho é de alerta e não de nota de rodapé: âmbar, ícone, e as
 * DUAS leituras lado a lado. Quem está montando a entrega precisa saber para
 * onde ir e para onde não ir.
 */
import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface EnderecoDivergente {
  digitado?: string;
  pin?: string;
  lat?: number;
  lng?: number;
  aviso?: string;
}

/** Lê a divergência da metadata do pedido, sem confiar no formato. */
export function lerDivergencia(metadata: unknown): EnderecoDivergente | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const bruto = (metadata as Record<string, unknown>).endereco_divergente;
  if (!bruto || typeof bruto !== 'object') return null;

  const d = bruto as EnderecoDivergente;
  // Sem as duas leituras o aviso não ajuda ninguém — melhor não mostrar nada
  // do que mostrar "endereço suspeito" sem dizer por quê.
  if (!d.digitado || !d.pin) return null;
  return d;
}

export const AvisoEnderecoDivergente: React.FC<{ metadata?: unknown }> = ({ metadata }) => {
  const d = lerDivergencia(metadata);
  if (!d) return null;

  const maps = d.lat != null && d.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lng}`
    : null;

  return (
    <div
      role="alert"
      data-testid="aviso-endereco-divergente"
      className="rounded-xl border border-warning-token bg-warning-soft px-4 py-4 sm:px-5"
    >
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning-token " />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-warning-token ">
            Confirme o endereço antes de sair para a entrega
          </p>
          <p className="text-sm text-warning-token ">
            O cliente escreveu <strong>{d.digitado}</strong>, mas o pin do mapa
            cai em <strong>{d.pin}</strong>. A taxa de entrega foi calculada
            pelo pin.
          </p>
          {maps && (
            <a
              href={maps}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-medium text-warning-token underline underline-offset-2 "
            >
              Ver no mapa onde o pin caiu
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvisoEnderecoDivergente;
