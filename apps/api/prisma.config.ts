import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";
import { loadApiEnvironment } from "./src/load-env.js";
const directory = dirname(fileURLToPath(import.meta.url));
loadApiEnvironment(directory);
// This local fallback allows offline validation without a configured database.
export default defineConfig({
  schema: resolve(directory, "prisma/schema.prisma"),
  migrations: { path: resolve(directory, "prisma/migrations") },
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://example_user:example_password@127.0.0.1:5432/example_crm" },
});
