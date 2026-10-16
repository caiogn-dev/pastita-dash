/**
 * Início → o que os vigias acharam por último. Os mesmos avisos que chegaram
 * no WhatsApp do dono, para quem abriu o painel antes de ler a mensagem.
 * Falha nunca derruba o Início: o card some.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon, EyeIcon } from '@heroicons/react/24/outline';

import { Card } from '../ui';
import { vigiasService, type AvisoDeVigia } from '../../services/vigias';

function doUltimoDia(avisos: AvisoDeVigia[]): AvisoDeVigia[] {
  if (!avisos.length) return [];
  const dia = avisos[0].criado_em.slice(0, 10);
  return avisos.filter((a) => a.criado_em.slice(0, 10) === dia).slice(0, 3);
}

export const VigiasDoDiaCard: React.FC<{ store: string; className?: string }> = ({ store, className }) => {
  const painel = useQuery({ queryKey: ['vigias', store], queryFn: () => vigiasService.painel(store), enabled: !!store, retry: false });
  const avisos = useQuery({
    queryKey: ['vigias-avisos-inicio', store],
    queryFn: () => vigiasService.avisos(store, 10),
    enabled: !!store && !!painel.data?.config.ativo,
    retry: false,
  });

  if (painel.isError || !painel.data) return null;
  const ativo = painel.data.config.ativo;
  const lista = doUltimoDia(avisos.data || []);

  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
            <EyeIcon className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold text-fg-token">Vigias</h2>
        </div>
        <Link to="/vigias" className="inline-flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline">
          {ativo ? 'Ver todos' : 'Ligar'}
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
      {ativo && !lista.length ? (
        <p className="mt-2 text-sm text-fg-muted-token">Nada a avisar por enquanto.</p>
      ) : ativo ? (
        <ul className="mt-3 flex flex-col gap-2">
          {lista.map((a) => (
            <li key={a.id} className="rounded-md bg-surface-2 px-3 py-2">
              <p className="text-sm font-semibold text-fg-token">{a.titulo}</p>
              <p className="text-sm text-fg-token">{a.texto}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-fg-muted-token">Resumo e alertas no seu WhatsApp, toda manhã.</p>
      )}
    </Card>
  );
};
