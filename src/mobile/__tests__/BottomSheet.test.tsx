import { render, screen, fireEvent } from '@testing-library/react';
import { BottomSheet } from '../ui/BottomSheet';

test('renders nothing when closed', () => {
  const { container } = render(<BottomSheet open={false} onClose={() => {}}><div>x</div></BottomSheet>);
  expect(container).toBeEmptyDOMElement();
});

test('renders content and title when open', () => {
  render(<BottomSheet open onClose={() => {}} title="Trocar loja"><div>conteudo</div></BottomSheet>);
  expect(screen.getByText('Trocar loja')).toBeInTheDocument();
  expect(screen.getByText('conteudo')).toBeInTheDocument();
});

test('calls onClose on backdrop click and close button', () => {
  const onClose = jest.fn();
  render(<BottomSheet open onClose={onClose} title="T"><div>c</div></BottomSheet>);
  fireEvent.click(screen.getByTestId('bottomsheet-backdrop'));
  fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
  expect(onClose).toHaveBeenCalledTimes(2);
});
