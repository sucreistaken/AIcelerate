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
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    // Modern browsers only — skip modulePreload polyfill
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core: always loaded
          vendor: ["react", "react-dom", "react-router-dom"],
          state: ["zustand", "socket.io-client"],
          ui: ["framer-motion", "lucide-react"],
          // NOTE: mermaid and html2pdf are NOT listed here intentionally.
          // They use dynamic import() in their consumers, so Vite auto-splits
          // them into separate async chunks. Listing them here would force
          // them into the eager bundle, defeating code-splitting.
        },
      },
    },
  },
});
