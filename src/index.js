import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import apiRoutes from "./routes/v1.routes.js";
import globalErrorHandler from "./middlewares/global-error-handler.middleware.js";

// Initialize db and create an express app

const app = express();

// Add middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5001;

// Routes
app.use('/api/v1', apiRoutes);

// Initialize global error handler (ran on next)
app.use(globalErrorHandler);

async function bootstrap() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("Server is running on port:", PORT);
    });
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }
}

bootstrap();
