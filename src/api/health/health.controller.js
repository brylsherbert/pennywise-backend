import * as healthService from "./health.service.js";
import { handleResponse } from "../../utils/response-handler.utils.js";

export const getHealthController = async (req, res, next) =>
{
    try {
        const health = await healthService.getHealth();
        handleResponse(res, 200, "Health fetched successfully", health);
    } catch (error) {
        next(error);
    }
};