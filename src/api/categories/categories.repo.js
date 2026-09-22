import { pool } from "../../config/db.js";

export const findAllCategoriesByUserId = async (userId, client = pool) => {
  const sqlQuery = `
        SELECT "id", "user_id", "name", "color", "created_at"
        FROM "categories"
        WHERE "user_id" = $1;
    `;

  const { rows } = await client.query(sqlQuery, [userId]);
  return rows;
};

export const findCategoryById = async (categoryId, userId, client = pool) => {
  const sqlQuery = `
        SELECT "id", "user_id", "name", "color", "created_at"
        FROM "categories"
        WHERE "id" = $1 AND "user_id" = $2;
    `;

  const { rows } = await client.query(sqlQuery, [categoryId, userId]);
  return rows[0];
};

export const findCategoryByClientId = async (clientId, userId, client = pool) => {
  const sqlQuery = `
        SELECT "id", "user_id", "name", "color", "created_at", "client_id"
        FROM "categories"
        WHERE "client_id" = $1 AND "user_id" = $2;
    `;

  const { rows } = await client.query(sqlQuery, [clientId, userId]);
  return rows[0];
};

export const insertCategoryToDB = async (categoryData, client = pool) => {
  const { id, user_id, name, color, client_id = null } = categoryData;

  const sqlQuery = `
        INSERT INTO "categories" (id, user_id, name, color, client_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;

  const { rows } = await client.query(sqlQuery, [id, user_id, name, color, client_id]);
  
  return rows[0];
};

export const insertCategoryByClientId = async (categoryData, client = pool) => {
  const { id, user_id, name, color, client_id } = categoryData;

  const sqlQuery = `
        INSERT INTO "categories" (id, user_id, name, color, client_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT ("user_id", "client_id") WHERE "client_id" IS NOT NULL
        DO NOTHING
        RETURNING *;
    `;

  const { rows } = await client.query(sqlQuery, [id, user_id, name, color, client_id]);

  if (rows[0]) {
    return { row: rows[0], inserted: true };
  }

  const existing = await findCategoryByClientId(client_id, user_id, client);
  return { row: existing, inserted: false };
};

export const updateCategoryById = async (categoryData, client = pool) => {
  const { id, user_id, name, color } = categoryData;

  const sqlQuery = `
        UPDATE "categories" SET "name" = $3, "color" = $4
        WHERE "id" = $1 AND "user_id" = $2
        RETURNING *;
    `;

  const result = await client.query(sqlQuery, [id, user_id, name, color]);
  return result.rows[0];
};

export const deleteCategoryById = async (categoryId, userId, client = pool) => {
  const sqlQuery = `
        DELETE FROM "categories"
        WHERE "id" = $1 AND "user_id" = $2;
    `;

  const result = await client.query(sqlQuery, [categoryId, userId]);
  return result.rowCount > 0;
};

export const deleteAllCategories = async (userId, client = pool) => {
  const sqlQuery = `
        DELETE FROM "categories"
        WHERE "user_id" = $1;
    `;

  const result = await client.query(sqlQuery, [userId]);
  return result.rowCount > 0;
};
