process.env.NODE_ENV = 'test';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('tests/setup: DATABASE_URL is missing — integration tests will fail.');
}
