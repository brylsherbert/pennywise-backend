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
            CREATE TABLE IF NOT EXISTS "fill_transaction_budgets" (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL,
                transaction_id UUID NOT NULL,
                budget_id UUID NOT NULL,
                allocated_amount NUMERIC(12, 2) NOT NULL,
    
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
    
                CONSTRAINT fk_fill_transaction_budgets_user
                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE,
                
                CONSTRAINT fk_fill_transaction_budgets_transaction
                    FOREIGN KEY (transaction_id)
                    REFERENCES transactions(id)
                    ON DELETE CASCADE,
    
                CONSTRAINT fk_fill_transaction_budgets_budget
                    FOREIGN KEY (budget_id)
                    REFERENCES budgets(id)
                    ON DELETE CASCADE,
    
                CONSTRAINT unique_transaction_budget
                    UNIQUE (transaction_id, budget_id)
            );
    
            CREATE TRIGGER "set_updated_at_fill_transaction_budgets"
            BEFORE UPDATE ON "fill_transaction_budgets"
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    
            CREATE INDEX "idx_fill_transaction_budgets_transaction_id"
                ON "fill_transaction_budgets" ("transaction_id");
    
            CREATE INDEX "idx_fill_transaction_budgets_budget_id"
                ON "fill_transaction_budgets" ("budget_id");
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
            DROP TABLE IF EXISTS "fill_transaction_budgets";
        `);
};
