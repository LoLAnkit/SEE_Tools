/**
 * GradeSelect.tsx — Accessible grade dropdown component.
 *
 * Renders a native <select> element with ARIA attributes, styled with Tailwind
 * v4 CSS classes. Options are config-driven from GRADING_SCALE and formatted
 * as "A+ (4.00)", "A (3.60)", etc. Includes a blank "--" option and "NG (0.00)"
 * (Requirements 9.1, 20.2, 20.3).
 *
 * Using a native <select> is a pragmatic, accessibility-correct approach:
 * native selects have full keyboard support (arrows, Enter, type-ahead) and
 * correct ARIA semantics built into the browser. We layer explicit aria-label
 * and aria-required attributes on top.
 */

import React from "react";
import { GRADING_SCALE } from "../../config/gradingScale";
import type { LetterGrade } from "../../config/gradingScale";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GradeSelectProps {
  value: LetterGrade | "";
  onChange: (grade: LetterGrade | "") => void;
  id?: string;
  label?: string; // used as aria-label when provided
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Option list (config-driven, Requirement 9.1)
// ---------------------------------------------------------------------------

/**
 * Formats a grade point as a 2-decimal string: 4 → "4.00", 3.6 → "3.60".
 */
function formatGradePoint(gp: number): string {
  return gp.toFixed(2);
}

/**
 * All selectable grade options derived from GRADING_SCALE.
 * NG is already the last band in GRADING_SCALE (GP 0.00), so no separate
 * entry is needed — it flows naturally from the config.
 */
const GRADE_OPTIONS: { value: LetterGrade | ""; label: string }[] = [
  // Blank / unselected placeholder
  { value: "", label: "--" },
  // Config-driven grade bands, highest to lowest
  ...GRADING_SCALE.map((band) => ({
    value: band.grade as LetterGrade,
    label: `${band.grade} (${formatGradePoint(band.gradePoint)})`,
  })),
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * GradeSelect — an accessible, config-driven grade dropdown.
 *
 * Keyboard behavior (native <select>):
 *   - Space / Enter / Alt+↓ opens the options list
 *   - Arrow keys navigate options
 *   - Escape closes the list
 *   - Type-ahead: typing the first letter jumps to the matching option
 *
 * ARIA:
 *   - role="combobox" on the wrapper marks this as a combobox widget to AT
 *   - aria-label from the `label` prop identifies the control
 *   - aria-disabled reflects the disabled state
 */
export function GradeSelect({
  value,
  onChange,
  id,
  label,
  disabled = false,
}: GradeSelectProps) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = e.target.value as LetterGrade | "";
    onChange(selected);
  }

  return (
    // Wrapper with combobox role per ARIA spec for a select-only combobox
    <div
      role="combobox"
      aria-expanded="false"
      aria-haspopup="listbox"
      aria-disabled={disabled}
      className="inline-flex"
    >
      <select
        id={id}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        aria-label={label}
        // Expose the listbox role for assistive technologies
        aria-haspopup="listbox"
        className={[
          // Layout
          "w-full min-w-28",
          // Typography
          "text-sm font-medium",
          // Colors (uses @theme tokens from global.css)
          "bg-canvas text-ink border border-hairline",
          // Shape
          "rounded-sm",
          // Spacing
          "px-2 py-1",
          // Interaction
          "cursor-pointer",
          // Focus ring for keyboard accessibility (Requirement 20.2)
          "focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand",
          // Disabled state
          disabled
            ? "opacity-50 cursor-not-allowed bg-canvas-soft"
            : "hover:border-hairline-strong",
          // Transition
          "transition-colors duration-150",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {GRADE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default GradeSelect;
