import { pool } from "../../config/db.js";

export const insertTransactionBudgetToDB = async (data, client = pool) =>
{
    const {
        id,
        user_id,
        transaction_id,
        budget_id,
        allocated_amount,
    } = data;

    const sqlQuery = `
        INSERT INTO "fill_transaction_budgets" (
            "id",
            "user_id",
            "transaction_id",
            "budget_id",
            "allocated_amount"
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;

    const { rows } = await client.query(sqlQuery, [
        id,
        user_id,
        transaction_id,
        budget_id,
        allocated_amount,
    ]);

    return rows[0];
};

export const findAllTransactionBudgets = async (userId, client = pool) =>
{
    const sqlQuery = `
            SELECT
            "id",
            "user_id",
            "transaction_id",
            "budget_id",
            "allocated_amount",
            "created_at",
            "updated_at"
            FROM "fill_transaction_budgets"
            WHERE "user_id" = $1
        `;

    const { rows } = await client.query(sqlQuery, [userId]);
    return rows;
};

export const findTransactionBudgetsByTransactionId = async (transactionId, userId, client = pool) =>
{
    const sqlQuery = `
        SELECT
        "id",
        "user_id",
        "transaction_id",
        "budget_id",
        "allocated_amount",
        "created_at",
        "updated_at"
        FROM "fill_transaction_budgets"
        WHERE "transaction_id" = $1 AND "user_id" = $2;
    `;

    const { rows } = await client.query(sqlQuery, [transactionId, userId]);
    return rows;
};

export const findTransactionBudgetsByBudgetId = async (budgetId, userId, client = pool) =>
{
    const sqlQuery = `
            SELECT
            "id",
            "user_id",
            "transaction_id",
            "budget_id",
            "allocated_amount",
            "created_at",
            "updated_at"
            FROM "fill_transaction_budgets"
            WHERE "budget_id" = $1 AND "user_id" = $2;
        `;

    const { rows } = await client.query(sqlQuery, [budgetId, userId]);
    return rows;
};

export const findTransactionBudgetById = async (transactionBudgetId, userId, client = pool) =>
{
    const sqlQuery = `
                SELECT
                "id",
                "user_id",
                "transaction_id",
                "budget_id",
                "allocated_amount",
                "created_at",
                "updated_at"
                FROM "fill_transaction_budgets"
                WHERE "id" = $1 AND "user_id" = $2;
            `;

    const { rows } = await client.query(sqlQuery, [transactionBudgetId, userId]);
    return rows[0];
};

export const deleteTransactionBudgetsByTransactionId = async (transactionId, userId, client = pool) =>
{
    const sqlQuery = `
        DELETE FROM "fill_transaction_budgets"
        WHERE "transaction_id" = $1 AND "user_id" = $2;
    `;

    const result = await client.query(sqlQuery, [transactionId, userId]);
    return result.rowCount;
};

export const deleteTransactionBudgetsByBudgetId = async (budgetId, userId, client = pool) =>
{
    const sqlQuery = `
            DELETE FROM "fill_transaction_budgets"
            WHERE "budget_id" = $1 AND "user_id" = $2;
        `;

    const result = await client.query(sqlQuery, [budgetId, userId]);
    return result.rowCount;
};

export const deleteTransactionBudgetByTransactionBudgetId = async (transactionBudgetId, userId, client = pool) =>
{
    const sqlQuery = `
            DELETE FROM "fill_transaction_budgets"
            WHERE "id" = $1 AND "user_id" = $2;
        `;

    const result = await client.query(sqlQuery, [transactionBudgetId, userId]);
    return result.rowCount > 0;
};

export const deleteAllTransactionBudgets = async (userId, client = pool) =>
{
    const sqlQuery = `
            DELETE FROM "fill_transaction_budgets"
            WHERE "user_id" = $1;
        `;

    const result = await client.query(sqlQuery, [userId]);
    return result.rowCount > 0;
};

export const updateTransactionBudgetAllocatedAmount = async (transactionId, budgetId, userId, balanceDelta, client = pool) =>
{
    const sqlQuery = `
        UPDATE "fill_transaction_budgets"
        SET "allocated_amount" = "allocated_amount" + $4
        WHERE "transaction_id" = $1 AND "budget_id" = $2 AND "user_id" = $3
        RETURNING *;
    `;

    const { rows } = await client.query(sqlQuery, [transactionId, budgetId, userId, balanceDelta]);
    return rows[0];
}

