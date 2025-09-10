import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    host: true,                        // 允许外网访问（0.0.0.0）
    port: 5173,
    allowedHosts: ['wentian.wang', 'www.wentian.wang'],
  },
  preview: {
    host: true,                        // vite preview 也放行
    port: 5173,
    allowedHosts: ['wentian.wang', 'www.wentian.wang'],
  },
})