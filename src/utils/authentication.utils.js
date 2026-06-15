export const authorizeUserAction = (itemUserId, loggedInUserId) => {
  const isUserAuthenticated = itemUserId === loggedInUserId;
  if (!isUserAuthenticated) {
    const error = new Error("Not authorized to perform action.");
    error.status = 403;
    throw error;
  }
};
