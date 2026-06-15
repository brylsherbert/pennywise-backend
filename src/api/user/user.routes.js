import express from "express";
import { deleteCurrentUserController, getCurrentUserController, updateCurrentUserController } from "./user.controller.js";
import { validateBodyRequest } from "../../middlewares/validate-body-request.middleware.js";
import { updateUserSchema } from "./user.validator.js";
import { authenticationMiddleware } from "../../middlewares/authentication.middleware.js";

const router = express.Router();

router.use(authenticationMiddleware);

router.get("/", getCurrentUserController);
router.patch("/update", validateBodyRequest(updateUserSchema), updateCurrentUserController);
router.delete("/delete", deleteCurrentUserController);

export default router;