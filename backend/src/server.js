require('dotenv').config();
const app = require('./app');
const config = require('./config');
const pool = require('./db/pool');
const logger = require('./utils/logger');

async function start() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    process.exit(1);
  }

  if (!config.allowOrigins.length) {
    logger.warn('CORS allow list is empty – all cross-origin requests will be rejected');
  }

  const server = app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port}`, { env: config.env });
  });

  const shutdown = () => {
    logger.info('Shutting down server');
    server.close(() => {
      pool.end(() => process.exit(0));
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
