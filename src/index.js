import { connectDB } from "./config/db.js";
import app from "./app.js";

const PORT = process.env.PORT || 5001;

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
