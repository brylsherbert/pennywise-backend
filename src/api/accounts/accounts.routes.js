import express from "express";
import { validateBodyRequest } from "../../middlewares/validate-body-request.middleware.js";
import { authenticationMiddleware } from "../../middlewares/authentication.middleware.js";
import { createAccountSchema, updateAccountSchema } from "./accounts.validator.js";
import { createAccountController, deleteAccountByIdController, getAllAccountsController, getAccountByIdController, updateAccountByIdController } from "./accounts.controller.js";

const router = express.Router();

router.use(authenticationMiddleware);
router.get("/", getAllAccountsController); 
router.get("/:id", getAccountByIdController); 
router.post("/create", validateBodyRequest(createAccountSchema), createAccountController);
router.patch("/:id/update", validateBodyRequest(updateAccountSchema), updateAccountByIdController);
router.delete("/:id/delete", deleteAccountByIdController);

export default router;