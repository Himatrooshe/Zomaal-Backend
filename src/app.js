const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { corsOrigin, nodeEnv } = require('./config');
const { errorHandler, notFound } = require('./middleware');
const routes = require('./routes/index.routes.js');

const app = express();

app.use(cors({ origin: corsOrigin }));
if (nodeEnv !== 'test') {
  app.use(morgan(nodeEnv === 'development' ? 'dev' : 'combined'));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({
    name: 'Zomaal Backend API',
    version: '1.0.0',
    status: 'running',
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
