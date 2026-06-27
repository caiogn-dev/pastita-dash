import { copyToClipboard } from '../clipboard';

describe('copyToClipboard', () => {
  const originalClipboard = navigator.clipboard;

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
    jest.restoreAllMocks();
  });

  const setClipboard = (value: unknown) => {
    Object.defineProperty(navigator, 'clipboard', {
      value,
      configurable: true,
      writable: true,
    });
  };

  it('usa a Async Clipboard API quando disponível e retorna true', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    const result = await copyToClipboard('codigo-pix');

    expect(writeText).toHaveBeenCalledWith('codigo-pix');
    expect(result).toBe(true);
  });

  it('cai para o fallback execCommand quando a clipboard API está ausente', async () => {
    setClipboard(undefined);
    const execCommand = jest.fn().mockReturnValue(true);
    // @ts-expect-error jsdom não implementa execCommand
    document.execCommand = execCommand;

    const result = await copyToClipboard('valor-fallback');

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(result).toBe(true);
  });

  it('cai para o fallback quando a clipboard API rejeita (permissão/contexto inseguro)', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('NotAllowedError'));
    setClipboard({ writeText });
    const execCommand = jest.fn().mockReturnValue(true);
    // @ts-expect-error jsdom não implementa execCommand
    document.execCommand = execCommand;

    const result = await copyToClipboard('algo');

    expect(writeText).toHaveBeenCalled();
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(result).toBe(true);
  });

  it('retorna false quando tanto a API quanto o fallback falham', async () => {
    setClipboard(undefined);
    const execCommand = jest.fn().mockReturnValue(false);
    // @ts-expect-error jsdom não implementa execCommand
    document.execCommand = execCommand;

    const result = await copyToClipboard('nada');

    expect(result).toBe(false);
  });
});
