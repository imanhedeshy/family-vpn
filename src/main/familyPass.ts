// AdaTech modifications, 2026. GPL-3.0-or-later.
import { createPublicKey, verify } from "node:crypto";

export interface FamilyPass {
  accountID: string;
  displayName: string;
  configuration: string;
  expiresAt?: string;
}

const context = Buffer.from("AdaTech Family VPN configuration v1\n", "utf8");
const platforms = ["android", "ios", "macos", "windows"];
const invalid = () => new Error("The personal VPN pass file is invalid or expired.");

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function base64(value: unknown): Buffer {
  if (typeof value !== "string" || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw invalid();
  const decoded = Buffer.from(value, "base64");
  if (decoded.toString("base64") !== value) throw invalid();
  return decoded;
}

// The caller supplies the app's pinned public key, never a key from the pass.
// This function performs no file, preference, network or service writes.
export function verifyFamilyPass(data: Uint8Array, publicKey: Uint8Array, now = Date.now()): FamilyPass {
  try {
    if (data.byteLength > 1_500_000 || publicKey.byteLength !== 32) throw invalid();
    const envelope: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data));
    if (!object(envelope) || envelope.version !== 1) throw invalid();
    const payload = base64(envelope.payload);
    const signature = base64(envelope.signature);
    if (payload.length > 1_048_576 || signature.length !== 64) throw invalid();
    const key = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(publicKey)]), format: "der", type: "spki" });
    if (!verify(null, Buffer.concat([context, payload]), key, signature)) throw invalid();
    const document: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payload));
    if (!object(document) || document.version !== 2 || document.configuration !== undefined) throw invalid();
    if (typeof document.accountID !== "string" || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(document.accountID)) throw invalid();
    if (typeof document.displayName !== "string" || document.displayName.trim().length === 0 || [...document.displayName].length > 80 || /[\u0000-\u001f\u007f-\u009f]/.test(document.displayName)) throw invalid();
    const configs = document.platformConfigurations;
    if (!object(configs) || Object.keys(configs).sort().join() !== platforms.join()) throw invalid();
    for (const platform of platforms) {
      const config = configs[platform];
      if (typeof config !== "string" || !object(JSON.parse(config))) throw invalid();
    }
    const expiry = document.expiresAt;
    if (expiry !== undefined && expiry !== null && expiry !== "") {
      if (typeof expiry !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(expiry)) throw invalid();
      const deadline = Date.parse(expiry);
      if (!Number.isFinite(deadline) || new Date(deadline).toISOString().replace(".000Z", "Z") !== expiry || now >= deadline) throw invalid();
    }
    return { accountID: document.accountID.toLowerCase(), displayName: document.displayName,
      configuration: configs.windows as string, expiresAt: typeof expiry === "string" ? expiry : undefined };
  } catch {
    // JSON/crypto exceptions may contain input. Never expose them to logs/UI.
    throw invalid();
  }
}
