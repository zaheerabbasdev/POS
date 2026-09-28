/** Rounds to 2 decimal places (cents), avoiding float drift like 0.1 + 0.2. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Amounts within half a cent of each other are treated as equal. */
export const MONEY_EPSILON = 0.005;
