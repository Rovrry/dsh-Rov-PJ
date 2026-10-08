/**
 * 把 lib/redteam/client.js 抽成可嵌入的工厂片段，
 * 写进 client.js 里的 DSH_PURGE_DRILL 标记之间。
 *
 * 用法：node scripts/build-client.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const drillSrc = join(root, "lib", "redteam", "client.js");
const clientPath = join(root, "client.js");

const BEGIN = "/* __DSH_PURGE_DRILL_BEGIN__ */";
const END = "/* __DSH_PURGE_DRILL_END__ */";

let raw = readFileSync(drillSrc, "utf8").replace(/\r\n/g, "\n");
const startMark = "factory: (require) => {";
const start = raw.indexOf(startMark);
if (start < 0) throw new Error("cannot find ModuleLoader factory in drill client");
const endMark = "\n    return module.exports\n  },\n})";
const end = raw.lastIndexOf(endMark);
if (end < 0) throw new Error("cannot find factory end in drill client");
let body = raw.slice(start + startMark.length, end);

// 去掉末尾 exports（return 已在 endMark 外）
body = body
	.replace(/\n\s*exports\.apply\s*=\s*apply\s*\n/, "\n")
	.replace(/\n\s*exports\.inject\s*=\s*inject\s*\n/, "\n");

// 替换 apply(ctx)：不再自己注册槽位，只导出 Panel / CSS / 状态
const applyAt = body.lastIndexOf("function apply(ctx) {");
if (applyAt < 0) throw new Error("apply(ctx) not found in drill client");
// apply() 本体没有嵌套函数花括号冲突到 CSS（CSS 在前面），用括号深度即可
let d = 0;
let j = body.indexOf("{", applyAt);
for (; j < body.length; j += 1) {
	const ch = body[j];
	if (ch === "{") d += 1;
	else if (ch === "}") {
		d -= 1;
		if (d === 0) {
			j += 1;
			break;
		}
	}
}
const applyParts = `function applyDrillParts() {
      return { CSS: CSS, Panel: Panel, setUI: setUI, useUI: useUI, isFullWindow: isFullWindow, setDockWidth: setDockWidth };
    }
`;
body = body.slice(0, applyAt) + applyParts + body.slice(j);

const fragment = `${BEGIN}
		// 内嵌演练台（源码在 lib/redteam，已并进本插件）
		const __dshPurgeDrill = (() => {
			var module = { exports: {} };
			var exports = module.exports;
${body}
			return applyDrillParts();
		})();
${END}`;

/* 把源码里的 PANEL_BUILD='DEV' 换成真实构建标记：<版本>+<短提交>。
   面板会显示它 —— 用户"看不到更新"时，这就是分辨"浏览器旧缓存"还是"真没装上"的唯一凭据。
   找不到锚点必须**报错退出**，别静默跳过（否则标记会永远显示 DEV，等于没有）。 */
const DEV_ANCHOR = "const PANEL_BUILD = 'DEV'";
if (!fragment.includes(DEV_ANCHOR)) {
	throw new Error("lib/redteam/client.js 里找不到 " + DEV_ANCHOR + "（构建标记锚点被改了？）");
}
const pkgVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
let shortSha = "";
try {
	const rev = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" });
	if (rev.status === 0) shortSha = String(rev.stdout || "").trim();
} catch { /* 没 git（比如从 zip 里构建）就只用版本号 */ }
/* 源码里还有未提交的改动（client.js 本身不算）时加 +dirty：
   本地临时构建就不会被误当成正式产物；正式发布走"先提交源码 → 再构建 → 再提交产物"。 */
let dirty = false;
try {
	const st = spawnSync("git", ["status", "--porcelain", "--untracked-files=no", "--", ".", ":(exclude)client.js"], { cwd: root, encoding: "utf8" });
	if (st.status === 0 && String(st.stdout || "").trim() !== "") dirty = true;
} catch { /* ignore */ }
const stamp = "v" + pkgVersion + (shortSha ? "+" + shortSha : "") + (dirty ? "+dirty" : "");
const stampedFragment = fragment.replace(DEV_ANCHOR, "const PANEL_BUILD = '" + stamp + "'");
if (!stampedFragment.includes("const PANEL_BUILD = '" + stamp + "'")) {
	throw new Error("构建标记替换没生效");
}

let client = readFileSync(clientPath, "utf8");
if (!client.includes(BEGIN) || !client.includes(END)) {
	throw new Error("client.js missing drill markers; run patch-client-dock.mjs first");
}
const beginAt = client.indexOf(BEGIN);
const endAt = client.indexOf(END);
if (beginAt < 0 || endAt < 0 || endAt < beginAt) throw new Error("drill markers out of order");
client = client.slice(0, beginAt) + stampedFragment + client.slice(endAt + END.length);
writeFileSync(clientPath, client);
console.log("embedded drill client into client.js (" + Buffer.byteLength(stampedFragment) + " bytes fragment, PANEL_BUILD=" + stamp + ")");
