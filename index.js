const app = require('./src/app');
const { port, nodeEnv } = require('./src/config');

const server = app.listen(port, () => {
  console.log(`Server running on port ${port} in ${nodeEnv} mode`);
  if (nodeEnv === 'production' && !process.env.JWT_ACCESS_SECRET) {
    console.warn('Warning: JWT_ACCESS_SECRET is not set. Set it before accepting traffic.');
  }
});

if (process.env.ENABLE_JOB_WORKERS !== '0') {
  try {
    const { registerWorkers } = require('./src/modules/jobs');
    const workers = registerWorkers();
    console.log(`BullMQ: started ${workers.length} workers (set ENABLE_JOB_WORKERS=0 to disable)`);
  } catch (err) {
    console.warn('BullMQ workers not started:', err.message);
  }
}

server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = server;
