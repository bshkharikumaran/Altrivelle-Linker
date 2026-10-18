import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import shareHandler from './api/share/[token].js';
import healthHandler from './api/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load environment variables for local dev execution of serverless handlers
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    root: '.',
    plugins: [
      {
        name: 'altrivelle-api-dev-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const host = req.headers.host || 'localhost:3000';
            const parsedUrl = new URL(req.url, `http://${host}`);
            const pathname = parsedUrl.pathname;

            // Handle /api/health
            if (pathname === '/api/health') {
              req.query = Object.fromEntries(parsedUrl.searchParams.entries());
              res.status = (code) => {
                res.statusCode = code;
                return res;
              };
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              };
              return healthHandler(req, res);
            }

            // Handle /api/share/:token, /f/:token, and /raw/:token
            if (pathname.startsWith('/api/share/') || pathname.startsWith('/f/') || pathname.startsWith('/raw/')) {
              let token = '';
              let isRaw = false;

              if (pathname.startsWith('/api/share/')) {
                token = pathname.replace('/api/share/', '').split('/')[0];
              } else if (pathname.startsWith('/f/')) {
                token = pathname.replace('/f/', '').split('/')[0];
                isRaw = true;
              } else if (pathname.startsWith('/raw/')) {
                token = pathname.replace('/raw/', '').split('/')[0];
                isRaw = true;
              }

              req.query = Object.fromEntries(parsedUrl.searchParams.entries());
              req.query.token = req.query.token || token;
              if (isRaw) {
                req.query.raw = '1';
              }

              res.status = (code) => {
                res.statusCode = code;
                return res;
              };
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              };
              res.redirect = (code, url) => {
                res.statusCode = typeof code === 'number' ? code : 302;
                res.setHeader('Location', url || code);
                res.end();
              };

              try {
                return await shareHandler(req, res);
              } catch (err) {
                console.error('Dev API Server error:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message, developer: 'ALTRIVELLE TECHNOLOGIES' }));
                return;
              }
            }

            next();
          });
        },
      },
    ],
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          share: resolve(__dirname, 'share.html'),
          request: resolve(__dirname, 'request.html'),
        },
      },
    },
    server: {
      port: 3000,
      open: false,
    },
    test: {
      environment: 'node',
      globals: true,
    },
  };
});
