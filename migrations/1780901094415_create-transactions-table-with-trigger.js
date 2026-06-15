/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS "transactions" (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL,
            account_id UUID,
            budget_id UUID,

            type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense', 'fill')),
            amount NUMERIC(12, 2) NOT NULL,
            title TEXT,

            transaction_date TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            
            CONSTRAINT fk_transactions_user
                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE,

            CONSTRAINT fk_transactions_account
                FOREIGN KEY (account_id)
                REFERENCES accounts(id)
                ON DELETE CASCADE,

            CONSTRAINT fk_transactions_budget
                FOREIGN KEY (budget_id)
                REFERENCES budgets(id)
                ON DELETE CASCADE
        );
    `);

    pgm.sql(`
        CREATE TRIGGER "set_updated_at_transactions"
        BEFORE UPDATE ON "transactions"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    pgm.sql(`
        CREATE INDEX "idx_transactions_user_id" ON "transactions" ("user_id");
        CREATE INDEX "idx_transactions_budget_id" ON "transactions" ("budget_id");
        CREATE INDEX "idx_transactions_account_id" ON "transactions" ("account_id");
        CREATE INDEX "idx_transactions_date" ON "transactions" ("transaction_date");
    `)
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) =>
{
    pgm.sql(`
        DROP TABLE IF EXISTS "transactions";
    `);
};
