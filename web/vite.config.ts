/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:4000" },
  },
  build: {
    target: "ES2020",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          state: ["zustand", "socket.io-client"],
          ui: ["framer-motion", "lucide-react"],
          charts: ["mermaid"],
        },
      },
    },
  },
});
