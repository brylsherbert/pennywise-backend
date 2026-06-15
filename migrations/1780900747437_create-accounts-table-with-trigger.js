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
        CREATE TABLE IF NOT EXISTS "accounts" (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL,

            name VARCHAR(50),
            balance NUMERIC(14, 2) NOT NULL CHECK (balance >= 0),

            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            
            CONSTRAINT fk_accounts_user
                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        );
    `);

    pgm.sql(`
        CREATE TRIGGER "set_updated_at_accounts"
        BEFORE UPDATE ON "accounts"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    pgm.sql(`
        CREATE INDEX idx_accounts_user_id ON accounts (user_id);
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
        DROP TABLE IF EXISTS "accounts";
    `);
};
