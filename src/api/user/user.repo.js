import { pool } from "../../config/db.js";


export const findAllUsers = async (limit, decodedCursor) =>
{
  const values = [];

  // Base SQL Query
  let query = `
    SELECT "id", "username", "email", "created_at"
    FROM users
  `;

  // If decodedCursor exists, push the values to the array and add the WHERE clause
  if (decodedCursor) {
    values.push(
      decodedCursor?.created_at,
      decodedCursor?.id
    );

    query += `
      WHERE (created_at, id) < ($1, $2)
    `;
  }

  // Add +1 to limit to check if there is more data using our service layer
  values.push(limit + 1);

  query += `
      ORDER BY created_at DESC, id DESC
      LIMIT $${values?.length}
    `;

  const { rows } = await pool.query(query, values);

  return rows;
};

export const findUserByEmail = async (userEmail) =>
{
  const sqlQuery = `SELECT * FROM users WHERE email = $1`;

  const result = await pool.query(sqlQuery, [userEmail]);
  return result.rows[0];
};

export const findUserById = async (userId) =>
{
  const sqlQuery = `SELECT * FROM users WHERE id = $1`;

  const result = await pool.query(sqlQuery, [userId]);
  return result.rows[0];
};

export const insertUserToDB = async (user) =>
{
  const { id, email, username, password } = user;
  const sqlQuery = `INSERT INTO users (id, email, username, password) VALUES ($1, $2, $3, $4) RETURNING *`;

  const result = await pool.query(sqlQuery, [id, email, username, password]);
  return result.rows[0];
};

export const updateUserById = async (user) =>
{
  const { id, username, password } = user;

  const sqlQuery = `UPDATE users SET username = $1, password = $2 WHERE id = $3 RETURNING *`;

  const result = await pool.query(sqlQuery, [username, password, id]);
  return result.rows[0];
};

export const deleteUserInDB = async (userId) =>
{
  const sqlQuery = `DELETE FROM users WHERE id = $1`;

  const result = await pool.query(sqlQuery, [userId]);
  return result.rowCount > 0;
};