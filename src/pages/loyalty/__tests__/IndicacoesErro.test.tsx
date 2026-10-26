/**
 * O vazio enganoso das Indicações.
 *
 * O `IndicacoesCard` carrega a lista por `useEffect` chamando
 * `cashbackService.indicacoes`. No erro (rede/500), o `catch` engolia a falha
 * em silêncio ("aba secundária: falha aqui não derruba a página") e deixava
 * `linhas` em `[]` com `carregando = false`. A tela caía então no vazio
 * CONFIANTE "Nenhuma indicação ainda", afirmando a uma loja que JÁ tem
 * divulgadores que ninguém indicou ninguém — quando foi a busca que caiu. É o
 * mesmo "vazio enganoso" já corrigido em Clientes (#199), Cardápio (#202),
 * Sessões (#204), Agendadas (#205), Base de clientes (#217) e tantas outras.
 *
 * TDD: escrito VERMELHO antes do conserto, VERDE depois.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../services/cashback', () => ({
  cashbackService: { indicacoes: jest.fn() },
}));

import { cashbackService } from '../../../services/cashback';
import { IndicacoesCard } from '../IndicacoesCard';

const linha = {
  id: '1',
  indicador_phone: '5563999547790',
  indicador_nome: 'Elisangela',
  amigo_nome: 'Amiga',
  amigo_phone: '5563988887777',
  pedido: '#1234',
  pedido_total: '50.00',
  valor: '5.00',
  data: '2026-10-21',
};
const resposta = {
  indicacoes: [linha],
  por_indicador: [
    { phone: '5563999547790', nome: 'Elisangela', total_indicados: 1, total_creditado: '5.00' },
  ],
};

const renderCard = () =>
  render(
    <MemoryRouter>
      <IndicacoesCard storeSlug="ce-saladas" />
    </MemoryRouter>,
  );

describe('Indicações — vazio enganoso', () => {
  // mockReset (não clearAllMocks) para também esvaziar a fila de `...Once` de
  // um teste anterior que não foi totalmente consumida.
  beforeEach(() => (cashbackService.indicacoes as jest.Mock).mockReset());

  it('falha sem cache mostra erro acionável, não "Nenhuma indicação ainda"', async () => {
    (cashbackService.indicacoes as jest.Mock)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(resposta);

    renderCard();

    // Erro acionável no lugar do vazio enganoso.
    expect(await screen.findByText('Não foi possível carregar as indicações')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma indicação ainda')).toBeNull();

    // "Tentar novamente" refaz a busca e traz o divulgador real.
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText('Elisangela')).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar as indicações')).toBeNull();
  });

  it('vazio legítimo preservado: resposta vazia mostra "Nenhuma indicação ainda"', async () => {
    (cashbackService.indicacoes as jest.Mock).mockResolvedValue({ indicacoes: [], por_indicador: [] });

    renderCard();

    expect(await screen.findByText('Nenhuma indicação ainda')).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar as indicações')).toBeNull();
  });

  it('sucesso renderiza a lista, sem estado de erro', async () => {
    (cashbackService.indicacoes as jest.Mock).mockResolvedValue(resposta);

    renderCard();

    expect(await screen.findByText('Elisangela')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('Não foi possível carregar as indicações')).toBeNull(),
    );
  });

  it('retry da loja anterior em voo NÃO sobrescreve a loja atual (sem vazamento entre lojas)', async () => {
    // O caminho do bug (P1 do Codex): a loja A falha, o usuário clica "Tentar
    // novamente" (busca de retry em voo) e TROCA para a loja B antes de a
    // resposta de A chegar. Como o botão descarta o cleanup de `carregar`, sem o
    // guarda monotônico a resposta tardia de A sobrescrevia a lista da loja B —
    // vazando indicações de um tenant no painel de outro.
    let resolverRetryA!: (v: unknown) => void;
    const respostaA = {
      indicacoes: [{ ...linha, id: 'A', indicador_nome: 'Divulgador da loja A' }],
      por_indicador: [{ phone: '5563900000001', nome: 'Divulgador da loja A', total_indicados: 9, total_creditado: '9.00' }],
    };
    const respostaB = {
      indicacoes: [{ ...linha, id: 'B', indicador_nome: 'Divulgador da loja B' }],
      por_indicador: [{ phone: '5563900000002', nome: 'Divulgador da loja B', total_indicados: 1, total_creditado: '1.00' }],
    };
    (cashbackService.indicacoes as jest.Mock)
      .mockRejectedValueOnce(new Error('offline'))                              // loja A: cai
      .mockImplementationOnce(() => new Promise((res) => { resolverRetryA = res; })) // retry da A: pendente
      .mockResolvedValueOnce(respostaB);                                       // loja B: responde já

    const { rerender } = render(
      <MemoryRouter><IndicacoesCard storeSlug="loja-a" /></MemoryRouter>,
    );
    // A caiu → erro; clica "Tentar novamente" (retry fica pendente).
    fireEvent.click(await screen.findByRole('button', { name: /tentar novamente/i }));
    // Troca para a loja B antes de o retry de A responder.
    rerender(<MemoryRouter><IndicacoesCard storeSlug="loja-b" /></MemoryRouter>);
    expect(await screen.findByText('Divulgador da loja B')).toBeInTheDocument();

    // Agora o retry de A responde, atrasado. Não pode aparecer.
    resolverRetryA(respostaA);
    await waitFor(() =>
      expect(screen.getByText('Divulgador da loja B')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Divulgador da loja A')).toBeNull();
  });
});
