import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { PixInvoicePanel } from '../PixInvoicePanel';

describe('PixInvoicePanel', () => {
  it('renderiza copia-e-cola, QR, badge pago e chama onCopy ao clicar em Copiar', () => {
    const onCopy = jest.fn();
    render(
      <PixInvoicePanel
        pixCode="00020126-fake-pix-code"
        pixQrCode="fakeBase64QrData"
        status="completed"
        amount={49.9}
        onCopy={onCopy}
      />
    );

    expect(screen.getByText('00020126-fake-pix-code')).toBeInTheDocument();

    const img = screen.getByAltText('QR Code PIX') as HTMLImageElement;
    expect(img.src.startsWith('data:image/png;base64,')).toBe(true);

    expect(screen.getByText('Pago')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Copiar'));
    expect(onCopy).toHaveBeenCalledWith('00020126-fake-pix-code');
  });

  it('renderiza badge pendente quando status=pending', () => {
    render(<PixInvoicePanel pixCode="abc" status="pending" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });
});
