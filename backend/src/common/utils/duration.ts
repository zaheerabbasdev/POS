const UNIT_MS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Parses simple durations like "1d", "15m", "3600" (seconds) into milliseconds. */
export function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])?$/.exec(value.trim());
  if (!match || !match[1]) {
    throw new Error(`Invalid duration format: "${value}". Expected e.g. "1d", "15m", or a number of seconds.`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  return unit ? amount * UNIT_MS[unit]! : amount * 1000;
}
