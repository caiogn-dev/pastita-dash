import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true, template: 'treemap' }),
  ],
  base: '/',
  server: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_DEV_PORT) || 3000,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    // HMR client connects back over whatever host/port the page was loaded on
    // (works through SSH SOCKS: browser -> localhost:<port> -> server).
    hmr: {
      clientPort: Number(process.env.VITE_DEV_PORT) || 3000,
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    // Code splitting for better performance
    rollupOptions: {
      output: {
        // Só vendor chunks. Os 'feature-*' listavam módulos-âncora da aplicação
        // (páginas de automação, BI) e agrupavam tudo num chunk nomeado; qualquer
        // aresta estática do entry até um deles arrastava o chunk INTEIRO para o
        // caminho eager, com modulepreload no index.html. Era assim que login
        // baixava recharts, as 10 páginas de automação e o BI completo — 216 KB
        // gzip que nenhuma tela do login usa.
        // Sem eles, o Rollup divide pelos pontos de import() e as páginas voltam
        // a ser sob demanda, que é o que o React.lazy() do App.tsx já pedia.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@headlessui/react', '@heroicons/react', 'lucide-react'],
          'vendor-utils': ['axios', 'date-fns', 'zustand'],
          // clsx/tailwind-merge PRECISAM de chunk próprio. São usados tanto pelo
          // shell (eager) quanto pelos gráficos; sem isto o Rollup os alojava
          // dentro de vendor-charts, e o entry passava a importar os 375 KB de
          // recharts só para alcançar a função de juntar classes CSS.
          // O recharts SAIU em 27/ago — os dois gráficos que o usavam
          // (TimeSeriesChart, DonutChart) viraram SVG próprio. O chunk próprio
          // fica: a separação continua correta e barata.
          'vendor-cn': ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },
    // Increase chunk size warning limit (automation chunk is ~720kb, compresses to ~180kb)
    chunkSizeWarningLimit: 800,
    // Enable source maps for debugging
    sourcemap: false,
    // Minification
    minify: 'esbuild',
    // Target modern browsers
    target: 'es2020',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'zustand',
      'date-fns',
    ],
  },
})
