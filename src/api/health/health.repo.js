import { pool } from "../../config/db.js";
import { throwErrorWithMessage } from "../../utils/error.utils.js";

const PING_TIMEOUT_MS = 3000;

export const pingDatabase = async () =>
{
    try {
        await Promise.race([
            pool.query("SELECT 1"),
            new Promise((_, reject) => setTimeout(() => reject(), PING_TIMEOUT_MS)),
        ]);
    } catch {
        throwErrorWithMessage("Database is not connected", 503);
    }
};
