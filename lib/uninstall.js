import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import * as core from "./core.js";
import * as hostctl from "./host.js";
import * as rules from "./rules.js";
import * as updater from "./update.js";
import { clearDrillGrant } from "./drill-grant.js";

export function wasApplied(state) {
  if (!state) return false;
  if (state.has_backup) return true;
  if (Number(state.patches_applied) > 0) return true;
  return [state.shim_cmd, state.shim_ps1, state.shim_bin].includes("patched");
}

export function shouldDeletePluginTree(dir, dshHome = core.findDshHome()) {
  if (!dir) return false;
  let real;
  try {
    real = fs.realpathSync(dir);
  } catch {
    real = path.resolve(dir);
  }
  const n = real.replace(/[/\\]+/g, "/").toLowerCase();
  if (n.includes("/node_modules/dsh-purge")) return true;
  let home;
  try {
    home = fs.realpathSync(dshHome);
  } catch {
    home = path.resolve(dshHome);
  }
  const homeN = home.replace(/[/\\]+/g, "/").toLowerCase();
  return n.startsWith(`${homeN}/profiles/`);
}

export function stripPluginFromPackage(pkg) {
  if (!pkg || typeof pkg !== "object") return false;
  let changed = false;
  for (const key of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    if (pkg[key] && Object.prototype.hasOwnProperty.call(pkg[key], "dsh-purge")) {
      delete pkg[key]["dsh-purge"];
      changed = true;
    }
  }
  const isPurge = (item) => {
    if (typeof item === "string") return item === "dsh-purge" || item.startsWith("dsh-purge@");
    const id = item && (item.id || item.name);
    return id === "dsh-purge";
  };
  const stripList = (holder, key) => {
    if (!holder || !Array.isArray(holder[key])) return;
    const next = holder[key].filter((item) => !isPurge(item));
    if (next.length !== holder[key].length) {
      holder[key] = next;
      changed = true;
    }
  };
  for (const key of ["bundles", "plugins"]) stripList(pkg, key);
  /* 真正生效的那份是 profile 层的 bundle 列表：dsh.profile.bundles —— `dsh plugin ls` 读它，
     只清顶层数组会留下"卸载完了 ls 里还列着插件"的假象（HANDOFF 记过这个坑）。 */
  const profile = pkg.dsh && pkg.dsh.profile;
  for (const key of ["bundles", "plugins"]) stripList(profile, key);
  return changed;
}

