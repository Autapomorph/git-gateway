import { Router } from 'express';

import { createAdapter } from './adapter.js';
import { downloadHandler } from './handlers/download.js';
import { fileHandler } from './handlers/file.js';
import { filesHandler } from './handlers/files.js';
import { latestHandler } from './handlers/latest.js';
import { releaseNotesHandler } from './handlers/release-notes.js';
import { updateHandler } from './handlers/update.js';

export function createRouter(): Router {
  const router = Router();

  // Update routes
  const updateRoute = createAdapter(updateHandler, req => ({
    target: req.params.target,
    version: req.params.version,
  }));
  router.get('/update/:target/:version', updateRoute);
  router.get('/api/update/:target/:version', updateRoute);

  // Latest manifest routes
  const latestRoute = createAdapter(latestHandler, req => {
    const channelParam = req.params[0];
    const fileName = channelParam ? `latest.${channelParam}.json` : 'latest.json';

    return { file: fileName };
  });
  router.get(/^\/(?:api\/)?latest(?:\.([a-zA-Z0-9_-]+))?\.json$/, latestRoute);

  // File routes
  const fileRoute = createAdapter(fileHandler, req => {
    const wildcardPath = req.params[0];

    if (wildcardPath) {
      return { path: wildcardPath };
    }

    return {};
  });
  router.get('/file/*', fileRoute);
  router.get('/api/file/*', fileRoute);
  router.get('/file', fileRoute);
  router.get('/api/file', fileRoute);

  // Batch files routes
  const filesRoute = createAdapter(filesHandler);
  router.get('/files', filesRoute);
  router.get('/api/files', filesRoute);

  // Binary asset download routes
  const downloadRoute = createAdapter(downloadHandler);
  router.get('/download', downloadRoute);
  router.get('/api/download', downloadRoute);

  // Release notes routes
  const releaseNotesParamRoute = createAdapter(releaseNotesHandler, req => ({
    version: req.params.version,
  }));
  const releaseNotesRoute = createAdapter(releaseNotesHandler);

  router.get('/release-notes/:version', releaseNotesParamRoute);
  router.get('/api/release-notes/:version', releaseNotesParamRoute);
  router.get('/release-notes', releaseNotesRoute);
  router.get('/api/release-notes', releaseNotesRoute);

  return router;
}
