import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  RUNTIME_SETTING_DEFINITIONS,
  type RuntimeSettingKey,
} from "@/lib/runtime-settings-definitions";

export {
  BOOTSTRAP_ENVIRONMENT_SETTINGS,
  RUNTIME_SETTING_DEFINITIONS,
  type RuntimeSettingDefinition,
  type RuntimeSettingKey,
} from "@/lib/runtime-settings-definitions";

const definitionsByKey = new Map(RUNTIME_SETTING_DEFINITIONS.map((definition) => [definition.key, definition]));

function encryptionKey() {
  const material = process.env.CONFIG_ENCRYPTION_KEY ?? process.env.BETTER_AUTH_SECRET;
  if (!material) throw new Error("CONFIG_ENCRYPTION_KEY or BETTER_AUTH_SECRET is required to encrypt developer settings.");
  return createHash("sha256").update(material).digest();
}

function encrypt(value: string) {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), initializationVector);
  const encryptedValue = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    encryptedValue: encryptedValue.toString("base64"),
    initializationVector: initializationVector.toString("base64"),
    authenticationTag: cipher.getAuthTag().toString("base64"),
  };
}

function decrypt(input: { encryptedValue: string; initializationVector: string; authenticationTag: string }) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(input.initializationVector, "base64"));
  decipher.setAuthTag(Buffer.from(input.authenticationTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(input.encryptedValue, "base64")), decipher.final()]).toString("utf8");
}

export function isRuntimeSettingKey(value: string): value is RuntimeSettingKey {
  return definitionsByKey.has(value as RuntimeSettingKey);
}

export async function getRuntimeSetting(resortProfileId: string, key: RuntimeSettingKey) {
  const definition = definitionsByKey.get(key);
  if (!definition) return undefined;
  const saved = await prisma.resortDeveloperSetting.findUnique({
    where: { resortProfileId_key: { resortProfileId, key } },
  });
  if (saved) return decrypt(saved);
  return process.env[definition.fallbackEnv];
}

export async function getDefaultResortProfileId() {
  const profile = await prisma.resortProfile.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });
  return profile?.id ?? null;
}

export async function getRuntimeSettingForDefaultResort(key: RuntimeSettingKey) {
  const resortProfileId = await getDefaultResortProfileId();
  return resortProfileId ? getRuntimeSetting(resortProfileId, key) : process.env[definitionsByKey.get(key)?.fallbackEnv ?? key];
}

export async function saveRuntimeSetting(input: { resortProfileId: string; key: RuntimeSettingKey; value: string; updatedByAuthUserId: string }) {
  const encrypted = encrypt(input.value);
  await prisma.resortDeveloperSetting.upsert({
    where: { resortProfileId_key: { resortProfileId: input.resortProfileId, key: input.key } },
    create: { resortProfileId: input.resortProfileId, key: input.key, updatedByAuthUserId: input.updatedByAuthUserId, ...encrypted },
    update: { updatedByAuthUserId: input.updatedByAuthUserId, ...encrypted },
  });
}

export async function clearRuntimeSetting(resortProfileId: string, key: RuntimeSettingKey) {
  await prisma.resortDeveloperSetting.deleteMany({ where: { resortProfileId, key } });
}
