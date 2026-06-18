import express from "express";
import userRoutes from "../api/user/user.routes.js";
import authRoutes from "../api/auth/auth.routes.js";
import transactionsRoutes from "../api/transactions/transactions.routes.js";
import categoriesRoutes from "../api/categories/categories.routes.js";
import accountsRoutes from "../api/accounts/accounts.routes.js";
import budgetsRoutes from "../api/budgets/budgets.routes.js";
import healthRoutes from "../api/health/health.routes.js";
import { generalLimiter, authLimiter, adminLimiter } from '../middlewares/rate-limit.middleware.js';

const router = express.Router();
router.use(generalLimiter);
// Remove getAllUsers in production, transfer to admin apis.
router.use("/user", userRoutes);
router.use("/auth", authLimiter, authRoutes);
router.use("/transactions", transactionsRoutes);
router.use("/categories", categoriesRoutes);
router.use("/accounts", accountsRoutes);
router.use("/budgets", budgetsRoutes);
router.use("/health", healthRoutes);

export default router;