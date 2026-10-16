import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const cost = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, cost, (error, key) => error ? reject(error) : resolve(key)));
}
export function validPassword(password: string): boolean {
  return password.length >= 12 && Buffer.byteLength(password, "utf8") <= 1024;
}
export async function hashPassword(password: string): Promise<string> {
  if (!validPassword(password)) throw new Error("Password must have at least 12 characters and at most 1024 UTF-8 bytes.");
  const salt = randomBytes(16);
  return `scrypt$${cost.N}$8$1$${salt.toString("hex")}$${(await derive(password, salt)).toString("hex")}`;
}
// A fixed, non-credential verifier gives unknown-user attempts the same expensive work.
const dummy = `scrypt$131072$8$1$${"00".repeat(16)}$${"00".repeat(64)}`;
export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  const fields = (encoded ?? dummy).split("$");
  if (Buffer.byteLength(password, "utf8") > 1024 || fields.length !== 6 || fields[0] !== "scrypt" || fields[1] !== "131072" || fields[2] !== "8" || fields[3] !== "1" || !/^[a-f0-9]{32}$/.test(fields[4] ?? "") || !/^[a-f0-9]{128}$/.test(fields[5] ?? "")) return false;
  const actual = await derive(password, Buffer.from(fields[4]!, "hex"));
  return timingSafeEqual(actual, Buffer.from(fields[5]!, "hex")) && encoded !== null;
}
