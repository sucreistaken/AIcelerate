import { logger } from "../utils/logger";
import mongoose from "mongoose";
import { env } from "./env";

export async function connectDB(): Promise<void> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
      logger.info(`MongoDB connected: ${mongoose.connection.host}`);
      return;
    } catch (err) {
      logger.error({ err }, `MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed`);
      if (attempt === MAX_RETRIES) {
        logger.warn("Could not connect to MongoDB. Server will start without MongoDB (JSON storage still works).");
        return;
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }
}

mongoose.connection.on("error", (err) => {
  logger.error({ err }, "MongoDB connection error");
});

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});
