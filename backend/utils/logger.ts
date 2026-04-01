import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        },
      }
    : {
        // Google Cloud Logging compatible format
        messageKey: "message",
        formatters: {
          level(label: string) {
            return { severity: label.toUpperCase() };
          },
        },
      }),
});

// Compatibility wrapper: supports both pino-style `logger.info({obj}, "msg")`
// and legacy-style `logger.error("msg", err)` / `logger.info("msg", "data")`
function wrapLevel(level: "info" | "warn" | "error" | "debug") {
  return (...args: unknown[]) => {
    if (args.length === 0) return;
    if (args.length === 1) {
      // Single arg: treat as message
      if (typeof args[0] === "string") {
        pinoLogger[level](args[0]);
      } else {
        pinoLogger[level](args[0] as object);
      }
    } else if (typeof args[0] === "object" && args[0] !== null && typeof args[1] === "string") {
      // Pino-style: (obj, msg)
      pinoLogger[level](args[0] as object, args[1]);
    } else if (typeof args[0] === "string") {
      // Legacy-style: ("msg", ...rest) → merge rest into structured data
      const msg = args[0];
      const rest = args.slice(1);
      if (rest.length === 1 && rest[0] instanceof Error) {
        pinoLogger[level]({ err: rest[0] }, msg);
      } else if (rest.length === 1 && typeof rest[0] === "object") {
        pinoLogger[level](rest[0] as object, msg);
      } else {
        pinoLogger[level]({ extra: rest }, msg);
      }
    } else {
      pinoLogger[level]({ data: args });
    }
  };
}

export const logger = {
  info: wrapLevel("info"),
  warn: wrapLevel("warn"),
  error: wrapLevel("error"),
  debug: wrapLevel("debug"),
  child: pinoLogger.child.bind(pinoLogger),
};

export type Logger = pino.Logger;
