import { pool } from "../../config/db.js";

export const findAllAccountsByUserId = async (userId, limit, decodedCursor, client = pool) =>
{
  let values = [userId];

  let sqlQuery = `
        SELECT "id", "user_id", "name", "balance", "created_at", "updated_at"
        FROM "accounts"
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

  const { rows } = await client.query(sqlQuery, values);
  return rows;
};

export const findAccountById = async (accountId, userId, client = pool) => {
  const sqlQuery = `
        SELECT "id", "user_id", "name", "balance", "created_at", "updated_at"
        FROM "accounts"
        WHERE "id" = $1 AND "user_id" = $2;
    `;

  const { rows } = await client.query(sqlQuery, [accountId, userId]);
  return rows[0];
};

export const insertAccountToDB = async (accountData, client = pool) => {
  const { id, user_id, name, balance } = accountData;

  const sqlQuery = `
        INSERT INTO "accounts" ("id", "user_id", "name", "balance")
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;

  const { rows } = await client.query(sqlQuery, [id, user_id, name, balance]);
  
  return rows[0];
};

export const updateAccountById = async (accountData, client = pool) => {
  const { id, user_id, name, balance } = accountData;

  const sqlQuery = `
        UPDATE "accounts"
        SET "name" = $3, "balance" = $4
        WHERE "id" = $1 AND "user_id" = $2
        RETURNING *;
    `;

  const result = await client.query(sqlQuery, [id, user_id, name, balance]);
  return result.rows[0];
};

export const deleteAccountById = async (accountId, userId, client = pool) => {
  const sqlQuery = `
        DELETE FROM "accounts"
        WHERE "id" = $1 AND "user_id" = $2;
    `;

  const result = await client.query(sqlQuery, [accountId, userId]);
  return result.rowCount > 0;
};

export const updateAccountBalance = async (accountId, userId, balanceDelta, client = pool) =>
{
  const sqlQuery = `
        UPDATE "accounts"
        SET "balance" = "balance" + $3
        WHERE "id" = $1 and "user_id" = $2
        RETURNING *;
  `;

  const { rows } = await client.query(sqlQuery, [accountId, userId, balanceDelta]);
  return rows[0];
}