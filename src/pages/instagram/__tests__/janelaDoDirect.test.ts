/**
 * O Instagram também tem janela: a loja responde de graça em até 24 h da
 * última mensagem do cliente. Sem mostrar isso, o atendente escreve, toma erro
 * da Meta e acha que o sistema quebrou.
 */
import { estadoDaJanela } from '../janelaDoDirect';

const AGORA = '2026-09-21T12:00:00Z';

it('cliente falou agora: pode responder', () => {
  const e = estadoDaJanela('2026-09-21T11:00:00Z', AGORA);
  expect(e.podeResponder).toBe(true);
  expect(e.aviso).toBe('');
});

it('faltando menos de 2 h, avisa para não deixar para depois', () => {
  const e = estadoDaJanela('2026-09-20T13:00:00Z', AGORA);
  expect(e.podeResponder).toBe(true);
  expect(e.aviso).toBe('Falta 1 h para a janela de resposta fechar.');
});

it('passou de 24 h: não dá para responder', () => {
  const e = estadoDaJanela('2026-09-20T10:00:00Z', AGORA);
  expect(e.podeResponder).toBe(false);
  expect(e.aviso).toBe('A janela de 24 h fechou. Só dá para responder se a pessoa escrever de novo.');
});

it('conversa sem mensagem do cliente não promete o que não dá', () => {
  const e = estadoDaJanela(null, AGORA);
  expect(e.podeResponder).toBe(false);
});
