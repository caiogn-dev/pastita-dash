import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Página 404 real (antes o catch-all redirecionava silenciosamente para "/").
 * Renderizada fora do MainLayout, por isso ocupa a tela inteira.
 */
export const NotFoundPage: React.FC = () => (
  <main className="min-h-screen flex items-center justify-center bg-surface-2 px-4">
    <div className="w-full max-w-md text-center bg-surface border border-border-token rounded-xl shadow-sm p-8">
      <p className="text-5xl font-bold text-fg-muted-token" aria-hidden="true">404</p>
      <h1 className="mt-3 text-lg font-semibold text-fg-token">Página não encontrada</h1>
      <p className="mt-2 text-sm text-fg-muted-token">
        O endereço que você tentou acessar não existe ou foi movido.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Voltar para o dashboard
      </Link>
    </div>
  </main>
);

export default NotFoundPage;
