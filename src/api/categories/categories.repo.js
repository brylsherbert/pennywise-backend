import { pool } from "../../config/db.js";

export const findAllCategoriesByUserId = async (userId) => {
  const sqlQuery = `
        SELECT "id", "user_id", "name", "color", "created_at"
        FROM "categories"
        WHERE "user_id" = $1;
    `;

  const { rows } = await pool.query(sqlQuery, [userId]);
  return rows;
};

export const findCategoryById = async (categoryId, userId) => {
  const sqlQuery = `
        SELECT "id", "user_id", "name", "color", "created_at"
        FROM "categories"
        WHERE "id" = $1 AND "user_id" = $2;
    `;

  const { rows } = await pool.query(sqlQuery, [categoryId, userId]);
  return rows[0];
};

export const insertCategoryToDB = async (categoryData) => {
  const { id, user_id, name, color } = categoryData;

  const sqlQuery = `
        INSERT INTO "categories" (id, user_id, name, color)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;

  const { rows } = await pool.query(sqlQuery, [id, user_id, name, color]);
  
  return rows[0];
};

export const updateCategoryById = async (categoryData) => {
  const { id, user_id, name, color } = categoryData;

  const sqlQuery = `
        UPDATE "categories" SET "name" = $3, "color" = $4
        WHERE "id" = $1 AND "user_id" = $2
        RETURNING *;
    `;

  const result = await pool.query(sqlQuery, [id, user_id, name, color]);
  return result.rows[0];
};

export const deleteCategoryById = async (categoryId, userId) => {
  const sqlQuery = `
        DELETE FROM "categories"
        WHERE "id" = $1 AND "user_id" = $2;
    `;

  const result = await pool.query(sqlQuery, [categoryId, userId]);
  return result.rowCount > 0;
};
