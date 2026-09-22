import express from "express";
import {
  deleteCurrentUserController,
  getCurrentUserController,
  importGuestDataController,
  resetAllDataController,
  updateCurrentUserController,
} from "./user.controller.js";
import { validateBodyRequest } from "../../middlewares/validate-body-request.middleware.js";
import { importGuestDataSchema, updateUserSchema } from "./user.validator.js";
import { authenticationMiddleware } from "../../middlewares/authentication.middleware.js";

const router = express.Router();

router.use(authenticationMiddleware);

router.get("/", getCurrentUserController);
router.patch("/update", validateBodyRequest(updateUserSchema), updateCurrentUserController);
router.post("/import-guest-data", validateBodyRequest(importGuestDataSchema), importGuestDataController);
router.delete("/delete", deleteCurrentUserController);
router.delete("/reset-all-data", resetAllDataController);

export default router;
