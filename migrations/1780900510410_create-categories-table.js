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
        CREATE TABLE IF NOT EXISTS "categories" (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL,

            name VARCHAR(100) NOT NULL,
            color VARCHAR(20),

            created_at TIMESTAMP DEFAULT NOW(),
            
            CONSTRAINT fk_categories_user
                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        );
    `);

    pgm.sql(`
        CREATE INDEX idx_categories_user_id ON "categories" (user_id);
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.sql(`
        DROP TABLE IF EXISTS "categories";
    `);
};
