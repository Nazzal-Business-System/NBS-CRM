import { loadApiEnvironment } from "./load-env.js";
import { z } from "zod";
loadApiEnvironment();
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.url().refine(value => /^https?:/.test(value) && new URL(value).origin === value).default("http://localhost:3000"),
  DATABASE_URL: z.url().refine(value => /^postgres(?:ql)?:/.test(value)).optional(),
  AUTH_ENABLED: z.enum(["true", "false"]).default("false").transform(value => value === "true"),
  SESSION_IDLE_MINUTES: z.coerce.number().int().min(5).max(1440).default(30),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().int().min(1).max(720).default(12),
}).superRefine((value, ctx) => {
  if (value.AUTH_ENABLED && !value.DATABASE_URL) ctx.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "Required for authentication." });
  if (value.SESSION_IDLE_MINUTES > value.SESSION_ABSOLUTE_HOURS * 60) ctx.addIssue({ code: "custom", path: ["SESSION_IDLE_MINUTES"], message: "Idle expiry must precede absolute expiry." });
  if (value.NODE_ENV === "production" && value.AUTH_ENABLED && !value.WEB_ORIGIN.startsWith("https://")) ctx.addIssue({ code: "custom", path: ["WEB_ORIGIN"], message: "HTTPS required." });
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(`Invalid API environment fields: ${parsed.error.issues.map(issue => issue.path.join(".")).join(", ")}`);
export const env = parsed.data;
