import { subtle, getRandomValues } from "node:crypto";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Function to generate a key from a password
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const keyMaterial = await subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt function
async function encrypt(text: string, password: string): Promise<string> {
  const salt = getRandomValues(new Uint8Array(16));
  const iv = getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encryptedData = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(text)
  );

  const encryptedArray = new Uint8Array(encryptedData);
  const result = new Uint8Array(
    salt.length + iv.length + encryptedArray.length
  );
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(encryptedArray, salt.length + iv.length);

  return btoa(String.fromCharCode(...result));
}

// Decrypt function
async function decrypt(
  encryptedText: string,
  password: string
): Promise<string> {
  const encryptedBytes = Uint8Array.from(atob(encryptedText), (c) =>
    c.charCodeAt(0)
  );

  const salt = encryptedBytes.slice(0, 16);
  const iv = encryptedBytes.slice(16, 28);
  const data = encryptedBytes.slice(28);

  const key = await deriveKey(password, salt);

  const decryptedData = await subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return decoder.decode(decryptedData);
}

// Usage Example
/**
(async () => {
  const password = "password";
  const text = "Hello, World!";

  const encryptedText = await encrypt(text, password);
  console.log("Encrypted:", encryptedText);

  const decryptedText = await decrypt(encryptedText, password);
  console.log("Decrypted:", decryptedText);
})();
 */

export { encrypt, decrypt };
