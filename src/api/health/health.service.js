import * as healthRepo from "./health.repo.js";

export const getHealth = async () =>
{
    await healthRepo.pingDatabase();

    return {
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString(),
    };
};
