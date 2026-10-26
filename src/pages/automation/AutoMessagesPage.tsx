/**
 * Rotas antigas `automation/messages` e `automation/companies/:companyId/messages`.
 *
 * 26/10: o editor virou `TextosDosAvisos`, que mora na aba Textos de Avisos
 * automáticos (`/atendimento/avisos-automaticos`). Estas rotas seguem de pé
 * até a Fase 4 da reorganização; mostram os mesmos grupos, sem cópia.
 */
import React from 'react';
import { useParams } from 'react-router-dom';

import { PageShell } from '../../components/ui';
import { GRUPOS_DO_ATENDIMENTO } from './gruposDeAvisos';
import { TextosDosAvisos } from './TextosDosAvisos';

const AutoMessagesPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  return (
    <PageShell
      trilha={companyId ? [
        { rotulo: 'Automação', href: '/automation/companies' },
        { rotulo: 'Perfil', href: `/automation/companies/${companyId}` },
        { rotulo: 'Avisos automáticos' },
      ] : undefined}
      titulo="Avisos automáticos"
    >
      <TextosDosAvisos grupos={GRUPOS_DO_ATENDIMENTO} perfilId={companyId} />
    </PageShell>
  );
};

export default AutoMessagesPage;
