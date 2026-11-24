// AES-256-GCM encryption for identity reference images at rest. The storage
// path is bound as additional authenticated data, so an object copied to
// another intern's path fails to decrypt.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = 1;

export function encryptReference(key: Buffer, path: string, plaintext: Uint8Array): Uint8Array {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(path, "utf8"));
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), body]);
}

export function decryptReference(key: Buffer, path: string, sealed: Uint8Array): Uint8Array {
  const data = Buffer.from(sealed);
  if (data.length < 30 || data[0] !== VERSION) throw new Error("Unsupported identity reference format.");
  const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(1, 13));
  decipher.setAAD(Buffer.from(path, "utf8"));
  decipher.setAuthTag(data.subarray(13, 29));
  return Buffer.concat([decipher.update(data.subarray(29)), decipher.final()]);
}
