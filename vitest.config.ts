import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@convex": path.resolve(__dirname, "convex"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "convex/**/*.test.ts"],
    passWithNoTests: false,
    reporters: ["default"],
  },
});
