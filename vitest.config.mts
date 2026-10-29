import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@convex": path.resolve(import.meta.dirname, "convex"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "convex/**/*.test.ts"],
    passWithNoTests: false,
    reporters: ["default"],
  },
});
