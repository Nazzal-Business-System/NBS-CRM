import { AppError } from "../errors.js";
import { hashToken } from "./sessions.js";
// Single-process bounded limiter. Proxy trust stays disabled; configure a shared
// trusted-edge limiter before horizontal scaling, never blindly trust X-Forwarded-For.
export function loginLimiter(clock = Date.now) {
  const buckets = new Map<string, { count: number; until: number }>();
  let hashing = 0;
  return {
    attempt(ip: string, email: string) {
      const now = clock();
      for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key);
      if (buckets.size >= 10000) throw new AppError(429, "RATE_LIMITED", "Please try again later.");
      for (const [key, limit] of [[`ip:${ip}`, 10], [`account:${hashToken(email)}`, 20]] as const) {
        const entry = buckets.get(key) ?? { count: 0, until: now + 15 * 60_000 };
        entry.count++; buckets.set(key, entry);
        if (entry.count > limit) throw new AppError(429, "RATE_LIMITED", "Please try again later.");
      }
    },
    async hash<T>(work: () => Promise<T>): Promise<T> {
      if (hashing >= 2) throw new AppError(429, "RATE_LIMITED", "Please try again later.");
      hashing++;
      try { return await work(); } finally { hashing--; }
    },
  };
}
