/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Vitest configuration for the SEE GPA Calculator.
// - React/JSX support via @vitejs/plugin-react (React 19).
// - jsdom environment for component/interaction tests (@testing-library/react).
// - Global setup wires @testing-library/jest-dom matchers and cleanup.
// Property-based tests (fast-check) and unit/component tests live under src/**.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
