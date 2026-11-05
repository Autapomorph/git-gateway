import express, { type Express } from 'express';

import { corsMiddleware } from './middleware.js';
import { createRouter } from './router.js';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(corsMiddleware);

  // Health check endpoint for Docker & Nginx
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Attach all application routes
  app.use(createRouter());

  return app;
}
