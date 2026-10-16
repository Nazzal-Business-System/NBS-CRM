import { createApp } from "./app.js";
import { env } from "./env.js";
import { closeDb } from "./db.js";
const server = createApp().listen(env.PORT, env.HOST, () => console.info(`CRM API listening on port ${env.PORT}`));
server.on("error", () => { console.error("API startup failed."); process.exit(1); });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => {
  server.close(() => { void closeDb().finally(() => process.exit(0)); });
  setTimeout(() => process.exit(1), 10_000).unref();
});
