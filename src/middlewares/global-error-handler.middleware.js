// Centralized error handler
const globalErrorHandler = (err, req, res, next) =>
{
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    status,
    error: status >= 500 && process.env.NODE_ENV === "production"
      ? 'Something went wrong'
      : err.message || 'Something went wrong',
  });
};

export default globalErrorHandler;
