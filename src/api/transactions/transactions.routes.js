import express from "express";
import { validateBodyRequest } from "../../middlewares/validate-body-request.middleware.js";
import { authenticationMiddleware } from "../../middlewares/authentication.middleware.js";
import { createTransactionSchema, updateTransactionSchema } from "./transactions.validator.js";
import { createTransactionController, deleteTransactionByIdController, getAllTransactionsController, getTransactionByIdController, updateTransactionByIdController, getAllTransactionsByBudgetIdController, getAllTransactionsByAccountIdController } from "./transactions.controller.js";

const router = express.Router();

router.use(authenticationMiddleware);
router.get("/", getAllTransactionsController);
router.get("/:id/budgets", getAllTransactionsByBudgetIdController);
router.get("/:id/accounts", getAllTransactionsByAccountIdController);
router.get("/:id", getTransactionByIdController); 
router.post("/create", validateBodyRequest(createTransactionSchema), createTransactionController);
router.patch("/:id/update", validateBodyRequest(updateTransactionSchema), updateTransactionByIdController);
router.delete("/:id/delete", deleteTransactionByIdController);

export default router;