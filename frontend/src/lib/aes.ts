export interface AesKeyHalves {
  key0: bigint;
  key1: bigint;
}

export interface EncryptedPrompt {
  iv: string;
  ciphertext: string;
}

function bigIntToBytesBE(value: bigint, length: number): Uint8Array {
  const hex = value.toString(16).padStart(length * 2, "0");
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBigIntBE(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  for (const byte of bytes) {
    result = (result << BigInt(8)) + BigInt(byte);
  }
  return result;
}

export async function generateAndSplitKey(): Promise<AesKeyHalves> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const rawKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", key)
  );
  const key0 = bytesToBigIntBE(rawKey.slice(0, 16));
  const key1 = bytesToBigIntBE(rawKey.slice(16, 32));
  return { key0, key1 };
}

export async function reconstructKey(k0: bigint, k1: bigint): Promise<CryptoKey> {
  const rawKey = new Uint8Array(32);
  rawKey.set(bigIntToBytesBE(k0, 16), 0);
  rawKey.set(bigIntToBytesBE(k1, 16), 16);
  return crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, [
    "decrypt",
  ]);
}

export async function encryptPrompt(key: CryptoKey, plaintext: string): Promise<EncryptedPrompt> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return {
    iv: Buffer.from(iv).toString("hex"),
    ciphertext: Buffer.from(encrypted).toString("hex"),
  };
}

export async function decryptPrompt(
  key: CryptoKey,
  payload: EncryptedPrompt
): Promise<string> {
  const iv = Buffer.from(payload.iv, "hex");
  const ciphertext = Buffer.from(payload.ciphertext, "hex");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}
