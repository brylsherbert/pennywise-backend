export const validateBodyRequest = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const formattedError = result.error.format();

      const flatErrors = Object.values(formattedError)
        .flat()
        .filter(Boolean)
        .map((err) => err._errors)
        .flat();

      return res.status(400).json({ message: flatErrors.join(", ") });
    }

    next();
  };
};
