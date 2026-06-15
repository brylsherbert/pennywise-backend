import { pool } from "../../config/db.js";

export const findAllTransactionsByUserId = async (userId, limit, decodedCursor) =>
{
  let values = [userId];

  let sqlQuery = `
        SELECT "id", "user_id", "account_id", "budget_id", "type", "amount", "title", "transaction_date", "created_at", "updated_at"
        FROM "transactions"
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

export const findAllTransactionsByBudgetId = async (budgetId, userId) =>
{
  let values = [budgetId, userId];

  let sqlQuery = `
          SELECT "id", "user_id", "account_id", "budget_id", "type", "amount", "title", "transaction_date", "created_at", "updated_at"
          FROM "transactions"
          WHERE "budget_id" = $1 AND "user_id" = $2
          ORDER BY created_at DESC, id DESC
      `;

  const { rows } = await pool.query(sqlQuery, values);
  return rows;
};

export const findAllTransactionsByAccountId = async (accountId, userId) =>
{
  let values = [accountId, userId];

  let sqlQuery = `
            SELECT "id", "user_id", "account_id", "budget_id", "type", "amount", "title", "transaction_date", "created_at", "updated_at"
            FROM "transactions"
            WHERE "account_id" = $1 AND "user_id" = $2
            ORDER BY created_at DESC, id DESC
        `;

  const { rows } = await pool.query(sqlQuery, values);
  return rows;
};

export const findTransactionById = async (transactionId) =>
{
  const sqlQuery = `
        SELECT "id", "user_id", "account_id", "budget_id", "type", "amount", "title", "transaction_date", "created_at", "updated_at"
        FROM "transactions"
        WHERE "id" = $1;
    `;

  const { rows } = await pool.query(sqlQuery, [transactionId]);
  return rows[0];
};

export const insertTransactionToDB = async (transactionData, client = pool) =>
{
  const { id, user_id, account_id, budget_id, type, amount, title, transaction_date } = transactionData;

  const sqlQuery = `
        INSERT INTO "transactions" ("id", "user_id", "account_id", "budget_id", "type", "amount", "title", "transaction_date")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
    `;

  const { rows } = await client.query(sqlQuery, [id, user_id, account_id, budget_id, type, amount, title, transaction_date]);

  return rows[0];
};

export const updateTransactionById = async (transactionData, client = pool) =>
{
  const { id, user_id, account_id, budget_id, type, amount, title, transaction_date } = transactionData;

  const sqlQuery = `
        UPDATE "transactions" SET "type" = $3, "amount" = $4, "title" = $5, "budget_id" = $6, "account_id" = $7, "transaction_date" = $8
        WHERE "id" = $1 AND "user_id" = $2
        RETURNING *;
    `;

  const result = await client.query(sqlQuery, [id, user_id, type, amount, title, budget_id, account_id, transaction_date]);
  return result.rows[0];
};

export const deleteTransactionById = async (transactionId, userId, client = pool) =>
{
  const sqlQuery = `
        DELETE FROM "transactions"
        WHERE "id" = $1 AND "user_id" = $2;
    `;

  const result = await client.query(sqlQuery, [transactionId, userId]);
  return result.rowCount > 0;
};
