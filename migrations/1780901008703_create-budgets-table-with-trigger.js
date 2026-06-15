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
        CREATE TABLE IF NOT EXISTS "budgets" (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL,
            category_id UUID,

            name VARCHAR(100) NOT NULL,
            target_amount NUMERIC(14, 2) NOT NULL CHECK (target_amount >= 0),
            allocated_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,

            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),

            CONSTRAINT fk_budgets_user
                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE,

            CONSTRAINT fk_budgets_category
                FOREIGN KEY (category_id)
                REFERENCES categories(id)
                ON DELETE SET NULL,

            CONSTRAINT chk_allocated_amount_not_negative
                CHECK (allocated_amount >= 0)
        );
    `);

    pgm.sql(`
        CREATE TRIGGER "set_updated_at_budgets"
        BEFORE UPDATE ON "budgets"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    pgm.sql(`
        CREATE INDEX idx_budgets_user_id ON budgets (user_id);
        CREATE INDEX idx_budgets_category_id ON budgets (category_id);
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
        DROP TABLE IF EXISTS "budgets";
    `);
};
