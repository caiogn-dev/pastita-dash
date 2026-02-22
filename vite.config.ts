import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 3010,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    hmr: {
      host: '0.0.0.0',
      port: 3010,
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
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@headlessui/react', '@heroicons/react', 'lucide-react'],
          'vendor-charts': ['chart.js', 'react-chartjs-2', 'recharts'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-utils': ['axios', 'date-fns', 'zustand'],
          
          // Feature chunks
          'feature-automation': [
            './src/pages/automation/index.ts',
            './src/services/automation.ts',
          ],
          'feature-reports': [
            './src/pages/reports/index.ts',
            './src/services/reports.ts',
          ],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
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
