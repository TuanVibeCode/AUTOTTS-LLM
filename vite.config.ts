import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import http from 'http'
import type { Plugin } from 'vite'

/**
 * Custom Vite plugin to proxy /api/local-{PORT}/... → http://127.0.0.1:{PORT}/...
 * This allows the model manager to start llama-server on any port dynamically.
 */
function localModelDynamicProxy(): Plugin {
  return {
    name: 'local-model-dynamic-proxy',
    configureServer(server) {
      // Register BEFORE other middleware so it intercepts first
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();

        // Match /api/local-{port}/rest/of/path
        const match = req.url.match(/^\/api\/local-(\d+)(\/.*)?$/);
        if (!match) return next();

        const port = parseInt(match[1], 10);
        const targetPath = match[2] || '/';

        // Forward the request to the local model server
        const proxyReq = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: targetPath,
            method: req.method,
            headers: { ...req.headers, host: `127.0.0.1:${port}` },
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          }
        );

        proxyReq.on('error', () => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: { message: `Local model on port ${port} is not running (ECONNREFUSED)` }
          }));
        });

        req.pipe(proxyReq, { end: true });
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localModelDynamicProxy(),
  ],
  server: {
    proxy: {
      '/api/nvidia': {
        target: 'https://integrate.api.nvidia.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nvidia/, '')
      },
      '/api/dashscope': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dashscope/, '')
      },
      '/api/local': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/local/, '')
      },
      '/api/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, '')
      }
    }
  }
})
