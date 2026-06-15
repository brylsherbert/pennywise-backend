// Centralized Response Handler
export const handleResponse = (res, status, message, data, pagination) => {
  res.status(status).json({
    status,
    message,
    data,
    pagination,
  });
};