function readJson(fp) {
  try {
    return JSON.parse(fs.readFileSync(fp, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(fp, value) {
  fs.writeFileSync(fp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function pkgMentionsPurge(pkg) {
  if (!pkg) return false;
  if (pkg.dependencies?.["dsh-purge"] || pkg.devDependencies?.["dsh-purge"]) return true;
  for (const key of ["bundles", "plugins"]) {
    if (!Array.isArray(pkg[key])) continue;
    if (pkg[key].some((item) => {
      if (typeof item === "string") return item === "dsh-purge" || item.startsWith("dsh-purge@");
      return item && (item.id === "dsh-purge" || item.name === "dsh-purge");
    })) return true;
  }
  return false;
}

export function listInstalledProfiles(dshHome = core.findDshHome()) {
  const root = path.join(dshHome, "profiles");
  if (!fs.existsSync(root)) return [];
  let names = [];
  try {
    names = fs.readdirSync(root);
  } catch {
    return [];
  }
  const out = [];
  for (const name of names) {
    const dir = path.join(root, name);
    const pkgPath = path.join(dir, "package.json");
    const pkg = readJson(pkgPath);
    const nm = path.join(dir, "node_modules", "dsh-purge");
    if (!pkgMentionsPurge(pkg) && !fs.existsSync(nm)) continue;
    const spec = pkg?.dependencies?.["dsh-purge"] || pkg?.devDependencies?.["dsh-purge"] || "";
    out.push({ name, dir, spec: String(spec || ""), pkgPath, hasModule: fs.existsSync(nm) });
  }
  return out;
}

async function unlinkIfExists(fp) {
  try {
    await fsp.unlink(fp);
    return true;
  } catch (e) {
    if (e && e.code === "ENOENT") return false;
    throw e;
  }
}

async function rmIfExists(fp) {
  try {
    await fsp.rm(fp, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

async function removeOverride(dshHome) {
  const fp = core.findOverrideFile(dshHome);
  const ok = await unlinkIfExists(fp);
  return { path: fp, removed: ok };
}

async function resetRules(dshHome) {
  const reset = await rules.resetToOriginal(dshHome);
  const dir = rules.rulesDir(dshHome);
  const removedDir = await rmIfExists(dir);
  return { ...reset, rules_dir: dir, rules_dir_removed: removedDir };
}

function collectCleanupDirs(profiles, dshHome) {
  const seen = new Set();
  const cleanup = [];
  const remember = (dir) => {
    if (!dir) return;
    let real;
    try {
      real = fs.realpathSync(dir);
    } catch {
      real = path.resolve(dir);
    }
    const key = real.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    cleanup.push(real);
  };

  for (const p of profiles) {
    const nm = path.join(p.dir, "node_modules", "dsh-purge");
    if (!fs.existsSync(nm)) continue;
    let real;
    try {
      real = fs.realpathSync(nm);
    } catch {
      real = path.resolve(nm);
    }
    if (shouldDeletePluginTree(real, dshHome)) remember(real);
    if (path.resolve(nm).toLowerCase() !== real.toLowerCase()) remember(nm);
  }

  const dataDir = path.join(dshHome, "dsh-purge");
  remember(dataDir);

  const root = updater.pluginRoot();
  if (shouldDeletePluginTree(root, dshHome)) remember(root);

  return cleanup;
}

/**
 * 立刻尝试删除待清理目录，返回删不掉的。
 *
 * 为什么需要「立刻」：`collectCleanupDirs` 只是把路径收集进 `report.cleanup`，
 * 真正的删除原本交给重启助手（`lib/uninstall-restart.js`）——而那个助手会**先等待
 * 端口释放**再删。GUI 卸载路径里宿主进程随后就被结束，等待会很快结束；但命令行
 * `dsh-purge --uninstall` 没有能力结束宿主，助手会一直等下去。结果是命令行卸载
 * 只从 profile 的 package.json 摘掉依赖，**插件文件原地不动**。
 *
 * 所以这里直接删一遍：删成功的就不再依赖重启助手，删不掉的（例如文件被占用）
 * 留给重启助手兜底。两种入口都不会再出现「说卸载完了但文件还在」。
 */
async function removeCleanupDirs(cleanup) {
  const failed = [];
  for (const dir of cleanup) {
    const ok = await rmIfExists(dir);
    if (!ok) failed.push(dir);
  }
  return failed;
}

function unregisterProfiles(profiles) {
  const stripped = [];
  const errors = [];
  for (const p of profiles) {
    try {
      const pkg = readJson(p.pkgPath) || {};
      if (stripPluginFromPackage(pkg)) {
        writeJson(p.pkgPath, pkg);
        stripped.push(p.name);
      }
    } catch (e) {
      errors.push({ profile: p.name, error: String(e && e.message ? e.message : e) });
    }
  }
  return { stripped, errors };
}

export async function uninstallPurge() {
  const state = await core.gatherState();
  const applied = wasApplied(state);
  const dshHome = state.dsh_home || core.findDshHome();
  const report = {
    ok: true,
    applied,
    reverted: false,
    needRestart: true,
    patches: null,
    shim: null,
    flash: null,
    override: null,
    rules: null,
    profiles: [],
    cleanup: [],
    errors: [],
  };

  try {
    if (state.ai_base) {
      report.patches = await core.revertAll(state.ai_base);
      if (applied) report.reverted = true;
    }
  } catch (e) {
    report.errors.push(`revert patches: ${e.message || e}`);
  }
  if (applied && (report.patches?.errors?.length || report.errors.some((e) => /^revert patches:/.test(e)))) {
    report.ok = false;
    report.needRestart = false;
    report.cleanup = [];
    return report;
  }

  try {
    report.shim = await core.revertAllShims();
    if (state.shim_cmd === "patched" || state.shim_ps1 === "patched" || state.shim_bin === "patched") {
      report.reverted = true;
    }
  } catch (e) {
    report.errors.push(`revert shims: ${e.message || e}`);
  }

  try {
    report.flash = core.revertCmdFlash(state.ai_base, dshHome);
  } catch (e) {
    report.errors.push(`revert flash: ${e.message || e}`);
  }

  try {
    report.override = await removeOverride(dshHome);
  } catch (e) {
    report.errors.push(`remove override: ${e.message || e}`);
  }

  try {
    report.rules = await resetRules(dshHome);
  } catch (e) {
    report.errors.push(`reset rules: ${e.message || e}`);
  }

  const profiles = listInstalledProfiles(dshHome);
  report.profiles = profiles.map((p) => p.name);
  const unreg = unregisterProfiles(profiles);
  report.stripped = unreg.stripped;
  report.errors.push(...unreg.errors.map((x) => `${x.profile}: ${x.error}`));
  if (unreg.errors.length) {
    report.ok = false;
    report.needRestart = false;
    report.cleanup = [];
    report.drillGrantCleared = false;
    return report;
  }

  try {
    report.drillGrantCleared = clearDrillGrant(dshHome);
  } catch (e) {
    report.ok = false;
    report.needRestart = false;
    report.cleanup = [];
    report.errors.push(`clear drill grant: ${e.message || e}`);
    return report;
  }

  report.cleanup = collectCleanupDirs(profiles, dshHome);
  /* 立刻删一遍：命令行卸载没有后续重启助手可用，不删就永远留着。 */
  report.cleanup_removed = true;
  report.cleanup_failed = await removeCleanupDirs(report.cleanup);
  if (report.cleanup_failed.length) {
    /* 还有残留（多半是被占用），需要重启后由助手再删一次。 */
    report.cleanup_removed = false;
  }
  return report;
}

export function scheduleCleanupRestart(opts = {}) {
  hostctl.scheduleCleanupRestart(opts);
}
