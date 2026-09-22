import { config } from "dotenv";
import { randomUUID } from "crypto";
import { userInfo } from "os";

config();

if (!process.env.DATABASE_URL) {
  const database = process.env.POSTGRES_DB || "backend-db";
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = process.env.POSTGRES_PORT || "5432";
  const user = userInfo().username;
  process.env.DATABASE_URL = `postgres://${user}@${host}:${port}/${database}`;
}

process.env.NODE_ENV = "test";
process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "test-jwt-secret";

export const uniqueEmail = (prefix = "guest") =>
  `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 12)}@example.com`;

export const authHeader = (token) => ({ Authorization: `Bearer ${token}` });
