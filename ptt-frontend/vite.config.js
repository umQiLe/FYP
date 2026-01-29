import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// We point to the certificates created by the backend
// Assumption: ptt-frontend and ptt-backend are next to each other
const certPath = path.resolve(__dirname, '../ptt-backend/cert.pem');
const keyPath = path.resolve(__dirname, '../ptt-backend/key.pem');

// Check if certs exist before trying to use them
const httpsConfig = fs.existsSync(certPath) && fs.existsSync(keyPath) ? {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
} : false;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // This allows the server to be accessible on your local network
    host: '0.0.0.0',
    https: httpsConfig,
    port: 5173,
    // Add historyApiFallback to handle client-side routing
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'https://localhost:8081',
        secure: false,
        changeOrigin: true
      }
    }
  }
})