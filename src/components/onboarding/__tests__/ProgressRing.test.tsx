import { render, screen } from '@testing-library/react';
import ProgressRing from '../ProgressRing';

describe('ProgressRing', () => {
  it('mostra N/total no centro e tem aria-label', () => {
    render(<ProgressRing completed={2} total={6} />);
    expect(screen.getByText('2/6')).toBeTruthy();
    expect(screen.getByRole('img', { name: /2 de 6 passos conclu/i })).toBeTruthy();
  });

  it('arco zera quando completed=0 e completa quando completed=total', () => {
    const { rerender, container } = render(<ProgressRing completed={0} total={6} />);
    const arc = () => container.querySelectorAll('circle')[1] as SVGCircleElement;
    const off0 = arc().getAttribute('stroke-dashoffset');
    rerender(<ProgressRing completed={6} total={6} />);
    const offFull = arc().getAttribute('stroke-dashoffset');
    expect(off0).not.toEqual(offFull);
    expect(Number(offFull)).toBeCloseTo(0, 1); // 100% => offset 0
  });
});
