const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCents(cents: number): string {
  return USD.format(cents / 100);
}

export function parseDollars(input: string): number {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "" || !/^-?\d*\.?\d*$/.test(cleaned)) {
    throw new RangeError(`Not a valid dollar amount: "${input}"`);
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value)) throw new RangeError(`Not a valid dollar amount: "${input}"`);
  return Math.round(value * 100);
}

export function sumCents(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}
