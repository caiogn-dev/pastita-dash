import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'
import { setAuthToken } from './services'
import { getAuthToken } from './services/tokenStorage'

// Pre-hydrate axios Authorization header from persisted zustand storage
const preloadedToken = getAuthToken();
if (preloadedToken) {
  setAuthToken(preloadedToken);
}

// Após um deploy, chunks lazy do build anterior somem do servidor e o app
// aberto quebra com "Failed to fetch dynamically imported module".
// Um reload único busca o index.html novo; o guard em sessionStorage evita loop.
window.addEventListener('vite:preloadError', (event) => {
  const lastReload = sessionStorage.getItem('chunk-reload-at');
  if (lastReload && Date.now() - Number(lastReload) < 30_000) return;
  sessionStorage.setItem('chunk-reload-at', String(Date.now()));
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'dark:bg-zinc-900 dark:text-white dark:border dark:border-zinc-800',
            }}
          />
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
