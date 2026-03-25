import { logger } from "../utils/logger";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    logger.error(`Missing required env var: ${name}. Check backend/.env`);
    process.exit(1);
  }
  return val;
}

export const env = {
  GEMINI_API_KEY: requireEnv("GEMINI_API_KEY"),
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/learncraft",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  PORT: Number(process.env.PORT || 4000),
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  PYTHON_BIN: process.env.PYTHON_BIN || "python",
  NODE_ENV: process.env.NODE_ENV || "development",
  USE_MONGODB: process.env.USE_MONGODB || "false",
};
