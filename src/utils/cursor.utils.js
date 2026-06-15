export const encodeCursor = (user) => {
  const userData = {
    id: user.id,
    created_at: user.created_at,
  };

  return Buffer.from(JSON.stringify({ ...userData })).toString("base64");
};

export const decodeCursor = (cursor) => {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));

    if (
      !decoded ||
      typeof decoded !== "object" ||
      !decoded.id ||
      !decoded.created_at
    ) {
      throw new Error("Invalid cursor format");
    }

    return decoded;
  } catch {
    const error = new Error("Invalid cursor");
    error.status = 400;
    throw error;
  }
};
