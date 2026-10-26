/**
 * Avisos automáticos — o que o bot manda sozinho: o texto e o registro.
 *
 * 26/10: eram duas telas no menu, "Mensagens prontas" (o texto) e "Avisos
 * enviados" (o que saiu e se chegou). O dono via a falha numa e procurava o
 * texto na outra. Agora são duas abas da mesma tela, e o aviso que não chegou
 * tem "Editar texto", que troca de aba já no momento certo (`?foco=`).
 */
import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DocumentTextIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

import { PageShell, PageTabs } from '../../components/ui';
import { TextosDosAvisos } from '../automation/TextosDosAvisos';
import { GRUPOS_DO_ATENDIMENTO } from '../automation/gruposDeAvisos';
import { AvisosEnviadosSecao } from './AvisosEnviadosSecao';

const ABAS = [
  { id: 'textos', rotulo: 'Textos', icone: DocumentTextIcon },
  { id: 'enviados', rotulo: 'Enviados', icone: PaperAirplaneIcon },
];

export const AvisosAutomaticosPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const foco = params.get('foco');

  const editarTexto = useCallback((alvo: string) => {
    setParams({ aba: 'textos', foco: alvo }, { replace: true });
  }, [setParams]);

  return (
    <PageShell titulo="Avisos automáticos">
      <PageTabs abas={ABAS} ariaLabel="Avisos automáticos">
        {(aba) => (aba === 'enviados'
          ? <AvisosEnviadosSecao onEditarTexto={editarTexto} />
          : <TextosDosAvisos grupos={GRUPOS_DO_ATENDIMENTO} foco={foco} />)}
      </PageTabs>
    </PageShell>
  );
};

export default AvisosAutomaticosPage;
