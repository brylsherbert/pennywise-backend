import "./helpers.js";
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { v7 as uuidv7 } from "uuid";
import app from "../src/app.js";
import { pool } from "../src/config/db.js";
import { uniqueEmail, authHeader } from "./helpers.js";

const registerUser = async () =>
{
  const email = uniqueEmail();
  const password = "password123";
  const res = await request(app)
    .post("/api/v1/auth/create")
    .send({ username: "guestuser", email, password });

  assert.equal(res.status, 201);
  return {
    email,
    password,
    token: res.body.data.token,
    user: res.body.data.user,
    has_existing_data: res.body.data.has_existing_data,
  };
};

const deleteUser = async (userId) =>
{
  await pool.query(`DELETE FROM "users" WHERE "id" = $1`, [userId]);
};

describe("guest snapshot import", () =>
{
  after(async () =>
  {
    await pool.end();
  });

  it("register returns has_existing_data false", async () =>
  {
    const created = await registerUser();
    assert.equal(created.has_existing_data, false);
    await deleteUser(created.user.id);
  });

  it("returns 401 when unauthenticated", async () =>
  {
    const res = await request(app)
      .post("/api/v1/user/import-guest-data")
      .send({});

    assert.equal(res.status, 401);
    assert.ok(res.body.error);
  });

  it("imports empty payload with zero counts", async () =>
  {
    const created = await registerUser();

    const res = await request(app)
      .post("/api/v1/user/import-guest-data")
      .set(authHeader(created.token))
      .send({});

    assert.equal(res.status, 201);
    assert.equal(res.body.data.categories, 0);
    assert.equal(res.body.data.accounts, 0);
    assert.equal(res.body.data.budgets, 0);
    assert.equal(res.body.data.transactions, 0);

    await deleteUser(created.user.id);
  });

  it("imports into empty account with opening balance only", async () =>
  {
    const created = await registerUser();
    const accountClientId = uuidv7();

    const res = await request(app)
      .post("/api/v1/user/import-guest-data")
      .set(authHeader(created.token))
      .send({
        accounts: [
          { client_id: accountClientId, name: "Cash Wallet", balance: "150.50" },
        ],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.accounts, 1);

    const accountId = res.body.data.id_map.accounts[accountClientId];
    const { rows } = await pool.query(
      `SELECT "balance", "name" FROM "accounts" WHERE "id" = $1 AND "user_id" = $2`,
      [accountId, created.user.id],
    );

    assert.equal(Number(rows[0].balance), 150.5);
    assert.equal(rows[0].name, "Cash Wallet");

    await deleteUser(created.user.id);
  });

  it("is additive and leaves existing live rows unchanged", async () =>
  {
    const created = await registerUser();

    const liveAccount = await request(app)
      .post("/api/v1/accounts/create")
      .set(authHeader(created.token))
      .send({ name: "Live Account", balance: 200 });

    assert.equal(liveAccount.status, 201);
    const liveAccountId = liveAccount.body.data.id;
    const liveBalance = liveAccount.body.data.balance;

    const guestAccountClientId = uuidv7();
    const res = await request(app)
      .post("/api/v1/user/import-guest-data")
      .set(authHeader(created.token))
      .send({
        accounts: [
          { client_id: guestAccountClientId, name: "Guest Account", balance: "75" },
        ],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.accounts, 1);

    const { rows } = await pool.query(
      `SELECT "id", "name", "balance" FROM "accounts" WHERE "user_id" = $1 ORDER BY "name"`,
      [created.user.id],
    );

    assert.equal(rows.length, 2);

    const stillLive = rows.find((row) => row.id === liveAccountId);
    assert.ok(stillLive);
    assert.equal(stillLive.name, "Live Account");
    assert.equal(Number(stillLive.balance), Number(liveBalance));

    await deleteUser(created.user.id);
  });

  it("is idempotent on retry for the same client_ids", async () =>
  {
    const created = await registerUser();
    const categoryClientId = uuidv7();
    const accountClientId = uuidv7();
    const budgetClientId = uuidv7();
    const incomeClientId = uuidv7();

    const payload = {
      categories: [
        { client_id: categoryClientId, name: "Food", color: "#ff0000" },
      ],
      accounts: [
        { client_id: accountClientId, name: "Checking", balance: "300" },
      ],
      budgets: [
        {
          client_id: budgetClientId,
          category_client_id: categoryClientId,
          name: "Groceries",
          target_amount: 100,
        },
      ],
      transactions: [
        {
          client_id: incomeClientId,
          account_client_id: accountClientId,
          budget_client_id: null,
          type: "income",
          amount: 100,
          title: "Paycheck",
          transaction_date: "2024-01-01T00:00:00.000Z",
          budgets: [],
        },
      ],
    };

    const first = await request(app)
      .post("/api/v1/user/import-guest-data")
      .set(authHeader(created.token))
      .send(payload);

    assert.equal(first.status, 201);
    assert.equal(first.body.data.categories, 1);
    assert.equal(first.body.data.accounts, 1);
    assert.equal(first.body.data.budgets, 1);
    assert.equal(first.body.data.transactions, 1);

    const accountId = first.body.data.id_map.accounts[accountClientId];
    const { rows: beforeRows } = await pool.query(
      `SELECT "balance" FROM "accounts" WHERE "id" = $1`,
      [accountId],
    );
    const balanceBefore = Number(beforeRows[0].balance);

    const second = await request(app)
      .post("/api/v1/user/import-guest-data")
      .set(authHeader(created.token))
      .send(payload);

    assert.equal(second.status, 201);
    assert.equal(second.body.data.categories, 0);
    assert.equal(second.body.data.accounts, 0);
    assert.equal(second.body.data.budgets, 0);
    assert.equal(second.body.data.transactions, 0);
    assert.equal(
      second.body.data.id_map.accounts[accountClientId],
      first.body.data.id_map.accounts[accountClientId],
    );

    const { rows: afterRows } = await pool.query(
      `SELECT "balance" FROM "accounts" WHERE "id" = $1`,
      [accountId],
    );
    assert.equal(Number(afterRows[0].balance), balanceBefore);

    const { rows: counts } = await pool.query(
      `
        SELECT
          (SELECT COUNT(*)::int FROM "categories" WHERE "user_id" = $1) AS categories,
          (SELECT COUNT(*)::int FROM "accounts" WHERE "user_id" = $1) AS accounts,
          (SELECT COUNT(*)::int FROM "budgets" WHERE "user_id" = $1) AS budgets,
          (SELECT COUNT(*)::int FROM "transactions" WHERE "user_id" = $1) AS transactions
      `,
      [created.user.id],
    );

    assert.equal(counts[0].categories, 1);
    assert.equal(counts[0].accounts, 1);
    assert.equal(counts[0].budgets, 1);
    assert.equal(counts[0].transactions, 1);

    await deleteUser(created.user.id);
  });

  it("rejects invalid FK client_id", async () =>
  {
    const created = await registerUser();
    const missingCategoryClientId = uuidv7();

    const res = await request(app)
      .post("/api/v1/user/import-guest-data")
      .set(authHeader(created.token))
      .send({
        budgets: [
          {
            client_id: uuidv7(),
            category_client_id: missingCategoryClientId,
            name: "Orphan Budget",
            target_amount: 50,
          },
        ],
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /Category not found/i);

    await deleteUser(created.user.id);
  });

  it("applies income expense and fill side effects with balance back-calc", async () =>
  {
    const created = await registerUser();

    const categoryClientId = uuidv7();
    const accountClientId = uuidv7();
    const budgetClientId = uuidv7();
    const incomeClientId = uuidv7();
    const expenseClientId = uuidv7();
    const fillClientId = uuidv7();

    const providedRunningBalance = 250;
    const incomeAmount = 100;
    const expenseAmount = 40;
    const fillAmount = 50;

    const res = await request(app)
      .post("/api/v1/user/import-guest-data")
      .set(authHeader(created.token))
      .send({
        categories: [
          { client_id: categoryClientId, name: "Lifestyle", color: "#00ff00" },
        ],
        accounts: [
          {
            client_id: accountClientId,
            name: "Main Account",
            balance: String(providedRunningBalance),
          },
        ],
        budgets: [
          {
            client_id: budgetClientId,
            category_client_id: categoryClientId,
            name: "Fun Budget",
            target_amount: 200,
          },
        ],
        transactions: [
          {
            client_id: incomeClientId,
            account_client_id: accountClientId,
            budget_client_id: null,
            type: "income",
            amount: incomeAmount,
            title: "Salary",
            transaction_date: "2024-02-01T00:00:00.000Z",
            budgets: [],
          },
          {
            client_id: fillClientId,
            account_client_id: null,
            budget_client_id: null,
            type: "fill",
            title: "Fill Fun",
            transaction_date: "2024-02-02T00:00:00.000Z",
            budgets: [
              {
                budget_client_id: budgetClientId,
                new_allocated_amount: fillAmount,
              },
            ],
          },
          {
            client_id: expenseClientId,
            account_client_id: accountClientId,
            budget_client_id: budgetClientId,
            type: "expense",
            amount: expenseAmount,
            title: "Dinner",
            transaction_date: "2024-02-03T00:00:00.000Z",
            budgets: [],
          },
        ],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.transactions, 3);

    const accountId = res.body.data.id_map.accounts[accountClientId];
    const budgetId = res.body.data.id_map.budgets[budgetClientId];

    const { rows: accountRows } = await pool.query(
      `SELECT "balance" FROM "accounts" WHERE "id" = $1`,
      [accountId],
    );
    const { rows: budgetRows } = await pool.query(
      `SELECT "allocated_amount" FROM "budgets" WHERE "id" = $1`,
      [budgetId],
    );

    assert.equal(Number(accountRows[0].balance), providedRunningBalance);
    assert.equal(Number(budgetRows[0].allocated_amount), fillAmount - expenseAmount);

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: created.email, password: created.password });

    assert.equal(login.status, 200);
    assert.equal(login.body.data.has_existing_data, true);

    await deleteUser(created.user.id);
  });

  it("imports expense without prior fill by seeding opening allocated", async () =>
  {
    const created = await registerUser();
    const accountClientId = uuidv7();
    const budgetClientId = uuidv7();
    const expenseClientId = uuidv7();

    const res = await request(app)
      .post("/api/v1/user/import-guest-data")
      .set(authHeader(created.token))
      .send({
        accounts: [
          { client_id: accountClientId, name: "RCBC", balance: "44977" },
        ],
        budgets: [
          {
            client_id: budgetClientId,
            category_client_id: null,
            name: "HelloBudget",
            target_amount: 50000,
          },
        ],
        transactions: [
          {
            client_id: expenseClientId,
            account_client_id: accountClientId,
            budget_client_id: budgetClientId,
            type: "expense",
            amount: 5023,
            title: "HelloTrans",
            transaction_date: "2026-09-20T08:02:47.304Z",
            budgets: [],
          },
        ],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.accounts, 1);
    assert.equal(res.body.data.budgets, 1);
    assert.equal(res.body.data.transactions, 1);

    const accountId = res.body.data.id_map.accounts[accountClientId];
    const budgetId = res.body.data.id_map.budgets[budgetClientId];

    const { rows: accountRows } = await pool.query(
      `SELECT "balance" FROM "accounts" WHERE "id" = $1`,
      [accountId],
    );
    const { rows: budgetRows } = await pool.query(
      `SELECT "allocated_amount" FROM "budgets" WHERE "id" = $1`,
      [budgetId],
    );

    assert.equal(Number(accountRows[0].balance), 44977);
    assert.equal(Number(budgetRows[0].allocated_amount), 0);

    await deleteUser(created.user.id);
  });
});
