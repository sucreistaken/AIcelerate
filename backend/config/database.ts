import { logger } from "../utils/logger";
import mongoose from "mongoose";
import { env } from "./env";
import { registerGlobalPlugins } from "./mongoose-plugins";
import { registerQueryMonitor } from "./queryMonitor";

// Register global plugins BEFORE any model is compiled
registerGlobalPlugins();
registerQueryMonitor();

const MONGO_OPTIONS: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  retryReads: true,
};

export async function connectDB(): Promise<void> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, MONGO_OPTIONS);
      logger.info(`MongoDB connected: ${mongoose.connection.host} (pool: ${MONGO_OPTIONS.maxPoolSize})`);
      return;
    } catch (err) {
      logger.error({ err }, `MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed`);
      if (attempt === MAX_RETRIES) {
        logger.warn("Could not connect to MongoDB after all retries.");
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

mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected");
});
