import express from "express";
import userRoutes from "../api/user/user.routes.js";
import authRoutes from "../api/auth/auth.routes.js";
import transactionsRoutes from "../api/transactions/transactions.routes.js";
import categoriesRoutes from "../api/categories/categories.routes.js";
import accountsRoutes from "../api/accounts/accounts.routes.js";
import budgetsRoutes from "../api/budgets/budgets.routes.js";
import { generalLimiter, authLimiter } from '../middlewares/rate-limit.middleware.js';

const router = express.Router();
const isTest = process.env.NODE_ENV === "test";

if (!isTest) {
  router.use(generalLimiter);
}

router.use("/user", userRoutes);

if (isTest) {
  router.use("/auth", authRoutes);
} else {
  router.use("/auth", authLimiter, authRoutes);
}

router.use("/transactions", transactionsRoutes);
router.use("/categories", categoriesRoutes);
router.use("/accounts", accountsRoutes);
router.use("/budgets", budgetsRoutes);

export default router;
