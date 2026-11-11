import { render, screen, fireEvent } from '@testing-library/react';
import { MediaViewer } from '../MediaViewer';

describe('MediaViewer — URL de mídia insegura', () => {
  it('documento com javascript: não vira link de download', () => {
    render(<MediaViewer url="javascript:alert(1)" type="document" fileName="a.pdf" onClose={() => {}} />);
    expect(screen.queryByRole('link', { name: /baixar/i })).not.toBeInTheDocument();
  });

  it('documento com https segue com link de download', () => {
    render(<MediaViewer url="https://x.com/a.pdf" type="document" fileName="a.pdf" onClose={() => {}} />);
    expect(screen.getByRole('link', { name: /baixar/i })).toHaveAttribute('href', 'https://x.com/a.pdf');
  });

  it('botão baixar não cria âncora com javascript:', () => {
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<MediaViewer url="javascript:alert(1)" type="image" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /baixar/i }));
    expect(click).not.toHaveBeenCalled();
    click.mockRestore();
  });
});
