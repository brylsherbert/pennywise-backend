import { Pool } from "pg";
import { config } from "dotenv";

config();

const isProduction = process.env.NODE_ENV === "production";

const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction
        ? {
            rejectUnauthorized: false,
          }
        : false,
    }
  : {
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
    };

const pool = new Pool(dbConfig);

async function connectDB(retries = 10) {
  while (retries) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      retries--;
      await new Promise((res) => setTimeout(res, 3000));
    }
  }

  throw new Error("Database connection failed after retries");
}

export { connectDB, pool };