/**
 * Faixa no topo do quadro de pedidos quando a impressão da loja para.
 *
 * Confere a lista de agentes (a mesma que a tela de Impressão usa) a cada
 * 60 s. O quadro não tem outro canal para isso — o WebSocket só fala de
 * pedido —, e um minuto é o bastante para o dono ver antes do cliente ligar.
 *
 * Erro ao buscar não acende nada: alarme falso ensina a ignorar a faixa.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon, PrinterIcon } from '@heroicons/react/24/outline';

import { listPrintAgents, type PrintAgent } from '../../services/printing';
import { alertasDeImpressora, type AlertaDeImpressora as Alerta } from './situacaoDaImpressora';

export const INTERVALO_DO_ALERTA_MS = 60_000;

const CLASSE: Record<Alerta['tom'], string> = {
  perigo: 'border-[var(--danger)] bg-[var(--danger-soft)]',
  aviso: 'border-[var(--warning)] bg-[var(--warning-soft)]',
};

const COR_DO_ICONE: Record<Alerta['tom'], string> = {
  perigo: 'text-[var(--danger)]',
  aviso: 'text-[var(--warning)]',
};

interface AlertaDeImpressoraProps {
  storeSlug: string;
}

export const AlertaDeImpressora: React.FC<AlertaDeImpressoraProps> = ({ storeSlug }) => {
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    let vivo = true;
    const conferir = async () => {
      try {
        const res = await listPrintAgents(storeSlug);
        const lista = (res.data?.results ?? res.data) as PrintAgent[] | undefined;
        if (vivo) setAlertas(alertasDeImpressora(Array.isArray(lista) ? lista : []));
      } catch {
        // Mantém o que já sabia: uma falha de rede não é "voltou a imprimir"
        // nem "parou".
      }
    };
    conferir();
    const intervalo = setInterval(conferir, INTERVALO_DO_ALERTA_MS);
    return () => {
      vivo = false;
      clearInterval(intervalo);
    };
  }, [storeSlug]);

  if (alertas.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alertas.map((alerta) => (
        <div
          key={alerta.agenteId}
          role="alert"
          className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 ${CLASSE[alerta.tom]}`}
        >
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-fg-token">
            {alerta.tom === 'perigo' ? (
              <PrinterIcon className={`h-5 w-5 shrink-0 ${COR_DO_ICONE[alerta.tom]}`} aria-hidden="true" />
            ) : (
              <ExclamationTriangleIcon className={`h-5 w-5 shrink-0 ${COR_DO_ICONE[alerta.tom]}`} aria-hidden="true" />
            )}
            <span>{alerta.texto}</span>
          </p>
          <Link
            to={`/stores/${storeSlug}/printing`}
            className="shrink-0 text-sm font-semibold text-fg-token underline underline-offset-2 hover:no-underline"
          >
            Ver impressão
          </Link>
        </div>
      ))}
    </div>
  );
};

export default AlertaDeImpressora;
