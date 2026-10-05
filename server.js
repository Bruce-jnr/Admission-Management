const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { port, validateConfig } = require('./config');
const { initializeDatabase, closeDatabase } = require('./db/connection');
const { csrfToken, requireCsrf } = require('./middleware/csrf');
const { noCache, securityHeaders } = require('./middleware/security');
const { router: adminRoutes } = require('./routes/admin');
const studentRoutes = require('./routes/student');
const documentRoutes = require('./routes/documents');
const { router: userRoutes } = require('./routes/users');

function createApp(readiness = Promise.resolve()) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(securityHeaders);
  app.use(noCache);
  app.use(express.json({ limit: '20kb' }));
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use(cookieParser());
  app.use(csrfToken);
  app.use(requireCsrf);
  app.use(
    express.static(path.join(__dirname, 'public'), {
      dotfiles: 'deny',
      index: false,
      maxAge: 0,
    }),
  );

  app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', async (req, res) => {
    try {
      await readiness;
      return res.json({ status: 'ready' });
    } catch {
      return res.status(503).json({ status: 'unavailable' });
    }
  });

  // Passenger can begin forwarding requests before asynchronous database
  // initialization completes. Hold application requests until it is ready.
  app.use(async (req, res, next) => {
    try {
      await readiness;
      return next();
    } catch {
      return res.status(503).send('Application unavailable');
    }
  });

  app.get('/', (req, res) => res.redirect('/admin/login'));
  app.use('/admin', adminRoutes);
  app.use('/admin/users', userRoutes);
  app.use('/student', studentRoutes);
  app.use('/documents', documentRoutes);

  app.post('/logout', (req, res) => {
    const student = Boolean(req.cookies?.studentToken);
    res.clearCookie('adminToken', { path: '/' });
    res.clearCookie('studentToken', { path: '/' });
    res.redirect(student ? '/student/login' : '/admin/login');
  });

  app.use((req, res) => res.status(404).send('Not found'));
  app.use((error, req, res, next) => {
    console.error('Request failed:', error.message);
    if (res.headersSent) return next(error);
    if (req.accepts(['json', 'html']) === 'json') {
      return res
        .status(500)
        .json({ success: false, message: 'An unexpected error occurred' });
    }
    return res.status(500).send('An unexpected error occurred');
  });
  return app;
}

async function initializeRuntime() {
  validateConfig();
  await initializeDatabase();
  console.log('Database connection successful');
}

const runtimeReady = initializeRuntime();
// Mark the rejection as observed for Passenger. The readiness route and
// middleware still receive the original rejected promise and return 503.
runtimeReady.catch((error) => {
  console.error('Application initialization failed:', error.message);
});
const app = createApp(runtimeReady);

async function start() {
  await runtimeReady;
  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      resolve(listener);
    });
    listener.once('error', reject);
  });

  async function shutdown(signal) {
    console.log(`${signal} received; shutting down`);
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  }
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Application failed to start:', error.message);
    process.exit(1);
  });
}

// Passenger expects the module itself to be an Express request handler.
// Function properties preserve the existing programmatic API.
module.exports = app;
module.exports.createApp = createApp;
module.exports.start = start;
module.exports.ready = runtimeReady;
