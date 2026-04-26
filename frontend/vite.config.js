import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    host: true,
    // Warm up the most expensive modules so the first page load is instant
    warmup: {
      clientFiles: [
        './src/main.jsx',
        './src/App.jsx',
        './src/components/Dashboard.jsx',
        './src/components/ContractStats.jsx',
        './src/components/ShipmentList.jsx',
        './src/components/CreateShipment.jsx',
        './src/components/GasBudgetTracker.jsx',
        './src/components/TemperatureAlertOverlay.jsx',
        './src/hooks/useTemperatureAlerts.js',
        './src/config/contract.js',
      ],
    },
  },

  // Tell Vite to pre-bundle these heavy deps during `vite dev` startup
  // so the browser never has to wait for on-demand transforms
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'wagmi',
      'viem',
      '@tanstack/react-query',
      '@rainbow-me/rainbowkit',
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
    // Force re-bundle when lockfile changes
    force: false,
  },

  define: {
    global: 'globalThis',
  },

  build: {
    // Split vendor chunks so the browser can cache them independently
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':     ['react', 'react-dom', 'react/jsx-runtime'],
          'wagmi-vendor':     ['wagmi', 'viem', '@tanstack/react-query'],
          'rainbowkit-vendor':['@rainbow-me/rainbowkit'],
          'ui-vendor':        ['lucide-react', 'clsx', 'tailwind-merge'],
        },
      },
    },
    // Warn only above 1 MB (RainbowKit chunks are legitimately large)
    chunkSizeWarningLimit: 1000,
  },
})
