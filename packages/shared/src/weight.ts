const GRAMS_PER_LB = 453.59237;

export function gramsToLbs(grams: number): number {
  return Math.round((grams / GRAMS_PER_LB) * 10) / 10;
}

export function lbsToGrams(lbs: number): number {
  return Math.round(lbs * GRAMS_PER_LB);
}

export function formatWeight(grams: number): string {
  return `${gramsToLbs(grams).toFixed(1)} lbs`;
}
