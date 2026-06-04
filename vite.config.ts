import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  worker: { format: 'es' },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom)[\\/]/, priority: 50 },
            { name: 'echarts-react-vendor', test: /node_modules[\\/]echarts-for-react[\\/]/, priority: 45 },
            { name: 'zrender-vendor', test: /node_modules[\\/]zrender[\\/]/, priority: 44 },
            { name: 'echarts-chart-vendor', test: /node_modules[\\/]echarts[\\/]lib[\\/]chart[\\/]/, priority: 43 },
            { name: 'echarts-component-vendor', test: /node_modules[\\/]echarts[\\/]lib[\\/]component[\\/]/, priority: 42 },
            { name: 'echarts-core-vendor', test: /node_modules[\\/]echarts[\\/]/, priority: 41 },
            { name: 'deckgl-react-vendor', test: /node_modules[\\/]@deck\.gl[\\/]react[\\/]/, priority: 45 },
            { name: 'deckgl-layers-vendor', test: /node_modules[\\/]@deck\.gl[\\/](layers|aggregation-layers|geo-layers)[\\/]/, priority: 44 },
            { name: 'deckgl-core-vendor', test: /node_modules[\\/]@deck\.gl[\\/](core|mesh-layers)[\\/]/, priority: 43 },
            { name: 'luma-vendor', test: /node_modules[\\/]@luma\.gl[\\/]/, priority: 42 },
            { name: 'loaders-vendor', test: /node_modules[\\/]@loaders\.gl[\\/]/, priority: 41 },
            { name: 'd3-vendor', test: /node_modules[\\/](d3|d3-[^\\/]+)[\\/]/, priority: 30 },
            { name: 'ui-vendor', test: /node_modules[\\/](@radix-ui|lucide-react)[\\/]/, priority: 20 },
            { name: 'data-io-vendor', test: /node_modules[\\/](papaparse|read-excel-file|hyparquet|apache-arrow|fflate)[\\/]/, priority: 20 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  server: { port: 5176 },
})
