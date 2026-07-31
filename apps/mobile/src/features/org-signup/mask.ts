// AuthInput (packages/ui/src/auth/AuthInput.tsx, Task 15) has no `mask` prop
// like the cream FormField (packages/ui/src/molecules/FormField.tsx, Task 6)
// does — this feature-local helper replicates FormField's exact mask logic
// (digit-stripping + phone display formatting) so the org signup wizard gets
// the identical typed-value behavior on the dark-forest AuthInput: the value
// stored in wizard state is always digits-only (matching orgSignupSchema's
// `usPhone`/`usZip` regexes), while the phone field still displays formatted
// as "(555) 019-2345" once 10 digits are entered.
export type Mask = "phone" | "zip";

const DIGITS_ONLY: Record<Mask, number> = { phone: 10, zip: 9 };

export function applyMask(raw: string, mask: Mask): string {
  return raw.replace(/\D/g, "").slice(0, DIGITS_ONLY[mask]);
}

export function displayMask(value: string, mask: Mask): string {
  if (mask !== "phone" || value.length !== 10) return value;
  return `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
}
