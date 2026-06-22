/**
 * MarksInput.tsx — Accessible marks input with clamping and inline errors.
 *
 * Renders a numeric input bounded by [0, max]. On blur, values outside the
 * valid range are clamped and an inline error message is displayed
 * (Requirements 10.1, 10.2, 13.6). The live derived grade is shown alongside
 * the input as a read-only badge.
 */

import React, { useState, useEffect } from "react";
import { gradeComponentFromMarks } from "../../lib/calc";
import type { SplitType } from "../../config/gradingScale";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MarksInputProps {
  value: number | null;
  onChange: (marks: number | null) => void;
  max: number;
  splitType: SplitType;
  isTheory: boolean;
  id?: string;
  label?: string;
  disabled?: boolean;
  errorKey?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarksInput({
  value,
  onChange,
  max,
  splitType,
  isTheory,
  id,
  label,
  disabled = false,
}: MarksInputProps) {
  // Local raw string state so the user can type freely before blur
  const [raw, setRaw] = useState<string>(value !== null ? String(value) : "");
  const [error, setError] = useState<string | null>(null);

  // Sync raw display when value changes from outside (e.g. plan solver fills)
  useEffect(() => {
    setRaw(value !== null ? String(value) : "");
    setError(null);
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRaw(e.target.value);
    // Live-update for valid numbers so derived grade updates immediately
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      // Don't clamp on change — just report the raw value until blur
      onChange(parsed);
    } else if (e.target.value === "") {
      onChange(null);
    }
  }

  function handleBlur() {
    const trimmed = raw.trim();
    if (trimmed === "") {
      setError(null);
      onChange(null);
      return;
    }
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed)) {
      setError(`Enter a number between 0 and ${max}.`);
      setRaw(value !== null ? String(value) : "");
      return;
    }
    if (parsed < 0 || parsed > max) {
      const clamped = Math.min(max, Math.max(0, parsed));
      setError(`Clamped to valid range (0–${max}).`);
      setRaw(String(clamped));
      onChange(clamped);
    } else {
      setError(null);
      setRaw(String(parsed));
      onChange(parsed);
    }
  }

  // Derive the live grade badge
  const derivedResult =
    value !== null
      ? gradeComponentFromMarks(value, max, splitType, isTheory)
      : null;

  const isFailing = derivedResult?.isFailing ?? false;
  const derivedGrade = derivedResult?.grade ?? "--";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          aria-label={label}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error && id ? `${id}-error` : undefined}
          className={[
            "w-16 rounded-sm border px-2 py-1 text-sm font-medium",
            "bg-canvas text-ink",
            "focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand",
            "transition-colors duration-150",
            disabled ? "opacity-50 cursor-not-allowed" : "",
            error ? "border-error" : "border-hairline hover:border-hairline-strong",
          ]
            .filter(Boolean)
            .join(" ")}
        />
        {/* Live derived grade badge */}
        <span
          className={[
            "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold",
            isFailing
              ? "bg-error-soft text-error border border-error"
              : "bg-canvas-soft-2 text-body border border-hairline",
          ].join(" ")}
          aria-label={`Derived grade: ${derivedGrade}`}
        >
          {derivedGrade}
        </span>
      </div>
      {/* Inline error */}
      {error && (
        <p
          id={id ? `${id}-error` : undefined}
          role="alert"
          className="text-xs text-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default MarksInput;
