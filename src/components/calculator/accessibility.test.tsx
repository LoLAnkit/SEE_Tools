/**
 * accessibility.test.tsx — Axe accessibility smoke tests (Requirement 20.1).
 *
 * Tests WCAG 2.1 AA conformance for the interactive calculator island
 * components using axe-core via vitest-axe.
 *
 * Strategy: render individual island sub-components (GradeSelect, TabNav,
 * InstructionLine) in isolation with the required React context rather than
 * the full CalculatorIsland (which would need a full DOM + Astro shell). This
 * validates accessibility of the actual interactive widgets users encounter.
 *
 * The `toHaveNoViolations` matcher is registered globally in vitest.setup.ts.
 *
 * Validates: Requirement 20.1 (WCAG 2.1 Level AA for the interactive
 * calculator interface).
 *
 * @vitest-environment jsdom
 */

/// <reference types="vitest-axe/matchers" />

import React, { useReducer } from "react";
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { axe } from "vitest-axe";
import { CalculatorContext } from "./CalculatorContext";
import { calculatorReducer, initialState } from "./reducer";
import GradeSelect from "./GradeSelect";
import TabNav from "./TabNav";
import InstructionLine from "./InstructionLine";

// ---------------------------------------------------------------------------
// Helper — wraps a component in the CalculatorContext with initial state.
// ---------------------------------------------------------------------------

function WithCalculatorContext({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  return (
    <CalculatorContext.Provider value={{ state, dispatch }}>
      {children}
    </CalculatorContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// axe options — restrict to WCAG 2.1 AA rules only.
// ---------------------------------------------------------------------------

const AXE_OPTIONS = {
  runOnly: {
    type: "tag" as const,
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  },
};

// ---------------------------------------------------------------------------
// GradeSelect — accessible grade dropdown (Requirements 9.1, 20.2, 20.3)
// ---------------------------------------------------------------------------

describe("Accessibility — GradeSelect", () => {
  it("has no WCAG 2.1 AA violations when unselected (blank placeholder)", async () => {
    const { container } = render(
      // Wrap in a form so the select has valid landmark context
      <form aria-label="Grade selection form">
        <label htmlFor="theory-grade">Theory Grade</label>
        <GradeSelect
          id="theory-grade"
          value=""
          onChange={() => {}}
          label="Theory Grade"
        />
      </form>
    );

    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("has no WCAG 2.1 AA violations when a grade is selected", async () => {
    const { container } = render(
      <form aria-label="Grade selection form">
        <label htmlFor="theory-grade-selected">Theory Grade</label>
        <GradeSelect
          id="theory-grade-selected"
          value="A+"
          onChange={() => {}}
          label="Theory Grade"
        />
      </form>
    );

    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("has no WCAG 2.1 AA violations when disabled", async () => {
    const { container } = render(
      <form aria-label="Grade selection form">
        <label htmlFor="theory-grade-disabled">Practical Grade</label>
        <GradeSelect
          id="theory-grade-disabled"
          value="B"
          onChange={() => {}}
          label="Practical Grade"
          disabled
        />
      </form>
    );

    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// TabNav — ARIA tablist with roving focus (Requirements 3.1, 20.2)
// ---------------------------------------------------------------------------

describe("Accessibility — TabNav", () => {
  it("has no WCAG 2.1 AA violations in initial state (grade tab active)", async () => {
    const { container } = render(
      <WithCalculatorContext>
        <TabNav />
      </WithCalculatorContext>
    );

    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// InstructionLine — aria-live guidance text (Requirements 11.4, 20.2)
// ---------------------------------------------------------------------------

describe("Accessibility — InstructionLine", () => {
  it("has no WCAG 2.1 AA violations in grade tab context", async () => {
    const { container } = render(
      <WithCalculatorContext>
        <InstructionLine />
      </WithCalculatorContext>
    );

    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// Calculator island chrome — tablist + tabpanels + instruction (Req 20.1)
// ---------------------------------------------------------------------------

describe("Accessibility — Calculator island tab chrome", () => {
  it("TabNav + tabpanels + InstructionLine together have no WCAG 2.1 AA violations", async () => {
    const { container } = render(
      <WithCalculatorContext>
        <div>
          {/* TabNav declares aria-controls pointing to these panel IDs */}
          <TabNav />
          <div
            role="tabpanel"
            id="tabpanel-grade"
            aria-labelledby="tab-grade"
          >
            <InstructionLine />
          </div>
          <div
            role="tabpanel"
            id="tabpanel-marks"
            aria-labelledby="tab-marks"
            hidden
          />
          <div
            role="tabpanel"
            id="tabpanel-plan"
            aria-labelledby="tab-plan"
            hidden
          />
          <div
            role="tabpanel"
            id="tabpanel-eligibility"
            aria-labelledby="tab-eligibility"
            hidden
          />
        </div>
      </WithCalculatorContext>
    );

    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });
});
