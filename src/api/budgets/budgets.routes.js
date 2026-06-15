import express from "express";
import { validateBodyRequest } from "../../middlewares/validate-body-request.middleware.js";
import { authenticationMiddleware } from "../../middlewares/authentication.middleware.js";
import { createBudgetSchema, updateBudgetSchema } from "./budgets.validator.js";
import { createBudgetController, deleteBudgetByIdController, getAllBudgetsController, getBudgetByIdController, getBudgetsSummaryController, updateBudgetByIdController } from "./budgets.controller.js";

const router = express.Router();

router.use(authenticationMiddleware);
router.get("/", getAllBudgetsController); 
router.get("/summary", getBudgetsSummaryController);
router.get("/:id", getBudgetByIdController); 
router.post("/create", validateBodyRequest(createBudgetSchema), createBudgetController);
router.patch("/:id/update", validateBodyRequest(updateBudgetSchema), updateBudgetByIdController);
router.delete("/:id/delete", deleteBudgetByIdController);

export default router;