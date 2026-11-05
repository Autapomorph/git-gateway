import { createApp } from './app.js';
import { env } from './lib/config/index.js';

const app = createApp();

const server = app.listen(env.PORT, env.HOST, () => {
  // Server is listening
});

function gracefulShutdown(): void {
  server.close(() => {
    // Shutdown complete
  });
}

/* eslint-disable n/no-process-exit */
process.on('SIGTERM', () => {
  gracefulShutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  gracefulShutdown();
  process.exit(0);
});
/* eslint-enable n/no-process-exit */

export default server;
