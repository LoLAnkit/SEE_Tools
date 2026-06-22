/**
 * architecture.test.ts — Architecture gate checks.
 *
 * Validates Requirements 1.3, 1.2, 21.1:
 *   - No .astro file imports from src/lib/ (calculator logic must not live in
 *     the static shell).
 *   - index.astro contains exactly one `client:load` directive (only one
 *     hydrated island).
 *   - The one hydrated component is CalculatorIsland.
 *
 * Uses Node.js fs/path — run in the "node" environment via the vitest
 * environment docblock below.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, extname, relative } from "path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SRC_ROOT = resolve(__dirname, "..", "..") + "/src";

/** Recursively collect all files with the given extension under a directory. */
function collectFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full, ext));
    } else if (extname(entry) === ext) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Requirement 1.3: .astro files must not import from src/lib/
// "THE Astro_Shell SHALL contain no calculator logic and no calculator state
//  within .astro files."
// ---------------------------------------------------------------------------

describe("Requirement 1.3 — .astro files contain no calculator logic imports", () => {
  const astroFiles = collectFiles(SRC_ROOT, ".astro");

  it("finds at least one .astro file in src/", () => {
    expect(astroFiles.length).toBeGreaterThan(0);
  });

  it("no .astro file imports from src/lib/", () => {
    const violations: { file: string; line: string }[] = [];

    for (const filePath of astroFiles) {
      const content = readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      for (const line of lines) {
        // Match any import statement that resolves to src/lib/ — e.g.
        //   import ... from "../../lib/..."
        //   import ... from "../lib/..."
        //   import ... from "@/lib/..."
        if (/from\s+['"]([^'"]*\/lib\/|@\/lib\/)/.test(line)) {
          violations.push({
            file: relative(SRC_ROOT, filePath),
            line: line.trim(),
          });
        }
      }
    }

    if (violations.length > 0) {
      const detail = violations
        .map((v) => `  ${v.file}: ${v.line}`)
        .join("\n");
      throw new Error(
        `${violations.length} .astro file(s) import calculator logic from src/lib/:\n${detail}`
      );
    }

    expect(violations.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Requirement 21.1 / 1.2: index.astro must have exactly ONE client:load
// "THE application SHALL be built as a static, ad-free Astro site that ships
//  only the React island required for interactivity."
// ---------------------------------------------------------------------------

describe("Requirement 21.1 / 1.2 — index.astro has exactly one client:load island", () => {
  const indexPath = resolve(SRC_ROOT, "pages", "index.astro");
  const indexContent = readFileSync(indexPath, "utf8");

  it("index.astro exists and is non-empty", () => {
    expect(indexContent.length).toBeGreaterThan(0);
  });

  it("contains exactly one client:load directive", () => {
    // Count only non-comment lines (strip the frontmatter --- block comments
    // and inline HTML comments) to avoid false positives from JSDoc text.
    const nonCommentLines = indexContent
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        // Skip JS/TS comment lines (// ...) inside frontmatter
        return !trimmed.startsWith("//") && !trimmed.startsWith("*");
      });
    const matches = nonCommentLines.join("\n").match(/client:load/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // Requirement 21.1: The single hydrated component must be CalculatorIsland
  // ---------------------------------------------------------------------------

  it("the single client:load tag references CalculatorIsland", () => {
    // Find lines with client:load that are not inside comments
    const lines = indexContent.split("\n");
    const hydratedLines = lines.filter((l) => {
      const trimmed = l.trim();
      return (
        l.includes("client:load") &&
        !trimmed.startsWith("//") &&
        !trimmed.startsWith("*")
      );
    });

    expect(hydratedLines).toHaveLength(1);
    expect(hydratedLines[0]).toMatch(/CalculatorIsland/);
  });
});
