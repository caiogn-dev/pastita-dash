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
 * - Exemplos de resposta: pergunta → resposta, como exemplo de bom atendimento
 *   (era "Respostas ensinadas" até 26/10 — confundia com Respostas rápidas);
 * - Sugestões (06/10): o que o atendimento aprendeu de conversas que viraram
 *   pedido sem atendente — só entra na IA quando o dono aprova;
 * - Resultado (26/10): a antiga "Conversão do bot", órfã fora do menu. Quem
 *   ensina precisa ver se funcionou.
 */
import React from 'react';
import { BookOpenIcon, ChartBarIcon, ChatBubbleLeftEllipsisIcon, LightBulbIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

import { PageShell, PageTabs } from '../../components/ui';
import { NaoEntendiSecao } from './NaoEntendiSecao';
import { FatosDaLojaSecao } from './FatosDaLojaSecao';
import { RespostasEnsinadasSecao } from './RespostasEnsinadasSecao';
import { SugestoesDoBotSecao } from './SugestoesDoBotSecao';
import { ResultadoDoBotSecao } from './ResultadoDoBotSecao';

const ABAS = [
  { id: 'nao-entendeu', rotulo: 'Não entendeu', icone: QuestionMarkCircleIcon },
  { id: 'sugestoes', rotulo: 'Sugestões', icone: LightBulbIcon },
  { id: 'fatos', rotulo: 'O que a loja sabe', icone: BookOpenIcon },
  { id: 'respostas', rotulo: 'Exemplos de resposta', icone: ChatBubbleLeftEllipsisIcon },
  { id: 'resultado', rotulo: 'Resultado', icone: ChartBarIcon },
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
          : aba === 'resultado' ? <ResultadoDoBotSecao />
            : <NaoEntendiSecao />
      )}
    </PageTabs>
  </PageShell>
);

export default EnsinarOBotPage;
