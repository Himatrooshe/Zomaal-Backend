const notFound = (req, res, next) => {
  // Ignore favicon requests
  if (req.url === '/favicon.ico') {
    return res.status(204).send();
  }

  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = notFound;
