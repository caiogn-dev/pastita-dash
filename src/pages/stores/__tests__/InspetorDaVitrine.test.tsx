/**
 * Painel de propriedades do Storefront (coluna da direita do editor).
 * Substituiu a "Exibição do cardápio" de cartões empilhados (13/10): o dono
 * achou "feia, simples, opções e botões jogados na tela". Agora cada parte
 * da vitrine tem poucas linhas curtas — rótulo e controle compacto — e o
 * resultado aparece na vitrine de verdade, no meio da tela.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../../services/api', () => ({ __esModule: true, default: {} }));
jest.mock('../../../services/storesApi', () => ({
  MAXIMO_DE_BANNERS: 3,
  listarBanners: jest.fn().mockResolvedValue([]),
  subirBanner: jest.fn(),
  apagarBanner: jest.fn(),
}));

import InspetorDaVitrine, { type InspetorDaVitrineProps } from '../InspetorDaVitrine';
import { EXIBICAO_PADRAO } from '../../../services/exibicaoDoCardapio';
import type { Parte } from '../partesDaVitrine';

const FORM = { template: 'fresh', primary_color: '#125419', secondary_color: '#ed6c02', tagline: 'A mais saborosa', custom_domain: '' };

function montar(parte: Parte, extra: Partial<InspetorDaVitrineProps> = {}) {
  const props: InspetorDaVitrineProps = {
    parte,
    form: FORM,
    formSalvo: FORM,
    mudarForm: jest.fn(),
    exibicao: EXIBICAO_PADRAO,
    exibicaoSalva: EXIBICAO_PADRAO,
    mudarExibicao: jest.fn(),
    templates: [
      { id: 'fresh', label: 'Fresh', description: 'd', preview: '🥗' },
      { id: 'bold', label: 'Bold', description: 'd', preview: '🍔' },
    ],
    loja: { id: 's1', slug: 'ce', name: 'Cê Saladas', logo_url: 'https://m/logo.jpg', banner_url: 'https://m/capa.jpg' },
    logo: { url: 'https://m/logo.jpg', pendente: false, onEscolher: jest.fn(), onRemover: jest.fn() },
    capa: { url: 'https://m/capa.jpg', pendente: false, onEscolher: jest.fn(), onRemover: jest.fn() },
    amostra: { nome: 'Queridinha', descricao: '1x Queridinha 1x Suco da sua escolha 1x Sobremesa do dia', foto: 'https://m/f.webp', preco: 54.99 },
    urlPublica: 'https://cesaladas.com.br',
    ...extra,
  };
  render(<InspetorDaVitrine {...props} />);
  return props;
}

it('topo: capa e logo de verdade, formato e alinhamento do logo', () => {
  const p = montar('topo');
  expect(screen.getByAltText('Capa')).toHaveAttribute('src', 'https://m/capa.jpg');
  expect(screen.getByAltText('Logo')).toHaveAttribute('src', 'https://m/logo.jpg');
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Formato do logo' })).getByRole('radio', { name: 'Redondo' }));
  expect(p.mudarExibicao).toHaveBeenCalledWith({ logo_formato: 'redondo' });
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Logo e nome' })).getByRole('radio', { name: 'No centro' }));
  expect(p.mudarExibicao).toHaveBeenCalledWith({ logo_alinhamento: 'centro' });
  fireEvent.change(screen.getByLabelText(/frase/i), { target: { value: 'Comida de verdade' } });
  expect(p.mudarForm).toHaveBeenCalledWith({ tagline: 'Comida de verdade' });
});

it('estilo: template e cores', () => {
  const p = montar('estilo');
  fireEvent.click(screen.getByRole('radio', { name: /bold/i }));
  expect(p.mudarForm).toHaveBeenCalledWith({ template: 'bold' });
  fireEvent.change(screen.getByLabelText('Cor principal (código)'), { target: { value: '#111111' } });
  expect(p.mudarForm).toHaveBeenCalledWith({ primary_color: '#111111' });
});

it('cartão: foto, formato, encaixe e o corte da descrição com o produto real', () => {
  const p = montar('cartao', { exibicao: { ...EXIBICAO_PADRAO, descricao_limite: 20 } });
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Posição da foto' })).getByRole('radio', { name: 'Direita' }));
  expect(p.mudarExibicao).toHaveBeenCalledWith({ foto_posicao: 'direita' });
  fireEvent.click(screen.getByRole('radio', { name: '16:9' }));
  expect(p.mudarExibicao).toHaveBeenCalledWith({ foto_proporcao: 'paisagem' });
  fireEvent.click(screen.getByRole('radio', { name: 'Inteira' }));
  expect(p.mudarExibicao).toHaveBeenCalledWith({ foto_encaixe: 'inteira' });

  const slider = screen.getByRole('slider', { name: /descrição/i });
  expect(slider).toHaveAttribute('aria-valuetext', '20 letras');
  expect(screen.getByTestId('amostra-da-descricao')).toHaveTextContent('1x Queridinha 1x…');
  fireEvent.change(slider, { target: { value: '0' } });
  expect(p.mudarExibicao).toHaveBeenCalledWith({ descricao_limite: 0 });
});

it('o que mudou e não foi salvo ganha um ponto na linha', () => {
  montar('cartao', { exibicao: { ...EXIBICAO_PADRAO, foto_posicao: 'direita' } });
  const linha = screen.getByRole('radiogroup', { name: 'Posição da foto' }).parentElement as HTMLElement;
  expect(within(linha).getByLabelText(/não salvo/i)).toBeInTheDocument();
});

it('estoque: interruptores', () => {
  const p = montar('estoque', { exibicao: { ...EXIBICAO_PADRAO, mostrar_esgotados: false } });
  const esgotados = screen.getByRole('switch', { name: /mostrar esgotados/i });
  expect(esgotados).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(esgotados);
  expect(p.mudarExibicao).toHaveBeenCalledWith({ mostrar_esgotados: true });
});

it('pedido feito: título e mensagem', () => {
  const p = montar('pedido');
  fireEvent.change(screen.getByLabelText(/^título/i), { target: { value: 'Valeu!' } });
  expect(p.mudarExibicao).toHaveBeenCalledWith({ agradecimento_titulo: 'Valeu!' });
});

it('endereço: domínio e o endereço público', () => {
  const p = montar('endereco');
  expect(screen.getByText('https://cesaladas.com.br')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/domínio/i), { target: { value: 'loja.com.br' } });
  expect(p.mudarForm).toHaveBeenCalledWith({ custom_domain: 'loja.com.br' });
});
