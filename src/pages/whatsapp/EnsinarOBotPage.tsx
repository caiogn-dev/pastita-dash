/**
 * Ensinar o bot — três jeitos de dar contexto à IA, em uma tela.
 *
 * 28/09: a tela "O bot não entendeu" tinha três botões que não serviam para
 * o que aparecia na lista, e "responder assim" gravava numa tabela que o bot
 * nunca lia. Ninguém usou. O dono pediu o que faltava: ensinar detalhes de
 * produto, entrega, etc. — contexto, para a IA parar de responder "coisas
 * aleatórias". Daí as abas:
 *
 * - Não entendeu: onde a IA falhou de verdade, para ensinar linha a linha;
 * - O que a loja sabe: fatos que a IA pode afirmar (validade, área, feriado);
 * - Respostas ensinadas: pergunta → resposta, como exemplo de bom atendimento;
 * - Sugestões (06/10): o que o atendimento aprendeu de conversas que viraram
 *   pedido sem atendente — só entra na IA quando o dono aprova.
 */
import React from 'react';
import { BookOpenIcon, ChatBubbleLeftEllipsisIcon, LightBulbIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

import { PageShell, PageTabs } from '../../components/ui';
import { NaoEntendiSecao } from './NaoEntendiSecao';
import { FatosDaLojaSecao } from './FatosDaLojaSecao';
import { RespostasEnsinadasSecao } from './RespostasEnsinadasSecao';
import { SugestoesDoBotSecao } from './SugestoesDoBotSecao';

const ABAS = [
  { id: 'nao-entendeu', rotulo: 'Não entendeu', icone: QuestionMarkCircleIcon },
  { id: 'sugestoes', rotulo: 'Sugestões', icone: LightBulbIcon },
  { id: 'fatos', rotulo: 'O que a loja sabe', icone: BookOpenIcon },
  { id: 'respostas', rotulo: 'Respostas ensinadas', icone: ChatBubbleLeftEllipsisIcon },
];

export const EnsinarOBotPage: React.FC = () => (
  <PageShell
    titulo="Ensinar o bot"
   
  >
    <PageTabs abas={ABAS} ariaLabel="Ensinar o bot">
      {(aba) => (
        aba === 'sugestoes' ? <SugestoesDoBotSecao />
          : aba === 'fatos' ? <FatosDaLojaSecao />
          : aba === 'respostas' ? <RespostasEnsinadasSecao />
            : <NaoEntendiSecao />
      )}
    </PageTabs>
  </PageShell>
);

export default EnsinarOBotPage;
