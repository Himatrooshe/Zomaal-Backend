const { AppError } = require('../utils');

const notFound = (req, res, next) => {
  if (req.url === '/favicon.ico') {
    return res.status(204).send();
  }

  next(new AppError(`Not Found - ${req.originalUrl}`, 404, 'NOT_FOUND'));
};

module.exports = notFound;
