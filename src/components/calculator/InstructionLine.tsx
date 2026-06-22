/**
 * InstructionLine.tsx — zero-state guidance text rendered above the subject
 * table (Requirement 11.4).
 *
 * Displays a tab-contextual brief instruction so first-time visitors know how
 * to begin without facing a blank screen. The text adapts to the active tab so
 * the hint is always relevant. Uses aria-live="polite" so assistive technologies
 * announce the text when it changes (Requirement 20.2, 11.4, 11.5).
 */

import React, { useContext } from "react";
import { CalculatorContext } from "./CalculatorContext";

// ---------------------------------------------------------------------------
// Per-tab hint text
// ---------------------------------------------------------------------------

const HINTS: Record<string, string> = {
  grade: "Select a theory grade for each subject to compute your GPA.",
  marks: "Enter theory and practical marks for each subject to compute your GPA.",
  plan: "Enter a target GPA and press Plan to get a suggested set of grades.",
  eligibility:
    "Select your grades for the five required subjects and enter your GPA to check +2 stream eligibility.",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InstructionLine() {
  const { state } = useContext(CalculatorContext);
  const hint = HINTS[state.activeTab] ?? HINTS.grade;

  return (
    <p
      className="text-sm text-mute"
      aria-live="polite"
    >
      {hint}
    </p>
  );
}
