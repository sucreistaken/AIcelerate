import toast from "react-hot-toast";
import { t } from "./i18n";

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 2000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delay * Math.pow(2, attempt)));
      }
    }
  }
  toast.error(t("error.retryFailed"));
  throw lastError;
}
