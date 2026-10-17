"use client";

/** Compact on/off for guest-menu availability (86). Works for both ON and OFF. */
export function MenuAvailabilityToggle({
  checked,
  disabled,
  onChange,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  "aria-label"?: string;
}) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel ?? (checked ? "Available on guest menu" : "86'd — turn on to restore")}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="h-4 w-8 rounded-full bg-surface-container-highest after:absolute after:left-[2px] after:top-[2px] after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-disabled:opacity-40" />
    </label>
  );
}
