/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) =>
{
    pgm.sql(`
        ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "client_id" UUID;
        ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "client_id" UUID;
        ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "client_id" UUID;
        ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "client_id" UUID;
    `);

    pgm.sql(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_id_client_id
            ON "categories" ("user_id", "client_id")
            WHERE "client_id" IS NOT NULL;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_user_id_client_id
            ON "accounts" ("user_id", "client_id")
            WHERE "client_id" IS NOT NULL;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_id_client_id
            ON "budgets" ("user_id", "client_id")
            WHERE "client_id" IS NOT NULL;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_user_id_client_id
            ON "transactions" ("user_id", "client_id")
            WHERE "client_id" IS NOT NULL;
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) =>
{
    pgm.sql(`
        DROP INDEX IF EXISTS idx_transactions_user_id_client_id;
        DROP INDEX IF EXISTS idx_budgets_user_id_client_id;
        DROP INDEX IF EXISTS idx_accounts_user_id_client_id;
        DROP INDEX IF EXISTS idx_categories_user_id_client_id;
    `);

    pgm.sql(`
        ALTER TABLE "transactions" DROP COLUMN IF EXISTS "client_id";
        ALTER TABLE "budgets" DROP COLUMN IF EXISTS "client_id";
        ALTER TABLE "accounts" DROP COLUMN IF EXISTS "client_id";
        ALTER TABLE "categories" DROP COLUMN IF EXISTS "client_id";
    `);
};
