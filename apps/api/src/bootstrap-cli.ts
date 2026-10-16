import { bootstrapAdmin } from "./bootstrap.js";
import { getDb, closeDb } from "./db.js";
// Deliberately not called by server startup, install, seed, build, or migration.
async function main() {
  if (process.env.BOOTSTRAP_ADMIN !== "1" || process.stdin.isTTY) throw new Error("Bootstrap requires explicit opt-in and protected stdin.");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    const bytes = Buffer.from(chunk); size += bytes.length;
    if (size > 8192) throw new Error("Bootstrap input too large.");
    chunks.push(bytes);
  }
  const payload: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  // getDb is lazy; the first actual connection is the explicitly opted-in transaction.
  await bootstrapAdmin(getDb(), payload, true);
  console.info("Initial administrator created. Remove the bootstrap opt-in.");
}
main().catch(() => { console.error("Bootstrap refused or failed. No credentials or connection details are logged."); process.exitCode = 1; }).finally(async () => {
  try { await closeDb(); } catch { console.error("Bootstrap cleanup failed."); process.exitCode = 1; }
});
