import jwt from "jsonwebtoken";
import { findUserById } from "../api/user/user.repo.js";

export const authenticationMiddleware = async (req, res, next) => {
  let token;

  const { authorization } = req.headers;
  if (authorization && authorization.startsWith("Bearer")) {
    token = authorization.split(" ")[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies?.jwt;
  }

  if (!token) {
    return res.status(401).json({ error: "Not authorized, no token provided" });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const existingUser = await findUserById(decodedToken.id);
    if (!existingUser) {
      return res.status(401).json({ error: "Not authorized, no user found." });
    }

    req.user = existingUser;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Not authorized, token failed" });
  }
};
