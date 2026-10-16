import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// src/ in development and dist/ in production are both one level below apps/api.
export const apiDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function loadApiEnvironment(
  directory = apiDirectory,
  target: NodeJS.ProcessEnv = process.env,
): void {
  // Injected environment wins, followed by app-local settings, then workspace fallback.
  for (const path of [resolve(directory, ".env"), resolve(directory, "../../.env")]) {
    const result = config({ path, processEnv: target, override: false, quiet: true });
    if (result.error && (result.error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new Error("Unable to load API environment configuration.");
    }
  }
}
