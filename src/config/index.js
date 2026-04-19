require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-only-change-me',
    accessExpiresMin: parseInt(process.env.JWT_ACCESS_EXPIRES_MIN || '15', 10),
    refreshExpiresDays: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '7', 10),
  },
};
