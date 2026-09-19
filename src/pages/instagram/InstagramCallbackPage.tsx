/**
 * Fim do "Entrar com o Instagram": avisa a tela Conexões e fecha a janela.
 *
 * O backend termina o login e manda a janela para cá com `?ig_connected=1`
 * ou `?ig_error=<motivo>`. Até 19/09 esta rota não existia — a janela caía
 * num 404, a tela Conexões nunca sabia que tinha terminado e o lojista via
 * "Conexão cancelada" ao fechar.
 */
import React, { useEffect } from 'react';

export const MOTIVOS: Record<string, string> = {
  cancelado: 'Você cancelou o login no Instagram.',
  login_expirado: 'O login demorou demais. Tente de novo.',
  troca_do_codigo: 'O Instagram não confirmou o login. Tente de novo.',
  token_de_60_dias: 'O Instagram não confirmou o login. Tente de novo.',
  dados_da_conta: 'Não conseguimos ler a conta. Ela precisa ser profissional (comercial ou criador).',
};

export const mensagemDoErro = (codigo: string) =>
  MOTIVOS[codigo] || 'Não foi possível conectar o Instagram. Tente de novo.';

export const InstagramCallbackPage: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const sucesso = params.get('ig_connected') === '1';
  const erro = params.get('ig_error') || '';

  useEffect(() => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: 'instagram_oauth', success: sucesso, error: sucesso ? undefined : mensagemDoErro(erro) },
        window.location.origin,
      );
      window.close();
      return;
    }
    // Aberto fora da janelinha (ex.: celular trocou de aba): volta para Conexões.
    window.location.replace(`/connections${sucesso ? '?instagram=conectado' : ''}`);
  }, [sucesso, erro]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-muted-token p-6">
      <p role="status" className="text-sm text-fg-token">
        {sucesso ? 'Instagram conectado. Pode fechar esta janela.' : mensagemDoErro(erro)}
      </p>
    </main>
  );
};

export default InstagramCallbackPage;
