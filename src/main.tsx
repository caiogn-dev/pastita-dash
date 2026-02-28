import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider } from './context/ThemeContext'
import system from './theme'
import './index.css'
import { setAuthToken } from './services'

// Pre-hydrate axios Authorization header from persisted zustand storage
try {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token) {
        setAuthToken(token);
        // eslint-disable-next-line no-console
        console.debug('[main] preloaded auth header from localStorage');
      }
    }
  }
} catch (e) {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ChakraProvider value={system}>
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
      </ChakraProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
