/**
 * InstagramCallbackPage
 *
 * Fallback page for the OAuth redirect URI.
 * The FB SDK flow handles auth in a popup and no longer needs this page,
 * but the route must exist so Facebook's redirect URI validation passes.
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const InstagramCallbackPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // If opened as a popup, close it. Otherwise redirect to accounts.
    if (window.opener) {
      window.close();
    } else {
      navigate('/instagram/accounts', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-900">
      <div className="text-center">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent mx-auto" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Redirecionando...</p>
      </div>
    </div>
  );
};

export default InstagramCallbackPage;
