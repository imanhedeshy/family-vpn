import * as fs from "node:fs";
import { createHash } from "node:crypto";
import * as path from "node:path";
export function findBoxDirectory(): string {
  const configured = process.env.FAMILYVPN_CORE_DIRECTORY;
  if (!configured || !path.isAbsolute(configured)) {
    throw new Error("Set FAMILYVPN_CORE_DIRECTORY to the reviewed frozen Family VPN core");
  }
  const candidate = fs.realpathSync(configured);
  const manifest = JSON.parse(fs.readFileSync(
    path.join(candidate, "FAMILYVPN_CORE_MANIFEST.json"), "utf-8",
  ));
  if (manifest.baseCommit !== "7054cac5124465ffdb145870d7c01885566711b1" ||
      manifest.product !== "Family VPN Windows" ||
      typeof manifest.files !== "object" || manifest.files === null ||
      !manifest.files["experimental/boxdd/family_pass.go"] ||
      !manifest.files["go.mod"]) {
    throw new Error("Unreviewed Family VPN core manifest");
  }
  for (const [name, expected] of Object.entries(manifest.files)) {
    const file = path.resolve(candidate, name);
    const relative = path.relative(candidate, file);
    if (relative.startsWith("..") || path.isAbsolute(relative) ||
        typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected) ||
        !fs.lstatSync(file).isFile() || fs.realpathSync(file) !== file ||
        createHash("sha256").update(fs.readFileSync(file)).digest("hex") !== expected) {
      throw new Error("Family VPN core differs from its reviewed manifest");
    }
  }
  const moduleContent = fs.readFileSync(path.join(candidate, "go.mod"), "utf-8");
  if (!/^module github\.com\/sagernet\/sing-box$/m.test(moduleContent)) {
    throw new Error("Invalid Family VPN core module");
  }
  return candidate;
}
