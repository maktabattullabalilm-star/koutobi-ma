import { handleUploadImage } from './api/upload-image.js';
import { handleDeleteImage } from './api/delete-image.js';

/**
 * Cloudflare Worker entry point.
 *
 * The built SPA in `dist/` is served by Cloudflare's static-asset layer, not by
 * this script. `wrangler.jsonc` sets `assets.run_worker_first: ["/api/*"]`, so
 * this fetch handler only runs for the API routes below — asset requests never
 * wake it up (and stay on the free, unlimited static path).
 */
const API_ROUTES = {
  '/api/upload-image': handleUploadImage,
  '/api/delete-image': handleDeleteImage,
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/api/')) {
      const handler = API_ROUTES[pathname];
      if (handler) return handler(request, env);
      // Unknown API path — never let it fall through to the SPA shell.
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Defensive fallback: only reached if run_worker_first is widened.
    return env.ASSETS.fetch(request);
  },
};
