// Vitest global setup.
// Registers @testing-library/jest-dom custom matchers (e.g. toBeInTheDocument)
// and unmounts React trees after each test to keep cases isolated.
import "@testing-library/jest-dom/vitest";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "vitest-axe/matchers";

// Register vitest-axe matchers globally so accessibility tests can use
// expect(results).toHaveNoViolations() (Requirement 20.1).
expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});
