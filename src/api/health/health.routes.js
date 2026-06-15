import express from "express";
import { getHealthController } from "./health.controller.js";

const router = express.Router();

router.get("/", getHealthController);

export default router;