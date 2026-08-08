/**
 * Duas colunas novas, duas armadilhas de leitura.
 *
 * `dias_sem_comprar` vem `null` para quem nunca comprou. Renderizar isso como
 * "0 dias" diz "comprou hoje" — mentira perigosa numa lista que o dono usa
 * para decidir quem recebe mensagem.
 *
 * `perfil` classifica por número de pedidos. "VIP" sem o corte escrito é magia:
 * quem lê não sabe se são 5 pedidos ou R$ 5.000, e não consegue explicar para
 * o funcionário que vai atender.
 */
import { rotuloDeDias, rotuloDePerfil } from '../rotulosDeCrm';

describe('rotuloDeDias', () => {
  it('nunca comprou é texto, não zero', () => {
    expect(rotuloDeDias(null).texto).toBe('Nunca comprou');
    expect(rotuloDeDias(undefined).texto).toBe('Nunca comprou');
  });

  it('hoje e ontem em vez de "0 dias" e "1 dias"', () => {
    expect(rotuloDeDias(0).texto).toBe('Hoje');
    expect(rotuloDeDias(1).texto).toBe('Ontem');
    expect(rotuloDeDias(9).texto).toBe('9 dias');
  });

  it('o tom só fica de alerta depois da régua de risco', () => {
    // Alerta em cliente que comprou semana passada ensina a ignorar a coluna.
    expect(rotuloDeDias(20).tom).toBe('neutro');
    expect(rotuloDeDias(31).tom).toBe('atencao');
    expect(rotuloDeDias(60).tom).toBe('perigo');
  });

  it('quem nunca comprou não entra como perigo', () => {
    // Não é cliente perdido: é lead que nunca ativou. Pintar de vermelho joga
    // os dois casos na mesma campanha.
    expect(rotuloDeDias(null).tom).toBe('neutro');
  });
});

describe('rotuloDePerfil', () => {
  it('traz o corte junto do rótulo', () => {
    expect(rotuloDePerfil('vip').texto).toBe('VIP');
    expect(rotuloDePerfil('vip').definicao).toMatch(/5/);
    expect(rotuloDePerfil('ocasional').definicao).toMatch(/2.*4/);
    expect(rotuloDePerfil('novo').definicao).toMatch(/1|primeir/i);
  });

  it('perfil desconhecido não quebra a linha', () => {
    // Backend novo, front antigo: a tabela precisa continuar renderizando.
    expect(rotuloDePerfil('outro-qualquer' as never).texto).toBe('—');
  });
});
