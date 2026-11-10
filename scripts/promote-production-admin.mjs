import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg;

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const requestedResortId = process.env.RESORT_ID?.trim();
const roleName = process.env.ADMIN_ROLE_NAME?.trim() || "Administrator";

if (!email) {
  throw new Error(
    "ADMIN_EMAIL is required. Create the account through /auth/sign-up first, then run this command again.",
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query("BEGIN");

  const appUserResult = await client.query(
    `SELECT "authUserId", email, "displayName"
       FROM "app_user"
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      FOR UPDATE`,
    [email],
  );

  const appUser = appUserResult.rows[0];

  if (!appUser) {
    throw new Error(
      `No app account exists for ${email}. First register this email at /auth/sign-up on the production site.`,
    );
  }

  const resortResult = await client.query(
    requestedResortId
      ? `SELECT id, "resortName"
           FROM "resort_profile"
          WHERE id = $1
          LIMIT 1
          FOR UPDATE`
      : `SELECT id, "resortName"
           FROM "resort_profile"
          ORDER BY
            CASE WHEN LOWER(COALESCE("resortName", '')) LIKE '%alrio%' THEN 0 ELSE 1 END,
            "createdAt" ASC
          LIMIT 1
          FOR UPDATE`,
    requestedResortId ? [requestedResortId] : [],
  );

  let resort = resortResult.rows[0];

  if (!resort) {
    if (requestedResortId) {
      throw new Error(`No resort profile was found with RESORT_ID=${requestedResortId}.`);
    }

    resort = {
      id: randomUUID(),
      resortName: "Alrio Private Resort",
    };

    await client.query(
      `INSERT INTO "resort_profile" (
        id, "appUserId", "resortName", "propertyType", "shortDescription", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [
        resort.id,
        appUser.authUserId,
        resort.resortName,
        "Private resort",
        "A private resort for family getaways, celebrations, and restful stays.",
      ],
    );
    console.log("Created the Alrio Private Resort profile.");
  }

  const existingStaffResult = await client.query(
    `SELECT id, "resortProfileId"
       FROM "resort_staff_profile"
      WHERE "appUserId" = $1
      LIMIT 1
      FOR UPDATE`,
    [appUser.authUserId],
  );
  const existingStaff = existingStaffResult.rows[0];

  if (existingStaff && existingStaff.resortProfileId !== resort.id) {
    throw new Error(
      "This account is already assigned to a different resort and cannot be promoted here automatically.",
    );
  }

  const roleResult = await client.query(
    `SELECT id
       FROM "resort_access_role"
      WHERE "resortProfileId" = $1 AND name = $2
      LIMIT 1
      FOR UPDATE`,
    [resort.id, roleName],
  );

  let roleId = roleResult.rows[0]?.id;
  const roleDescription =
    "Full administrative access for operating Alrio Private Resort, including staff, reservations, finance, and settings.";

  if (roleId) {
    await client.query(
      `UPDATE "resort_access_role"
          SET description = $2,
              permissions = ARRAY['*']::text[],
              "updatedAt" = NOW()
        WHERE id = $1`,
      [roleId, roleDescription],
    );
  } else {
    roleId = randomUUID();
    await client.query(
      `INSERT INTO "resort_access_role" (
        id, "resortProfileId", name, description, permissions, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, ARRAY['*']::text[], NOW(), NOW())`,
      [roleId, resort.id, roleName, roleDescription],
    );
  }

  let staffProfileId = existingStaff?.id;

  if (staffProfileId) {
    await client.query(
      `UPDATE "resort_staff_profile"
          SET "accessRoleId" = $2,
              status = 'ACTIVE',
              "updatedAt" = NOW()
        WHERE id = $1`,
      [staffProfileId, roleId],
    );
  } else {
    staffProfileId = randomUUID();
    await client.query(
      `INSERT INTO "resort_staff_profile" (
        id, "resortProfileId", "appUserId", "accessRoleId", status, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW())`,
      [staffProfileId, resort.id, appUser.authUserId, roleId],
    );
  }

  await client.query(
    `INSERT INTO "resort_staff_activity_log" (
      id, "resortProfileId", "staffProfileId", "actorAuthUserId", action, title, detail, "createdAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      randomUUID(),
      resort.id,
      staffProfileId,
      appUser.authUserId,
      "staff.admin.promoted",
      "Administrator access enabled",
      "Granted full Alrio Private Resort administrative access through the production bootstrap command.",
    ],
  );

  await client.query("COMMIT");
  console.log(`Administrator access is active for ${appUser.email}.`);
  console.log(`Resort: ${resort.resortName || resort.id}`);
  console.log(`Role: ${roleName} (full permissions)`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
