import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { ThemeProvider } from './components/theme'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
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
  </React.StrictMode>,
)
