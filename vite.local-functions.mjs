import { loadEnv } from 'vite';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

/**
 * Dev-only: serve the Netlify functions in-process under `npm run dev`.
 *
 * Plain `vite dev` has no /api/* handler, so every backend call 404s.
 * This middleware imports each function module, reads its
 * `export const config = { path }`, builds a WHATWG Request from the node
 * request, and streams the Response back — the same contract Netlify
 * upholds in production via the netlify.toml /api/* redirect.
 *
 * - apply: 'serve' → never bundled, zero production impact.
 * - .env is merged into process.env (real env wins), mirroring netlify dev,
 *   because server-only keys (SUPABASE_URL, R2_*) live outside VITE_*.
 */
const FUNCTION_MODULES = [
  'netlify/functions/upload-image.mjs',
  'netlify/functions/delete-image.mjs',
];

export function localFunctions() {
  return {
    name: 'local-netlify-functions',
    apply: 'serve',
    async configureServer(server) {
      const root = server.config.root;
      const env = loadEnv(server.config.mode, root, '');
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined && v !== undefined) process.env[k] = v;
      }

      const routes = new Map();
      for (const rel of FUNCTION_MODULES) {
        try {
          const mod = await import(pathToFileURL(path.join(root, rel)).href);
          if (typeof mod.default === 'function' && mod.config?.path) {
            routes.set(mod.config.path, mod.default);
          }
        } catch (err) {
          console.error(`[local-functions] failed to load ${rel}:`, err.message);
        }
      }
      if (routes.size === 0) return;
      console.log(`[local-functions] serving ${routes.size} /api routes from Netlify functions`);

      server.middlewares.use(async (req, res, next) => {
        let pathname = '';
        try {
          pathname = new URL(req.url || '/', 'http://localhost').pathname;
        } catch {
          return next();
        }
        const handler = routes.get(pathname);
        if (!handler) return next();
        try {
          const chunks = [];
          for await (const c of req) chunks.push(c);
          const body = Buffer.concat(chunks);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers || {})) {
            if (v === undefined || k.toLowerCase() === 'content-length') continue;
            if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
            else headers.set(k, v);
          }
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
          });
          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => {
            if (k.toLowerCase() === 'content-length') return;
            res.setHeader(k, v);
          });
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          console.error('[local-functions] handler error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'خطأ في خادم التطوير المحلي' }));
        }
      });
    },
  };
}
