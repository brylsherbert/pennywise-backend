import express from "express";
import { createUser, loginUser, logoutUser } from "./auth.controller.js";
import { validateBodyRequest } from "../../middlewares/validate-body-request.middleware.js";
import { createUserSchema, loginUserSchema } from "./auth.validator.js";

const router = express.Router();

// Remove getAllUsers in production, transfer to admin apis.
router.post("/login", validateBodyRequest(loginUserSchema), loginUser);
router.post("/create", validateBodyRequest(createUserSchema), createUser);
router.post("/logout", logoutUser);

export default router;