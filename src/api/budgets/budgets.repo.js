import { pool } from "../../config/db.js";

export const findAllBudgetsByUserId = async (userId, limit, decodedCursor) =>
{
  let values = [userId];

  let sqlQuery = `
        SELECT "id", "user_id", "category_id", "name", "target_amount", "allocated_amount", "created_at", "updated_at"
        FROM "budgets"
        WHERE "user_id" = $1
    `;
  
  if (decodedCursor) {
    values.push(
      decodedCursor?.created_at,
      decodedCursor?.id
    );
    
    sqlQuery += `
      AND (created_at, id) < ($2, $3)
    `;
  }

  // Add +1 to limit to check if there is more data using our service layer
  values.push(limit + 1);

  sqlQuery += `
      ORDER BY created_at DESC, id DESC
      LIMIT $${values?.length}
    `;

  const { rows } = await pool.query(sqlQuery, values);
  return rows;
};

export const findBudgetById = async (budgetId, userId) => {
  const sqlQuery = `
        SELECT "id", "user_id", "category_id", "name", "target_amount", "allocated_amount", "created_at", "updated_at"
        FROM "budgets"
        WHERE "id" = $1 AND "user_id" = $2;
    `;

  const { rows } = await pool.query(sqlQuery, [budgetId, userId]);
  return rows[0];
};

export const insertBudgetToDB = async (budgetPayload, client = pool) => {
  const { id, user_id, category_id, name, target_amount } = budgetPayload;

  const sqlQuery = `
        INSERT INTO "budgets" ("id", "user_id", "category_id", "name", "target_amount")
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;

  const { rows } = await client.query(sqlQuery, [id, user_id, category_id, name, target_amount]);
  
  return rows[0];
};

export const updateBudgetById = async (budgetPayload) => {
  const { id, user_id, category_id, name, target_amount } = budgetPayload;

  const sqlQuery = `
        UPDATE "budgets" SET "category_id" = $3, "name" = $4, "target_amount" = $5
        WHERE "id" = $1 AND "user_id" = $2
        RETURNING *;
    `;

  const result = await pool.query(sqlQuery, [id, user_id, category_id, name, target_amount]);
  return result.rows[0];
};

export const deleteBudgetById = async (budgetId, userId, client = pool) => {
  const sqlQuery = `
        DELETE FROM "budgets"
        WHERE "id" = $1 AND "user_id" = $2;
    `;

  const result = await client.query(sqlQuery, [budgetId, userId]);
  return result.rowCount > 0;
};

export const getUserBudgetSummary = async (userId, client = pool) => {
  const sqlQuery = `
    SELECT
      COALESCE((
        SELECT SUM(balance)
        FROM "accounts"
        WHERE "user_id" = $1
      ), 0) AS "total_balance",
      COALESCE((
        SELECT SUM(allocated_amount)
        FROM "budgets"
        WHERE "user_id" = $1
        ), 0) AS "total_allocated",
      COALESCE((
        SELECT SUM(amount)
        FROM "transactions"
        WHERE "user_id" = $1 AND "type" = 'income'
      ), 0) AS "total_income_amount",
      COALESCE((
        SELECT SUM(amount)
        FROM "transactions"
        WHERE "user_id" = $1 AND "type" = 'expense'
      ), 0) AS "total_expense_amount",
      COALESCE((
        SELECT SUM(amount)
        FROM "transactions"
        WHERE "user_id" = $1 AND "type" = 'fill'
        ), 0) AS "total_fill_amount",
      COALESCE((
        SELECT SUM(balance)
        FROM "accounts"
        WHERE "user_id" = $1
      ), 0)
      -
      COALESCE((
        SELECT SUM(allocated_amount)
        FROM budgets
        WHERE "user_id" = $1
      ), 0) AS "total_unallocated";
  `;

  const { rows } = await client.query(sqlQuery, [userId]);
  return rows[0];
};

export const updateAllocatedAmount = async (budgetId, userId, balanceDelta, client = pool) => {
    const sqlQuery = `
          UPDATE "budgets"
          SET "allocated_amount" = "allocated_amount" + $3
          WHERE "id" = $1 and "user_id" = $2
          RETURNING *;
    `;
  
    const { rows } = await client.query(sqlQuery, [budgetId, userId, balanceDelta]);
    return rows[0];
}