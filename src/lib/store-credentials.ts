import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";

const shopifyCredentialsSchema = z.object({
  provider: z.literal("SHOPIFY"),
  shopDomain: z.string().min(1),
  storeName: z.string().min(1),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresAt: z.number().int().positive(),
  refreshTokenExpiresAt: z.number().int().positive(),
  scopes: z.array(z.string()),
});

const wooCommerceCredentialsSchema = z.object({
  provider: z.literal("WOOCOMMERCE"),
  storeUrl: z.string().url(),
  storeName: z.string().min(1),
  consumerKey: z.string().min(1),
  consumerSecret: z.string().min(1),
});

export const storeCredentialsSchema = z.discriminatedUnion("provider", [
  shopifyCredentialsSchema,
  wooCommerceCredentialsSchema,
]);

export type StoreCredentials = z.infer<typeof storeCredentialsSchema>;

function getEncryptionKey() {
  const encodedKey = process.env.STORE_CREDENTIALS_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error("STORE_CREDENTIALS_ENCRYPTION_KEY is not configured.");

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("STORE_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}

export function encryptStoreCredentials(credentials: StoreCredentials) {
  const validated = storeCredentialsSchema.parse(credentials);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(validated), "utf8"),
    cipher.final(),
  ]);

  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptStoreCredentials(encryptedValue: string): StoreCredentials {
  const [version, encodedIv, encodedTag, encodedCiphertext, extra] = encryptedValue.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext || extra) {
    throw new Error("Stored store credentials have an unsupported format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");

  return storeCredentialsSchema.parse(JSON.parse(plaintext));
}

export function isStoreCredentialsEncryptionConfigured() {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}