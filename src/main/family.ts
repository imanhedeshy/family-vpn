// AdaTech modifications, 2026. GPL-3.0-or-later.
import { app, dialog, safeStorage } from "electron";
import { open, mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyFamilyPass } from "./familyPass";
import type { FamilyPass } from "./familyPass";
import { Preference, parseBooleanPreference, setPreference, preferenceSnapshot, removePreference } from "./database";
import { applicationService } from "./worker";
import { managedService } from "./daemon";
import { daemonState } from "./state";
import { ServiceStatus_Type } from "../shared/gen/daemon/started_service_pb";
import { applyFamilyProfile, removeFamilyProfile, profilesState, startSelectedProfile } from "./profiles";
import { setOpenAtLogin, openAtLogin } from "./loginItem";
import { probeService, runElevatedServiceCommand } from "./repair";
import { applicationPaths } from "./applicationPaths";

const publicKey = Buffer.from("VEqTRBk83u3h2j9lMyy1etiCzkxzcDAttH+gMDyTjBA=", "base64");
const account = new Preference("family_account_id", "", value => {
  if (typeof value !== "string") throw new Error("Invalid saved Family VPN account");
  return value;
});
const pending = new Preference("family_initial_connection_pending", false, parseBooleanPreference);
const directory = () => join(app.getPath("userData"), "family-vpn");
const savedPath = () => join(directory(), "pass.dpapi");
let operations: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = operations.catch(() => {}).then(operation);
  operations = result.catch(() => {});
  return result;
}
const failure = () => new Error("The personal VPN pass could not be applied. Open your current .familyvpn file; your saved pass is retained.");

async function boundedFile(path: string, limit: number): Promise<Buffer> {
  const file = await open(path, "r");
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > limit) throw failure();
    const data = Buffer.alloc(limit + 1);
    let length = 0;
    while (length <= limit) {
      const result = await file.read(data, length, limit + 1 - length, null);
      if (result.bytesRead === 0) break;
      length += result.bytesRead;
    }
    if (length > limit) throw failure();
    return data.subarray(0, length);
  } finally { await file.close(); }
}
async function atomicPrivate(path: string, data: Buffer): Promise<void> {
  await mkdir(directory(), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${crypto.randomUUID()}.tmp`;
  try {
    await writeFile(temporary, data, { mode: 0o600, flag: "wx" });
    await rename(temporary, path);
  } finally { await unlink(temporary).catch(() => {}); }
}
async function saved(): Promise<{ envelope: string; pass: FamilyPass }> {
  if (process.platform !== "win32" || !safeStorage.isEncryptionAvailable()) throw failure();
  const envelope = safeStorage.decryptString(await boundedFile(savedPath(), 2_000_000));
  const pass = verifyFamilyPass(Buffer.from(envelope, "utf8"), publicKey);
  if (account.get() !== pass.accountID) throw failure();
  return { envelope, pass };
}

/** Called for every profile start/reload. The own daemon verifies again and
 * persists this signed envelope, including its deadline, for boot recovery. */
export async function signedFamilyStartContent(): Promise<string> {
  const value = await saved();
  if (profilesState().selectedId !== `family-${value.pass.accountID}`) throw failure();
  return value.envelope;
}

async function finishInitialConnection(): Promise<void> {
  if (!pending.get()) return;
  const state = await probeService();
  if (state === "not-installed") {
    if (!(await runElevatedServiceCommand(["service", "install", "--working-directory", applicationPaths().daemonData]))) return;
  } else if (state === "not-running") {
    if (!(await runElevatedServiceCommand(["service", "start"]))) return;
  }
  daemonState.retryConnection();
  const deadline = Date.now() + 15_000;
  while (daemonState.connection.phase !== "connected") {
    if (Date.now() >= deadline) throw failure();
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  await startSelectedProfile();
  pending.set(false);
}

export function importFamilyPassFile(path: string): Promise<void> {
  return serialize(async () => {
    try {
      if (process.platform !== "win32" || !path.toLowerCase().endsWith(".familyvpn") || !safeStorage.isEncryptionAvailable()) throw failure();
      const bytes = await boundedFile(path, 1_500_000);
      const pass = verifyFamilyPass(bytes, publicKey);
      const oldAccount = account.get();
      if (oldAccount !== "" && oldAccount !== pass.accountID) throw failure();
      await applicationService.checkConfig({ content: pass.configuration });
      const first = oldAccount === "";
      const initialKeys = ["tray_enabled", "tray_in_background", "check_update_enabled", "update_check_prompted", "selected_profile_id"];
      const initialValues = preferenceSnapshot(initialKeys);
      const previousLogin = openAtLogin();
      let previous: Buffer | undefined;
      let oldPass: FamilyPass | undefined;
      if (!first) {
        previous = await boundedFile(savedPath(), 2_000_000);
        // Authenticate prior rollback data, allowing a now-expired prior file.
        oldPass = verifyFamilyPass(Buffer.from(safeStorage.decryptString(previous), "utf8"), publicKey, 0);
        if (oldPass.accountID !== pass.accountID) throw failure();
      }
      const running = daemonState.status === ServiceStatus_Type.STARTED;
      const wasPending = pending.get();
      const envelope = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const encrypted = safeStorage.encryptString(envelope);
      try {
        if (previous) await atomicPrivate(join(directory(), "previous.dpapi"), previous);
        // Signed pass is authoritative; launch reconciliation regenerates a
        // materialized profile after an interrupted filesystem/SQLite update.
        await atomicPrivate(savedPath(), encrypted);
        account.set(pass.accountID);
        await applyFamilyProfile(pass.accountID, pass.displayName, pass.configuration, first);
        if (first) {
          pending.set(true);
          setPreference("tray_enabled", true);
          setPreference("tray_in_background", true);
          setPreference("check_update_enabled", false);
          setPreference("update_check_prompted", true);
          setOpenAtLogin(true);
        }
        if (running) await startSelectedProfile();
      } catch {
        try {
          if (previous && oldPass) {
            await atomicPrivate(savedPath(), previous);
            account.set(oldAccount);
            await applyFamilyProfile(oldPass.accountID, oldPass.displayName, oldPass.configuration, false);
            pending.set(wasPending);
            if (running) await startSelectedProfile();
          } else {
            account.set(""); pending.set(false);
            await unlink(savedPath()).catch(() => {});
            await removeFamilyProfile(pass.accountID);
            for (const key of initialKeys) {
              if (Object.hasOwn(initialValues, key)) setPreference(key, initialValues[key]);
              else removePreference(key);
            }
            setOpenAtLogin(previousLogin);
          }
        } catch { await managedService?.stopService({}).catch(() => {}); }
        throw failure();
      }
      await finishInitialConnection();
    } catch { throw failure(); }
  });
}

export async function initializeFamilyVPN(incomingFile: boolean): Promise<void> {
  if (process.platform !== "win32") return;
  if (account.get() !== "") {
    await serialize(async () => {
      const value = await saved();
      await applicationService.checkConfig({ content: value.pass.configuration });
      await applyFamilyProfile(value.pass.accountID, value.pass.displayName, value.pass.configuration, false);
      await finishInitialConnection();
    });
  } else if (!incomingFile) {
    const result = await dialog.showOpenDialog({ title: "Open Your Personal VPN Pass", properties: ["openFile"], filters: [{ name: "Family VPN pass", extensions: ["familyvpn"] }] });
    if (!result.canceled && result.filePaths[0]) await importFamilyPassFile(result.filePaths[0]);
  }
}
