const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./src/config');
const { errorHandler, notFound } = require('./src/middleware');
const routes = require('./src/routes');

const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Zomaal Backend API',
    version: '1.0.0',
    status: 'running',
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Keep process alive and handle unhandled errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
