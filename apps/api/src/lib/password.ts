import crypto from "node:crypto";

const SALT_LEN = 16;
const ITERATIONS = 100000;
const KEY_LEN = 64;
const DIGEST = "sha256";

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(SALT_LEN).toString("hex");
  const hash = crypto.pbkdf2Sync(plain, salt, ITERATIONS, KEY_LEN, DIGEST).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = crypto.pbkdf2Sync(plain, saltHex, ITERATIONS, KEY_LEN, DIGEST).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hashHex, "hex"), Buffer.from(hash, "hex"));
}
