-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccessScope" AS ENUM ('OWN', 'TEAM', 'ALL');

-- CreateTable
CREATE TABLE "people" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(254),
    "phone" VARCHAR(40),
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" VARCHAR(512) NOT NULL,
    "roleId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "securityVersion" INTEGER NOT NULL DEFAULT 1,
    "locale" VARCHAR(5) NOT NULL DEFAULT 'en',
    "timezone" VARCHAR(64),
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "key" VARCHAR(100) NOT NULL,
    "description" VARCHAR(250) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" UUID NOT NULL,
    "permissionKey" VARCHAR(100) NOT NULL,
    "scope" "AccessScope" NOT NULL DEFAULT 'OWN',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionKey")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "teamId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "isManager" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("teamId","userId")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "csrfHash" CHAR(64) NOT NULL,
    "securityVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idleExpiresAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "revocationReason" VARCHAR(80),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(100),
    "requestId" VARCHAR(100),
    "changes" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "minorUnits" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "workspace_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "defaultCurrencyCode" VARCHAR(3) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "locale" VARCHAR(5) NOT NULL DEFAULT 'en',
    "weekStartsOn" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workspace_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "people_name_idx" ON "people"("name");

-- CreateIndex
CREATE INDEX "people_email_idx" ON "people"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_personId_key" ON "users"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_roleId_isActive_idx" ON "users"("roleId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "role_permissions_permissionKey_idx" ON "role_permissions"("permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_revokedAt_idx" ON "sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "sessions_idleExpiresAt_idx" ON "sessions"("idleExpiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_id_idx" ON "audit_logs"("createdAt", "id");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx" ON "audit_logs"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "workspace_settings_defaultCurrencyCode_idx" ON "workspace_settings"("defaultCurrencyCode");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionKey_fkey" FOREIGN KEY ("permissionKey") REFERENCES "permissions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_defaultCurrencyCode_fkey" FOREIGN KEY ("defaultCurrencyCode") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reviewed PostgreSQL invariants not represented by Prisma 7's schema language.
ALTER TABLE "users" ADD CONSTRAINT "users_email_canonical" CHECK ("email" = lower(btrim("email")) AND length("email") > 3);
ALTER TABLE "users" ADD CONSTRAINT "users_security_version_positive" CHECK ("securityVersion" > 0);
ALTER TABLE "users" ADD CONSTRAINT "users_locale_supported" CHECK ("locale" IN ('en', 'ar'));
ALTER TABLE "people" ADD CONSTRAINT "people_name_nonempty" CHECK (length(btrim("name")) > 0);
ALTER TABLE "roles" ADD CONSTRAINT "roles_key_format" CHECK ("key" ~ '^[a-z][a-z0-9_-]{1,79}$');
ALTER TABLE "roles" ADD CONSTRAINT "roles_administrator_system" CHECK ("key" <> 'administrator' OR "isSystem");
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_hash_format" CHECK ("tokenHash" ~ '^[a-f0-9]{64}$' AND "csrfHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_expiry_order" CHECK ("createdAt" < "expiresAt" AND "lastSeenAt" >= "createdAt" AND "idleExpiresAt" > "lastSeenAt" AND "idleExpiresAt" <= "expiresAt" AND ("revokedAt" IS NULL OR "revokedAt" >= "createdAt"));
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_version_positive" CHECK ("securityVersion" > 0);
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_code_format" CHECK ("code" ~ '^[A-Z]{3}$');
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_minor_units_range" CHECK ("minorUnits" BETWEEN 0 AND 4);
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_singleton" CHECK ("id" = 1);
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_week_start" CHECK ("weekStartsOn" BETWEEN 0 AND 6);
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_locale_supported" CHECK ("locale" IN ('en', 'ar'));
CREATE INDEX "sessions_active_user_expiry" ON "sessions" ("userId", "expiresAt") WHERE "revokedAt" IS NULL;

CREATE FUNCTION "crm_reject_audit_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit records are append-only';
END;
$$;
CREATE TRIGGER "audit_append_only" BEFORE UPDATE OR DELETE ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION "crm_reject_audit_mutation"();
CREATE TRIGGER "audit_no_truncate" BEFORE TRUNCATE ON "audit_logs" FOR EACH STATEMENT EXECUTE FUNCTION "crm_reject_audit_mutation"();

CREATE FUNCTION "crm_protect_system_role"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."isSystem" OR (TG_OP = 'UPDATE' AND NEW."isSystem") THEN
    RAISE EXCEPTION 'System roles require an explicit migration';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "roles_protect_system" BEFORE UPDATE OR DELETE ON "roles" FOR EACH ROW EXECUTE FUNCTION "crm_protect_system_role"();

CREATE FUNCTION "crm_protect_system_grants"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_role uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN target_role := OLD."roleId"; ELSE target_role := NEW."roleId"; END IF;
  IF EXISTS (SELECT 1 FROM "users") AND (
    EXISTS (SELECT 1 FROM "roles" WHERE "id" = target_role AND "isSystem") OR
    (TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM "roles" WHERE "id" = OLD."roleId" AND "isSystem"))
  ) THEN RAISE EXCEPTION 'System grants require an explicit migration'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "role_permissions_protect_system" BEFORE INSERT OR UPDATE OR DELETE ON "role_permissions" FOR EACH ROW EXECUTE FUNCTION "crm_protect_system_grants"();

CREATE FUNCTION "crm_keep_active_administrator"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(1864005);
  IF OLD."isActive" AND EXISTS (SELECT 1 FROM "roles" WHERE "id" = OLD."roleId" AND "key" = 'administrator' AND "isSystem") THEN
    IF TG_OP = 'DELETE' OR NOT NEW."isActive" OR NEW."roleId" <> OLD."roleId" THEN
      IF NOT EXISTS (SELECT 1 FROM "users" u JOIN "roles" r ON r."id" = u."roleId" JOIN "people" p ON p."id" = u."personId" WHERE u."id" <> OLD."id" AND u."isActive" AND p."archivedAt" IS NULL AND r."key" = 'administrator' AND r."isSystem") THEN
        RAISE EXCEPTION 'The last active administrator must be retained';
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "users_keep_administrator" BEFORE UPDATE OR DELETE ON "users" FOR EACH ROW EXECUTE FUNCTION "crm_keep_active_administrator"();

CREATE FUNCTION "crm_validate_identity_settings"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'people' THEN
    PERFORM pg_advisory_xact_lock(1864005);
    IF NEW."archivedAt" IS NOT NULL AND EXISTS (SELECT 1 FROM "users" WHERE "personId" = NEW."id" AND "isActive") THEN
      RAISE EXCEPTION 'Deactivate access before archiving a person';
    END IF;
  ELSIF TG_TABLE_NAME = 'users' THEN
    PERFORM pg_advisory_xact_lock(1864005);
    IF NEW."isActive" AND EXISTS (SELECT 1 FROM "people" WHERE "id" = NEW."personId" AND "archivedAt" IS NOT NULL) THEN
      RAISE EXCEPTION 'Restore the person before activating access';
    END IF;
    IF NEW."timezone" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW."timezone") THEN
      RAISE EXCEPTION 'Unsupported timezone';
    END IF;
  ELSIF NEW."timezone" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW."timezone") THEN
    RAISE EXCEPTION 'Unsupported timezone';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "people_archive_guard" BEFORE UPDATE ON "people" FOR EACH ROW EXECUTE FUNCTION "crm_validate_identity_settings"();
CREATE TRIGGER "workspace_timezone_guard" BEFORE INSERT OR UPDATE ON "workspace_settings" FOR EACH ROW EXECUTE FUNCTION "crm_validate_identity_settings"();
CREATE TRIGGER "users_timezone_guard" BEFORE INSERT OR UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION "crm_validate_identity_settings"();
