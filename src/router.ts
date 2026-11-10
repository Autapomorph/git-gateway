import { Router } from 'express';

import { createAdapter } from './adapter.js';
import { downloadHandler } from './handlers/download.js';
import { fileHandler } from './handlers/file.js';
import { filesHandler } from './handlers/files.js';
import { latestHandler } from './handlers/latest.js';
import { releaseNotesHandler } from './handlers/release-notes.js';
import {
  updateElectronHandler,
  updateGenericHandler,
  updateSparkleHandler,
  updateTauriHandler,
  updateWailsHandler,
} from './handlers/update/index.js';

export function createRouter(): Router {
  const router = Router();

  // Adapted route handlers
  const updateRoute = createAdapter(updateTauriHandler, req => ({
    target: req.params.target,
    version: req.params.version,
  }));

  const latestRoute = createAdapter(latestHandler, req => {
    const channelParam = req.params[0];
    const fileName = channelParam ? `latest.${channelParam}.json` : 'latest.json';

    return { file: fileName };
  });

  const fileRoute = createAdapter(fileHandler, req => {
    const wildcardPath = req.params[0];

    if (wildcardPath) {
      return { path: wildcardPath };
    }

    return {};
  });

  const filesRoute = createAdapter(filesHandler);
  const downloadRoute = createAdapter(downloadHandler);

  const releaseNotesParamRoute = createAdapter(releaseNotesHandler, req => ({
    version: req.params.version,
  }));
  const releaseNotesRoute = createAdapter(releaseNotesHandler);

  // Multi-framework adapted handlers
  const wailsCheckRoute = createAdapter(updateWailsHandler);
  const wailsManifestRoute = createAdapter(updateWailsHandler, req => {
    const channelParam = req.params[0];
    const fileName = channelParam ? `manifest.${channelParam}.json` : 'manifest.json';

    return { file: fileName, manifest: 'true' };
  });

  const genericUpdateRoute = createAdapter(updateGenericHandler);

  const electronUpdateRoute = createAdapter(updateElectronHandler, req => ({
    file: req.params.file,
  }));

  const sparkleUpdateRoute = createAdapter(updateSparkleHandler);

  // ---------------------------------------------------------
  // Canonical v1 API Routes (/api/v1/...)
  // ---------------------------------------------------------

  // Tauri update routes
  router.get('/api/v1/update/tauri/:target/:version', updateRoute);
  router.get(/^\/api\/v1\/update\/tauri\/latest(?:\.([a-zA-Z0-9_-]+))?\.json$/, latestRoute);

  // Wails v3 In-App Update routes
  router.get('/api/v1/update/wails/check', wailsCheckRoute);
  router.get(
    /^\/api\/v1\/update\/wails\/manifest(?:\.([a-zA-Z0-9_-]+))?\.json$/,
    wailsManifestRoute,
  );

  // Generic REST/JSON check route (CLI, mobile, custom clients)
  router.get('/api/v1/update/generic/check', genericUpdateRoute);

  // Electron latest.yml / beta.yml routes
  router.get('/api/v1/update/electron/:file', electronUpdateRoute);

  // Sparkle / WinSparkle RSS 2.0 appcast feed
  router.get('/api/v1/update/sparkle/appcast.xml', sparkleUpdateRoute);

  // Universal services
  router.get('/api/v1/file/*', fileRoute);
  router.get('/api/v1/file', fileRoute);
  router.get('/api/v1/files', filesRoute);
  router.post('/api/v1/files', filesRoute);
  router.get('/api/v1/download', downloadRoute);
  router.get('/api/v1/release-notes/:version', releaseNotesParamRoute);
  router.get('/api/v1/release-notes', releaseNotesRoute);

  return router;
}
