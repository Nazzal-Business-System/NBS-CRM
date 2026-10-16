import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import test from "node:test";
import { apiDirectory, loadApiEnvironment } from "./load-env.js";

test("API and Prisma share deterministic precedence without changing the process environment", () => {
  const cache = resolve(apiDirectory, "../../.cache");
  mkdirSync(cache, { recursive: true });
  const fixture = mkdtempSync(resolve(cache, "env-loader-"));
  assert.ok(fixture.startsWith(cache + sep));
  const app = resolve(fixture, "apps/api");
  mkdirSync(app, { recursive: true });
  try {
    // Synthetic fixtures only; never read or copy the real environment files.
    writeFileSync(resolve(fixture, ".env"), "CRM_FIXTURE_ROOT=root\nCRM_FIXTURE_OVERRIDE=root\nCRM_FIXTURE_INJECTED=root\n");
    writeFileSync(resolve(app, ".env"), "CRM_FIXTURE_OVERRIDE=app\nCRM_FIXTURE_INJECTED=app\n");
    const target: NodeJS.ProcessEnv = { CRM_FIXTURE_INJECTED: "injected" };
    loadApiEnvironment(app, target);
    assert.equal(target.CRM_FIXTURE_ROOT, "root");
    assert.equal(target.CRM_FIXTURE_OVERRIDE, "app");
    assert.equal(target.CRM_FIXTURE_INJECTED, "injected");
    assert.equal(process.env.CRM_FIXTURE_ROOT, undefined);
    const empty: NodeJS.ProcessEnv = {};
    loadApiEnvironment(resolve(fixture, "missing/apps/api"), empty);
    assert.deepEqual(empty, {});
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
