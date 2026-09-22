import express from "express";
import cors from "cors";
import apiRoutes from "./routes/v1.routes.js";
import healthRoutes from "./api/health/health.routes.js";
import globalErrorHandler from "./middlewares/global-error-handler.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1", apiRoutes);

app.use(globalErrorHandler);

export default app;
