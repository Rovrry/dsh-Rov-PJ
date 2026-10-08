/**
 * 红队平台适配配置（插件内，无 .ps1）
 *
 * 落盘：`$DSH_HOME/redteam/config.json`
 * 用途：
 *   · Windows / 非 Kali 机器上，由用户填写工具绝对路径或搜索目录；
 *   · preflight / 技能可用性 / nuclei 模板目录 统一走这里；
 *   · 不往官方 `$DSH_HOME/skills` 写任何东西。
 *
 * 借鉴 Z3r0：系统配置集中、可在 UI 里改（FOFA / 路径类），而不是只靠 shell 引导。
 */
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { homedir, platform as osPlatform } from 'node:os'
import { delimiter, isAbsolute, join, relative, resolve, sep } from 'node:path'

/** 配置文件路径。 */
export function configPathOf(root) {
  return join(root || redteamRoot(), 'config.json')
}

export function redteamRoot() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'redteam')
}

/** 默认工具箱目录。 */
export function defaultToolkitDir(root) {
  return join(root || redteamRoot(), 'toolkit')
}

/**
 * 内置工具清单：id → 可能的可执行名（含 Windows .exe）。
 * 用户可在 config.tools[id] 填绝对路径覆盖；也可在 binDirs 里放整包工具目录。
 *
 * 清单本体已移到 toolkit-catalog.js（含版本 / 运行环境 / 官方下载命令），
 * 这里 re-export 以保持既有 import 不破。
 */
import {
  TOOL_CATALOG,
  TOOLKIT_CATALOG,
  RUNTIME_CATALOG,
  TOOL_BY_ID,
  TOOLKIT_CATALOG as TK_CATALOG,
  RUNTIME_CATALOG as RT_CATALOG,
  toolDirName,
  toolDirName as tkDirName,
  runtimeNeedOf,
} from './toolkit-catalog.js'

export { TOOL_CATALOG, TOOLKIT_CATALOG, RUNTIME_CATALOG, toolDirName, runtimeNeedOf } from './toolkit-catalog.js'

const EMPTY = () => ({
  version: 1,
  /* auto | windows | linux —— auto 跟 Node process.platform */
  platform: 'auto',
  toolkitDir: '',
  nucleiTemplatesDir: '',
  /* 额外搜索目录：用户自己的 Kali 工具包 / 绿色版工具夹 */
  binDirs: [],
  /* id → 绝对路径；空字符串表示未指定 */
  tools: Object.fromEntries(TOOL_CATALOG.map((t) => [t.id, ''])),
  env: {
    FOFA_KEY: '',
    REDTEAM_VPS_HOST: '',
    REDTEAM_VPS_KEY: '',
  },
  notes: '',
  /* 用户确认「暂不配置工具」后允许正常对话 */
  envAdaptSkip: false,
  /* 用户在环境适配里保存/文件夹分配过一次 */
  envAdaptConfigured: false,
  updated_at: null,
})

function isWinLike(cfg) {
  const p = (cfg && cfg.platform) || 'auto'
  if (p === 'windows') return true
  if (p === 'linux') return false
  return osPlatform() === 'win32'
}

export function loadPlatformConfig(root) {
  const base = EMPTY()
  const file = configPathOf(root)
  if (!existsSync(file)) return Object.assign({}, base, { path: file, exists: false })
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    const tools = Object.assign({}, base.tools, raw.tools && typeof raw.tools === 'object' ? raw.tools : {})
    const env = Object.assign({}, base.env, raw.env && typeof raw.env === 'object' ? raw.env : {})
    const binDirs = Array.isArray(raw.binDirs)
      ? raw.binDirs.map((x) => String(x || '').trim()).filter(Boolean)
      : []
    return {
      version: Number(raw.version) || 1,
      platform: ['auto', 'windows', 'linux'].includes(raw.platform) ? raw.platform : 'auto',
      toolkitDir: typeof raw.toolkitDir === 'string' ? raw.toolkitDir.trim() : '',
      nucleiTemplatesDir: typeof raw.nucleiTemplatesDir === 'string' ? raw.nucleiTemplatesDir.trim() : '',
      binDirs,
      tools,
      env,
      notes: typeof raw.notes === 'string' ? raw.notes : '',
      envAdaptSkip: !!raw.envAdaptSkip,
      envAdaptConfigured: !!raw.envAdaptConfigured,
      updated_at: raw.updated_at || null,
      path: file,
      exists: true,
    }
  } catch (error) {
    return Object.assign({}, base, {
      path: file,
      exists: true,
      error: error && error.message ? error.message : String(error),
    })
  }
}

export function savePlatformConfig(patch, root) {
  const dir = root || redteamRoot()
  mkdirSync(dir, { recursive: true })
  const prev = loadPlatformConfig(dir)
  const next = {
    version: 1,
    platform: ['auto', 'windows', 'linux'].includes(patch.platform) ? patch.platform : (prev.platform || 'auto'),
    toolkitDir: typeof patch.toolkitDir === 'string' ? patch.toolkitDir.trim() : (prev.toolkitDir || ''),
    nucleiTemplatesDir: typeof patch.nucleiTemplatesDir === 'string'
      ? patch.nucleiTemplatesDir.trim()
      : (prev.nucleiTemplatesDir || ''),
    binDirs: Array.isArray(patch.binDirs)
      ? patch.binDirs.map((x) => String(x || '').trim()).filter(Boolean)
      : (prev.binDirs || []),
    tools: Object.assign({}, prev.tools || {}, patch.tools && typeof patch.tools === 'object' ? patch.tools : {}),
    env: Object.assign({}, prev.env || {}, patch.env && typeof patch.env === 'object' ? patch.env : {}),
    notes: typeof patch.notes === 'string' ? patch.notes : (prev.notes || ''),
    envAdaptSkip: patch.envAdaptSkip !== undefined ? !!patch.envAdaptSkip : !!prev.envAdaptSkip,
    envAdaptConfigured: patch.envAdaptConfigured !== undefined
      ? !!patch.envAdaptConfigured
      : !!prev.envAdaptConfigured,
    updated_at: new Date().toISOString(),
  }
  /* 空 tools 键保留 catalog 全量，方便面板编辑 */
  for (const t of TOOL_CATALOG) {
    if (next.tools[t.id] === undefined || next.tools[t.id] === null) next.tools[t.id] = ''
    else next.tools[t.id] = String(next.tools[t.id]).trim()
  }
  const file = configPathOf(dir)
  writeFileSync(file, JSON.stringify(next, null, 2), 'utf8')
  return loadPlatformConfig(dir)
}

/** 生效的工具箱根。 */
export function toolkitDirOf(cfg, root) {
  const c = cfg || loadPlatformConfig(root)
  if (c.toolkitDir) return resolve(c.toolkitDir)
  return defaultToolkitDir(root)
}

/** 生效的 nuclei 模板目录（可空）。 */
export function nucleiTemplatesDirOf(cfg, root) {
  const c = cfg || loadPlatformConfig(root)
  if (c.nucleiTemplatesDir && existsSync(c.nucleiTemplatesDir)) return resolve(c.nucleiTemplatesDir)
  return null
}

/**
 * 在目录里找可执行名（浅扫一层 + 常见子目录 bin/）。
 */
function looksLikePythonCli(file) {
  let fd
  try {
    const buf = Buffer.alloc(96)
    fd = openSync(file, 'r')
    const n = readSync(fd, buf, 0, buf.length, 0)
    const head = buf.subarray(0, n).toString('utf8')
    return head.startsWith('#!') && /python/i.test(head)
  } catch {
    return false
  } finally {
    if (fd !== undefined) {
      try { closeSync(fd) } catch { /* ignore */ }
    }
  }
}

function findInDir(dir, names, options = {}) {
  if (!dir || !existsSync(dir)) return null
  const tryOne = (base) => {
    for (const name of names) {
      const p = join(base, name)
      if (existsSync(p)) {
        try {
          const st = statSync(p)
          if (!st.isFile()) continue
          if (options.rejectPython && looksLikePythonCli(p)) continue
          return p
        } catch { /* continue */ }
      }
    }
    return null
  }
  const hit = tryOne(dir) || adaptInDir(dir, options)
  if (hit) return hit
  for (const sub of ['bin', 'Bins', 'tools', 'Tools']) {
    const nested = tryOne(join(dir, sub)) || adaptInDir(join(dir, sub), options)
    if (nested) return nested
  }
  /* 统一布局：toolkit/<工具名>/<可执行文件>。上面几层都没命中时逐个下一级子目录
     再找一遍 —— 这是本插件的推荐布局（见 docs/TOOLKIT.md），不认它的话
     用户按规范装好工具反而检测不到。 */
  try {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue
      const sub = join(dir, ent.name)
      const nested = tryOne(sub) || adaptInDir(sub, options)
      if (nested) return nested
    }
  } catch { /* 读不了目录就放弃这一层 */ }
  return null
}

/** 精确文件名没有时，用发行版别名在这一层目录里对。对上才算找到。 */
function adaptInDir(dir, options) {
  const patterns = options.adapt
  if (!dir || !Array.isArray(patterns) || patterns.length === 0 || !existsSync(dir)) return null
  let names
  try { names = readdirSync(dir) } catch { return null }
  for (const pattern of patterns) {
    for (const name of names) {
      if (!pattern.test(String(name).toLowerCase())) continue
      const file = join(dir, name)
      try {
        if (!statSync(file).isFile()) continue
        if (options.rejectPython && looksLikePythonCli(file)) continue
        return file
      } catch { /* continue */ }
    }
  }
  return null
}

/** PATH 上的 which（仅同步、不 spawn shell）。 */
function findOnPath(names, env = process.env, options = {}) {
  const pathVar = env.PATH || env.Path || ''
  const parts = pathVar.split(delimiter).filter(Boolean)
  for (const part of parts) {
    const hit = findInDir(part, names, options)
    if (hit) return hit
  }
  return null
}

/** dsh 的 PATH 经常比登录 shell 短。Linux 再补发行版和用户目录。 */
function linuxFallbackDirs(env = process.env) {
  const home = env.HOME || homedir()
  const dirs = ['/usr/local/sbin', '/usr/local/bin', '/usr/sbin', '/usr/bin', '/bin', '/snap/bin']
  if (home) {
    dirs.push(
      join(home, 'go', 'bin'),
      join(home, '.local', 'bin'),
      join(home, '.pdtm', 'go', 'bin'),
    )
  }
  return dirs
}

/**
 * 解析单个工具：用户指定路径 → toolkit → binDirs → PATH。
 * @returns `{ id, label, path, source: 'config'|'toolkit'|'binDir'|'path'|'missing', names }`
 */
export function resolveTool(id, options = {}) {
  const root = options.root || redteamRoot()
  const cfg = options.config || loadPlatformConfig(root)
  const env = options.env || process.env
  const def = TOOL_CATALOG.find((t) => t.id === id)
  if (!def) {
    return { id, label: id, path: null, source: 'missing', names: [] }
  }
  const configured = cfg.tools && typeof cfg.tools[id] === 'string' ? cfg.tools[id].trim() : ''
  if (configured) {
    const abs = isAbsolute(configured) ? configured : resolve(configured)
    if (existsSync(abs)) {
      return { id, label: def.label, path: abs, source: 'config', names: def.names }
    }
    return { id, label: def.label, path: null, source: 'missing', names: def.names, configured: abs, note: 'config 路径不存在：' + abs }
  }
  const findOpts = { rejectPython: !!def.rejectPython, adapt: def.adapt }
  const toolkit = toolkitDirOf(cfg, root)
  const fromToolkit = findInDir(toolkit, def.names, findOpts)
  if (fromToolkit) return { id, label: def.label, path: fromToolkit, source: 'toolkit', names: def.names }

  for (const dir of cfg.binDirs || []) {
    const hit = findInDir(dir, def.names, findOpts)
    if (hit) return { id, label: def.label, path: hit, source: 'binDir', names: def.names, binDir: dir }
  }

  const fromPath = findOnPath(def.names, env, findOpts)
  if (fromPath) return { id, label: def.label, path: fromPath, source: 'path', names: def.names }

  if (!isWinLike(cfg)) {
    for (const dir of linuxFallbackDirs(env)) {
      const hit = findInDir(dir, def.names, findOpts)
      if (hit) return { id, label: def.label, path: hit, source: 'path', names: def.names }
    }
  }

  return { id, label: def.label, path: null, source: 'missing', names: def.names }
}

export function resolveAllTools(options = {}) {
  return TOOL_CATALOG.map((t) => resolveTool(t.id, options))
}

/**
 * 把配置里的 env 合并进 effectiveEnv（进程 / .env 已有的优先，不覆盖）。
 */
export function mergeConfigEnv(effectiveEnv, cfg) {
  const out = Object.assign({}, effectiveEnv || {})
  const env = (cfg && cfg.env) || {}
  for (const [k, v] of Object.entries(env)) {
    if (typeof v !== 'string') continue
    const val = v.trim()
    if (val === '') continue
    if (out[k] === undefined || out[k] === '') out[k] = val
  }
  return out
}

/**
 * 平台摘要：给面板与 preflight 用。
 */
export function platformSummary(root) {
  const cfg = loadPlatformConfig(root)
  const win = isWinLike(cfg)
  const tools = resolveAllTools({ root, config: cfg })
  const found = tools.filter((t) => t.path)
  const missing = tools.filter((t) => !t.path)
  const toolkit = toolkitDirOf(cfg, root)
  const nuclei = nucleiTemplatesDirOf(cfg, root)
    || (existsSync(join(toolkit, 'nuclei-templates')) ? join(toolkit, 'nuclei-templates') : null)
  const adapt = envAdaptStatus(root)
  return {
    ok: true,
    config: cfg,
    runtime: {
      nodePlatform: osPlatform(),
      effective: win ? 'windows' : 'linux',
      windows: win,
      sep,
    },
    toolkitDir: toolkit,
    toolkitExists: existsSync(toolkit),
    nucleiTemplatesDir: nuclei,
    tools: {
      total: tools.length,
      found: found.length,
      missing: missing.length,
      items: tools,
    },
    adapt,
    hint: adapt.kali
      ? '已检测到 Kali。系统包按发行版文件名认：impacket-secretsdump、httpx-toolkit（不把 Python 的 /usr/bin/httpx 当成扫描器）。fscan、gogo、suo5、frp、chisel、dnsx、subfinder、ksubdomain 不是 Kali 自带命令，没放进 /usr/bin 或 ~/go/bin 就会显示未找到。'
      : (win
        ? '当前按 Windows 适配：建议在 Kali 虚拟机里跑，或在本页填工具路径/整包文件夹自动分配。出网代理看下方「出网状态」。'
        : '当前按 Linux 适配：可用 setup.sh 装工具箱，也可在本页手填或整包文件夹自动分配。出网代理看下方「出网状态」。'),
    egress: {
      http_proxy: process.env.HTTP_PROXY || process.env.http_proxy || '',
      https_proxy: process.env.HTTPS_PROXY || process.env.https_proxy || '',
      all_proxy: process.env.ALL_PROXY || process.env.all_proxy || '',
      no_proxy: process.env.NO_PROXY || process.env.no_proxy || '',
      note: '只读进程环境；改系统/终端代理后需重启宿主。命令级代理请用技能 cn-proxy-pool，不改本机网络配置。',
    },
  }
}

/** 探测本机是否 Kali / 同系演练发行版。 */
export function detectKali() {
  if (osPlatform() !== 'linux') {
    return { kali: false, source: null, detail: '非 Linux 宿主' }
  }
  try {
    const text = readFileSync('/etc/os-release', 'utf8')
    if (/ID\s*=\s*"?kali"?/i.test(text) || /ID_LIKE\s*=[^\n]*kali/i.test(text) || /NAME\s*=\s*".*Kali/i.test(text)) {
      return { kali: true, source: 'os-release', detail: 'os-release 标明 Kali' }
    }
  } catch { /* ignore */ }
  const markers = [
    '/usr/share/kali-menu',
    '/etc/apt/sources.list.d/kali.list',
    '/usr/share/kali-defaults',
  ]
  for (const p of markers) {
    if (existsSync(p)) return { kali: true, source: 'paths', detail: p }
  }
  return { kali: false, source: null, detail: null }
}

const NAME_TO_IDS = (() => {
  const map = new Map()
  for (const t of TOOL_CATALOG) {
    for (const name of t.names) {
      const key = String(name).toLowerCase()
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(t.id)
    }
  }
  return map
})()

/**
 * 在文件夹内递归扫工具名（限深度），返回 id → 绝对路径。
 */
export function scanFolderForTools(dir, options = {}) {
  const maxDepth = Math.min(Math.max(Number(options.maxDepth) || 4, 1), 6)
  const maxFiles = Math.min(Math.max(Number(options.maxFiles) || 8000, 100), 20000)
  const root = resolve(String(dir || '').trim())
  const assigned = {}
  const hits = []
  if (!root || !existsSync(root)) {
    return { ok: false, error: '目录不存在：' + root, assigned, hits }
  }
  let st
  try { st = statSync(root) } catch {
    return { ok: false, error: '无法读取目录：' + root, assigned, hits }
  }
  if (!st.isDirectory()) {
    return { ok: false, error: '不是文件夹：' + root, assigned, hits }
  }

  let scanned = 0
  const ranks = {}
  const walk = (base, depth) => {
    if (scanned >= maxFiles || depth > maxDepth) return
    let entries
    try { entries = readdirSync(base, { withFileTypes: true }) } catch { return }
    for (const ent of entries) {
      if (scanned >= maxFiles) break
      const name = ent.name
      if (!name || name === '.' || name === '..') continue
      if (name.startsWith('.') || name === 'node_modules' || name === '.git') continue
      const full = join(base, name)
      let isDir = false
      let isFile = false
      try {
        if (typeof ent.isDirectory === 'function') {
          isDir = ent.isDirectory()
          isFile = ent.isFile()
        } else {
          const s = statSync(full)
          isDir = s.isDirectory()
          isFile = s.isFile()
        }
      } catch { continue }
      if (isDir) {
        walk(full, depth + 1)
        continue
      }
      if (!isFile) continue
      scanned += 1
      const key = name.toLowerCase()
      const ids = NAME_TO_IDS.get(key)
      if (!ids) continue
      for (const id of ids) {
        const def = TOOL_CATALOG.find((t) => t.id === id)
        if (def && def.rejectPython && looksLikePythonCli(full)) continue
        const rank = def ? def.names.findIndex((n) => n.toLowerCase() === key) : 99
        const prevRank = ranks[id] === undefined ? 99 : ranks[id]
        if (assigned[id] && rank >= prevRank) continue
        ranks[id] = rank < 0 ? 99 : rank
        assigned[id] = full
        hits.push({ id, path: full, name })
      }
    }
  }
  walk(root, 0)

  /* nuclei-templates 目录顺带认一下 */
  let nucleiTemplatesDir = ''
  const tryNuclei = [
    join(root, 'nuclei-templates'),
    join(root, 'nuclei', 'templates'),
  ]
  for (const p of tryNuclei) {
    if (existsSync(p)) {
      try {
        if (statSync(p).isDirectory()) { nucleiTemplatesDir = p; break }
      } catch { /* ignore */ }
    }
  }

  return {
    ok: true,
    dir: root,
    scanned,
    assigned,
    hits,
    nucleiTemplatesDir,
    assignedCount: Object.keys(assigned).length,
  }
}

/**
 * 把整包工具文件夹写入 config：toolkitDir + 匹配到的 tools 路径。
 */
export function assignToolkitFolder(dir, root) {
  const scan = scanFolderForTools(dir)
  if (!scan.ok) return Object.assign({ ok: false }, scan)
  const prev = loadPlatformConfig(root)
  const tools = Object.assign({}, prev.tools || {})
  for (const [id, path] of Object.entries(scan.assigned)) {
    tools[id] = path
  }
  const binDirs = Array.isArray(prev.binDirs) ? prev.binDirs.slice() : []
  if (!binDirs.includes(scan.dir)) binDirs.unshift(scan.dir)
  const patch = {
    toolkitDir: scan.dir,
    binDirs,
    tools,
    envAdaptConfigured: true,
    envAdaptSkip: false,
  }
  if (scan.nucleiTemplatesDir) patch.nucleiTemplatesDir = scan.nucleiTemplatesDir
  const cfg = savePlatformConfig(patch, root)
  const summary = platformSummary(root)
  return {
    ok: true,
    assigned: scan.assigned,
    assignedCount: scan.assignedCount,
    hits: scan.hits,
    scanned: scan.scanned,
    dir: scan.dir,
    nucleiTemplatesDir: scan.nucleiTemplatesDir || null,
    config: cfg,
    tools: summary.tools,
    adapt: summary.adapt,
  }
}

/**
 * 红队发送前环境门禁状态。
 * Kali → 直接就绪；否则需配置/已分配工具，或用户确认跳过。
 */
export function envAdaptStatus(root) {
  const cfg = loadPlatformConfig(root)
  const kaliInfo = detectKali()
  const tools = resolveAllTools({ root, config: cfg })
  const foundItems = tools.filter((t) => t.path)
  const missingItems = tools.filter((t) => !t.path)
  const found = foundItems.length
  const skipped = !!cfg.envAdaptSkip
  /* 只有记下的路径算已配置。单独的 envAdaptConfigured 可能是空的自动初始化。 */
  const savedPaths = !!(cfg.toolkitDir && String(cfg.toolkitDir).trim())
    || (cfg.binDirs && cfg.binDirs.length > 0)
    || TOOL_CATALOG.some((t) => cfg.tools && cfg.tools[t.id] && String(cfg.tools[t.id]).trim())

  let reason = 'need-config'
  let ready = false
  let message = ''

  if (kaliInfo.kali) {
    ready = true
    reason = 'kali'
    message = '已检测到 Kali，默认直接使用本机工具（PATH / 默认查找）。'
  } else if (skipped) {
    ready = true
    reason = 'skipped'
    message = '你已确认暂不配置工具，可正常对话（扫描类技能可能不可用）。'
  } else if (savedPaths) {
    ready = true
    reason = 'configured'
    message = '已保存的工具路径还在，更新插件不会要求重配。当前找到 ' + found + '/' + tools.length + ' 个工具。'
  } else if (found >= 2) {
    ready = true
    reason = 'tools-found'
    message = '本机已能找到 ' + found + ' 个工具，视为可用。'
  } else {
    ready = false
    reason = 'need-config'
    message = '未检测到 Kali，且工具未配置。请打开 dsh-purge → 环境适配，填写路径或选整包文件夹自动分配；也可确认暂不配置后继续对话。'
  }

  return {
    ok: true,
    ready,
    reason,
    message,
    kali: !!kaliInfo.kali,
    kaliSource: kaliInfo.source,
    kaliDetail: kaliInfo.detail,
    skipped,
    configured: savedPaths,
    found,
    missing: missingItems.length,
    total: tools.length,
    foundIds: foundItems.map((t) => t.id),
    missingIds: missingItems.map((t) => t.id),
  }
}

export function markEnvAdaptSkip(root, skip = true) {
  savePlatformConfig({ envAdaptSkip: !!skip }, root)
  return envAdaptStatus(root)
}

/* ------------------------------------------------------------------ *
 * 运行时检测与获取指引
 *
 * 设计约束：
 *   · 探测只跑「打印版本号」这类只读命令，带超时，绝不改本机任何东西；
 *   · 本插件的红线是不替用户下载/安装工具（见 skills/redteam/redteam-setup.md），
 *     所以这里**只生成可复制的命令文本**，不执行；
 *   · 当前平台由 cfg.platform 决定，命令按 linux / darwin / windows 分派。
 * ------------------------------------------------------------------ */

/** 归一化出 shell 平台名。 */
export function shellPlatformOf(cfg) {
  const p = (cfg && cfg.platform) || 'auto'
  if (p === 'windows') return 'windows'
  if (p === 'linux') return 'linux'
  if (osPlatform() === 'win32') return 'windows'
  if (osPlatform() === 'darwin') return 'darwin'
  return 'linux'
}

/** 只读探测一个命令的版本。失败一律返回 found:false，不抛错。 */
function probeCommand(cmd, timeoutMs = 5000) {
  const text = String(cmd || '').trim()
  if (!text) return { found: false }
  /* 探测命令必须是「命令 + 参数」形式，禁止管道/重定向，避免注入与副作用。 */
  if (/[|&;<>`$]/.test(text)) return { found: false, error: '探测命令含不允许的字符' }
  try {
    const r = spawnSync(text, {
      shell: true,
      timeout: timeoutMs,
      windowsHide: true,
      encoding: 'utf8',
    })
    if (r.error || r.status !== 0) return { found: false }
    const out = String(r.stdout || '') + String(r.stderr || '')
    const first = out.split('\n').map((x) => x.trim()).filter(Boolean)[0] || ''
    return { found: true, version: first.slice(0, 120) }
  } catch (error) {
    return { found: false, error: error && error.message ? error.message : String(error) }
  }
}

/**
 * 检测所有运行时依赖。
 * @returns {Promise<Array>} 每项 { id, label, found, version, need, optional, install }
 */
export function detectRuntimes(options = {}) {
  const root = options.root || redteamRoot()
  const cfg = options.config || loadPlatformConfig(root)
  const shell = shellPlatformOf(cfg)
  return RT_CATALOG.map((rt) => {
    const cmds = []
    if (shell === 'windows' && rt.winProbe) cmds.push(rt.winProbe)
    cmds.push(rt.probe)
    if (rt.probe2) cmds.push(rt.probe2)
    let hit = { found: false }
    for (const c of cmds) {
      hit = probeCommand(c)
      if (hit.found) break
    }
    const installCmd = (rt.install && (rt.install[shell] || rt.install.linux)) || ''
    return {
      id: rt.id,
      label: rt.label,
      found: !!hit.found,
      version: hit.version || '',
      need: rt.need || '',
      optional: !!rt.optional,
      install: installCmd,
    }
  })
}

/**
 * 环境检测总报告：运行时 + 工具 + 缺失项的获取指引。
 * 这是「环境适配」页与 redteam_preflight 共用的数据源。
 */
export function environmentReport(options = {}) {
  const root = options.root || redteamRoot()
  const cfg = options.config || loadPlatformConfig(root)
  const shell = shellPlatformOf(cfg)
  const toolkitDir = toolkitDirOf(cfg, root)
  const tools = resolveAllTools({ root, config: cfg })
  const runtimes = detectRuntimes({ root, config: cfg })
  const rtById = new Map(runtimes.map((r) => [r.id, r]))

  const missingRuntimes = runtimes.filter((r) => !r.found && !r.optional)
  const optionalMissing = runtimes.filter((r) => !r.found && r.optional)

  /* 只有「工具缺失 且 它的非可选运行时也缺失」才需要先装运行时；
     工具缺失但运行时齐备，直接给工具本身的获取命令。 */
  const items = tools.map((t) => {
    const meta = TK_CATALOG.find((x) => x.id === t.id) || {}
    const need = (meta.runtime || []).map((rid) => rtById.get(rid)).filter(Boolean)
    const blockedBy = need.filter((r) => !r.found && !r.optional)
    const g = (meta.get && (meta.get[shell] || meta.get.linux)) || {}
    return {
      id: t.id,
      label: t.label || meta.label || t.id,
      found: !!t.path,
      path: t.path || '',
      source: t.source,
      note: t.note || '',
      targetDir: join(toolkitDir, tkDirName(t.id)),
      version: meta.version || '',
      page: meta.page || '',
      kind: meta.kind || 'binary',
      optional: !!meta.optional,
      runtime: need.map((r) => ({ id: r.id, label: r.label, found: r.found, version: r.version })),
      blockedBy: blockedBy.map((r) => ({ id: r.id, label: r.label, install: r.install })),
      get: { shell: g.shell || '', cmd: g.cmd || '' },
      verify: meta.verify || '',
    }
  })

  const missing = items.filter((i) => !i.found)
  return {
    ok: true,
    shell,
    toolkitDir,
    configPath: configPathOf(root),
    runtimes,
    missingRuntimes,
    optionalMissing,
    tools: items,
    missingTools: missing,
    foundCount: items.length - missing.length,
    total: items.length,
    /* 给面板与 preflight 直接可用的一段摘要 */
    summary: (items.length - missing.length) + '/' + items.length + ' 个工具可用'
      + (missingRuntimes.length ? '，缺 ' + missingRuntimes.length + ' 项运行时依赖' : ''),
  }
}

/**
 * 生成「这个工具该放哪、怎么装」的可复制文本。
 * 用户点面板上的复制按钮，拿到的就是这段。
 */
export function toolSetupText(id, options = {}) {
  const root = options.root || redteamRoot()
  const cfg = options.config || loadPlatformConfig(root)
  const shell = shellPlatformOf(cfg)
  const meta = TK_CATALOG.find((x) => x.id === id)
  if (!meta) return { ok: false, error: '未知工具：' + id }
  const toolkitDir = toolkitDirOf(cfg, root)
  const dir = join(toolkitDir, tkDirName(id))
  const g = (meta.get && (meta.get[shell] || meta.get.linux)) || {}
  const sep = shell === 'windows' ? '\\' : '/'
  const target = join(toolkitDir, tkDirName(id))
  const lines = [
    '# ' + meta.label + (meta.version ? '（核对版本 ' + meta.version + '）' : ''),
    '# 目标目录：' + target,
    '# 来源：' + (meta.page || meta.repo || ''),
    '',
    '# 1) 建目录',
    shell === 'windows'
      ? 'mkdir "' + target + '"'
      : 'mkdir -p "' + target + '"',
    '',
    '# 2) 获取（' + (g.shell || '见来源页') + '）',
    /* 把命令里的 $TOOLKIT / %TOOLKIT% 占位换成真实路径，用户可直接粘贴 */
    String(g.cmd || '').split('$TOOLKIT').join(toolkitDir).split('%TOOLKIT%').join(toolkitDir),
    '',
  ]
  if (meta.verify) lines.push('# 3) 验证', meta.verify.split('$TOOLKIT').join(toolkitDir), '')
  if (meta.note) lines.push('# 说明', '# ' + String(meta.note).replace(/\n/g, '\n# '), '')
  lines.push('# 完成后再跑一次 redteam_preflight 确认已被识别。')
  /* mode：能不能一键装（auto = 官方命令可直接执行；manual = 只有人工下载页）。
     面板据此决定「一键安装」按钮是点得动还是灰的。 */
  const plan = installPlan(id, { root, config: cfg })
  return {
    ok: true,
    id,
    label: meta.label,
    dir: target,
    sep,
    page: meta.page || '',
    version: meta.version || '',
    kind: meta.kind || 'binary',
    mode: plan.ok ? plan.mode : 'manual',
    requires: plan.ok ? plan.requires : [],
    needsSudo: plan.ok ? !!plan.needsSudo : false,
    text: lines.join('\n'),
  }
}

/* ------------------------------------------------------------------ *
 * 一键安装 / 一键卸载（1.0.12）
 *
 * 与老红线的关系（读代码前先看这段，别误以为"红线没了"）：
 *   · 命令的**事实来源仍然只有 toolkit-catalog.js**：op 只接收工具 id，
 *     前端传不了任意命令，安装脚本由后端按 catalog 生成；
 *   · **启动时零下载**这条没变 —— 安装只发生在用户点「一键安装」时
 *     （POST /redteam/api，且校验本机回环来源）；
 *   · 点安装前**强制先做环境检测**：平台 / 发行版 / 包管理器 / 权限（sudo 能否免密）
 *     / 工具依赖的运行时 / curl·unzip·tar 等下载解压工具 / 联网。检测不过就不执行，
 *     把命令交回用户自己跑（`toolSetupText`）。
 * ------------------------------------------------------------------ */

/** 包管理器：探测命令 + 安装命令前缀（用于提示与降级建议）。 */
const PKG_MANAGERS = [
  { id: 'apt', cmd: 'apt-get', label: 'APT（Debian / Ubuntu / Kali）', family: ['kali', 'ubuntu', 'debian'] },
  { id: 'dnf', cmd: 'dnf', label: 'DNF（Fedora / RHEL 系）', family: ['fedora'] },
  { id: 'pacman', cmd: 'pacman', label: 'pacman（Arch 系）', family: ['arch'] },
  { id: 'apk', cmd: 'apk', label: 'APK（Alpine）', family: ['alpine'] },
  { id: 'zypper', cmd: 'zypper', label: 'zypper（openSUSE）', family: ['suse'] },
  { id: 'brew', cmd: 'brew', label: 'Homebrew（macOS）', family: ['darwin'] },
  { id: 'winget', cmd: 'winget', label: 'winget（Windows）', family: ['windows'] },
]

/**
 * 宿主命令探测表：id → 候选文件名 + 用途 + 分平台安装命令。
 * 与 RUNTIME_CATALOG 的区别：这些不是"工具的运行环境"，而是**装工具这件事本身**
 * 需要的系统命令（下载、解压、拉源码），所以不混进「工具清单」那 22 项里。
 */
const HOST_COMMANDS = [
  {
    id: 'curl', names: ['curl.exe', 'curl'], need: '下载 Release 资产',
    install: { linux: 'sudo apt install -y curl', darwin: '系统自带', windows: 'Win10+ 自带；缺了用 winget install --id cURL.cURL -e' },
  },
  {
    id: 'wget', names: ['wget.exe', 'wget'], need: '下载（curl 的替代品）',
    install: { linux: 'sudo apt install -y wget', darwin: 'brew install wget', windows: '（建议改用 curl）' },
  },
  {
    id: 'unzip', names: ['unzip.exe', 'unzip'], need: '解压 .zip 资产',
    install: { linux: 'sudo apt install -y unzip', darwin: '系统自带', windows: '系统自带（tar.exe）/ 或 Expand-Archive' },
  },
  {
    id: 'tar', names: ['tar.exe', 'tar'], need: '解压 .tar.gz 资产',
    install: { linux: 'sudo apt install -y tar', darwin: '系统自带', windows: 'Win10+ 自带' },
  },
  {
    id: 'git', names: ['git.exe', 'git'], need: '源码类工具（dirsearch / OneForAll）',
    install: { linux: 'sudo apt install -y git', darwin: 'brew install git', windows: 'winget install --id Git.Git -e' },
  },
  {
    id: 'python3', names: ['python3', 'python.exe', 'python'], need: 'Python 类工具与 venv',
    install: { linux: 'sudo apt install -y python3 python3-pip python3-venv', darwin: 'brew install python3', windows: 'winget install --id Python.Python.3.12 -e' },
  },
  {
    id: 'pipx', names: ['pipx', 'pipx.exe'], need: 'Python 包类工具的隔离安装（impacket）',
    install: { linux: 'sudo apt install -y pipx', darwin: 'brew install pipx', windows: 'python -m pip install --user pipx' },
  },
  {
    id: 'bash', names: ['bash.exe', 'bash'], need: '执行安装脚本（Linux / macOS）',
    install: { linux: '系统自带', darwin: '系统自带', windows: '（Windows 走 PowerShell）' },
  },
  {
    id: 'powershell', names: ['pwsh.exe', 'powershell.exe', 'powershell'], need: '执行安装脚本（Windows）',
    install: { linux: '', darwin: '', windows: '系统自带' },
  },
]

/** PATH 上有没有这个命令（只读，不 spawn）。 */
function commandExists(cmd, env = process.env) {
  if (!cmd) return false
  const names = osPlatform() === 'win32' ? [cmd + '.exe', cmd + '.cmd', cmd + '.bat', cmd] : [cmd]
  return !!findOnPath(names, env)
}

/** 读 /etc/os-release，拿不到就返回空壳。 */
function parseOsRelease() {
  const out = { id: '', idLike: [], name: '', version: '' }
  try {
    const text = readFileSync('/etc/os-release', 'utf8')
    for (const line of text.split('\n')) {
      const m = /^([A-Z_]+)=(.*)$/.exec(line.trim())
      if (!m) continue
      const value = m[2].replace(/^"|"$/g, '')
      if (m[1] === 'ID') out.id = value.toLowerCase()
      else if (m[1] === 'ID_LIKE') out.idLike = value.toLowerCase().split(/\s+/).filter(Boolean)
      else if (m[1] === 'PRETTY_NAME' || m[1] === 'NAME') out.name = out.name || value
      else if (m[1] === 'VERSION_ID') out.version = value
    }
  } catch { /* 非 Linux 或读不到 */ }
  return out
}

/** 发行版家族：决定"该用哪个包管理器 / apt 命令能不能直接用"。 */
function distroFamily(distro, kali, nodePlatform) {
  if (nodePlatform === 'win32') return 'windows'
  if (nodePlatform === 'darwin') return 'darwin'
  const id = String(distro.id || '').toLowerCase()
  const like = distro.idLike || []
  if (kali.kali || id === 'kali') return 'kali'
  if (id === 'ubuntu' || like.includes('ubuntu')) return 'ubuntu'
  if (id === 'debian' || like.includes('debian')) return 'debian'
  if (id === 'arch' || id === 'manjaro' || like.includes('arch')) return 'arch'
  if (['fedora', 'rhel', 'centos', 'rocky', 'almalinux', 'ol'].includes(id) || like.includes('fedora') || like.includes('rhel')) return 'fedora'
  if (id === 'alpine' || like.includes('alpine')) return 'alpine'
  if (id === 'opensuse' || id === 'sles' || like.includes('suse')) return 'suse'
  return 'linux-other'
}

/** sudo 是否可免密（只读探测；没有 sudo 或需要密码都返回 false）。 */
function probeSudo() {
  try {
    const r = spawnSync('sudo', ['-n', 'true'], { timeout: 4000, windowsHide: true, encoding: 'utf8' })
    return !!r && r.status === 0
  } catch {
    return false
  }
}

/**
 * 宿主画像：平台、发行版、包管理器、权限、下载解压工具。
 * 面板「环境适配」顶部与一键安装的装前检测都用它。
 */
export function hostProfile(options = {}) {
  const cfg = options.config || loadPlatformConfig(options.root)
  const shell = shellPlatformOf(cfg)
  const nodePlatform = osPlatform()
  const distro = nodePlatform === 'linux'
    ? parseOsRelease()
    : { id: nodePlatform, idLike: [], name: nodePlatform === 'win32' ? 'Windows' : 'macOS', version: '' }
  const kali = detectKali()
  const family = distroFamily(distro, kali, nodePlatform)
  const managers = PKG_MANAGERS.map((m) => ({
    id: m.id, label: m.label, cmd: m.cmd, present: commandExists(m.cmd), family: m.family,
  }))
  const usable = managers.filter((m) => m.present)
  const commands = {}
  for (const c of HOST_COMMANDS) {
    commands[c.id] = {
      id: c.id,
      need: c.need,
      found: c.names.some((n) => commandExists(n)),
      install: c.install,
    }
  }
  const uid = typeof process.getuid === 'function' ? process.getuid() : null
  const isRoot = uid === 0
  const sudoFound = commandExists('sudo')
  const passwordless = !isRoot && sudoFound ? probeSudo() : false
  const user = (() => {
    try { return process.env.USER || process.env.USERNAME || '' } catch { return '' }
  })()
  const label = (() => {
    if (family === 'windows') return 'Windows'
    if (family === 'darwin') return 'macOS'
    const name = distro.name || family
    return name + (distro.version ? ' ' + distro.version : '')
  })()
  return {
    ok: true,
    os: nodePlatform,
    shell,
    label,
    family,
    distro: { id: distro.id, idLike: distro.idLike, name: distro.name, version: distro.version },
    kali: !!kali.kali,
    kaliDetail: kali.detail || '',
    packageManagers: managers,
    presentManagers: usable.map((m) => m.id),
    commands,
    privilege: { user, isRoot, sudo: sudoFound, passwordless },
    /* 面板一句话摘要 */
    summary: label
      + (kali.kali ? '（Kali 系）' : '')
      + '｜包管理器：' + (usable.map((m) => m.id).join(' / ') || '未检测到')
      + '｜权限：' + (isRoot ? 'root' : (sudoFound ? (passwordless ? 'sudo 免密' : 'sudo 需密码') : '普通用户')),
  }
}

/** 合并两条"宿主命令"检测：脚本里用到哪些系统命令。 */
function requiredHostCommands(execLines, shell) {
  const text = execLines.join('\n')
  const need = []
  for (const c of HOST_COMMANDS) {
    if (c.id === 'powershell' && shell !== 'windows') continue
    if (c.id === 'bash' && shell === 'windows') continue
    const probe = c.id === 'python3' ? /(^|[^\w-])(python3|python)([\s.]|$)/ : new RegExp('(^|[^\\w-])' + c.id + '([^\\w-]|$)')
    if (probe.test(text)) need.push(c.id)
  }
  return need
}

/**
 * 某个工具的安装计划：模式（auto / manual）、要跑的脚本、需要哪些系统命令。
 * 不执行任何东西，纯计算。
 */
export function installPlan(id, options = {}) {
  const root = options.root || redteamRoot()
  const cfg = options.config || loadPlatformConfig(root)
  const shell = shellPlatformOf(cfg)
  const meta = TOOL_BY_ID.get(String(id || ''))
  if (!meta) return { ok: false, error: '未知工具：' + String(id) }
  const toolkitDir = toolkitDirOf(cfg, root)
  const targetDir = join(toolkitDir, tkDirName(meta.id))
  const g = (meta.get && (meta.get[shell] || meta.get.linux)) || {}
  const script = String(g.cmd || '')
  const lines = script.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const execLines = lines.filter((l) => !l.startsWith('#') && !l.startsWith('//'))
  const mode = execLines.length > 0 ? 'auto' : 'manual'
  const requires = requiredHostCommands(execLines, shell)
  return {
    ok: true,
    id: meta.id,
    label: meta.label,
    shell,
    mode,
    kind: meta.kind || 'binary',
    version: meta.version || '',
    page: meta.page || meta.repo || '',
    repo: meta.repo || '',
    note: meta.note || '',
    verify: meta.verify || '',
    toolkitDir,
    targetDir,
    dirName: tkDirName(meta.id),
    script,
    execLines,
    requires,
    needsSudo: /(^|\n)\s*sudo\s/.test(script),
    get: { shell: g.shell || '', cmd: script },
  }
}

/** 探测能否连上 GitHub（只读；没有 curl/wget 就跳过，不算失败）。 */
export async function probeNetwork(options = {}) {
  const host = options.host || hostProfile(options)
  const curl = host.commands.curl && host.commands.curl.found
  const wget = host.commands.wget && host.commands.wget.found
  if (!curl && !wget) {
    return { checked: false, ok: false, note: '本机没有 curl / wget，无法测联网（安装命令大多需要它，先装 curl）' }
  }
  const url = 'https://github.com/'
  const r = curl
    ? await runProcess('curl', ['-sS', '-I', '--max-time', '6', '-o', process.platform === 'win32' ? 'NUL' : '/dev/null', url], { timeoutMs: 12000 })
    : await runProcess('wget', ['-q', '--spider', '--timeout=6', url], { timeoutMs: 12000 })
  const ok = r.code === 0 && !r.timedOut
  return {
    checked: true,
    ok,
    via: curl ? 'curl' : 'wget',
    seconds: r.seconds,
    note: ok
      ? '能连上 GitHub（下载走它）'
      : '连不上 GitHub：装之前先解决出网/代理（看「出网状态」一栏），或改装国内镜像',
    error: ok ? '' : trimLog(r.err || r.out, 300),
  }
}

/**
 * 点「一键安装」**之前**的环境检测。
 * 返回 checks（逐项结论）+ blockers（拦住安装的硬条件）+ warnings（能装但要提醒）。
 */
export async function installPreflight(id, options = {}) {
  const root = options.root || redteamRoot()
  const cfg = options.config || loadPlatformConfig(root)
  const plan = installPlan(id, { root, config: cfg })
  if (!plan.ok) return plan
  const host = hostProfile({ root, config: cfg })
  const runtimes = detectRuntimes({ root, config: cfg })
  const meta = TOOL_BY_ID.get(plan.id) || {}
  const needRuntime = (meta.runtime || []).map((rid) => runtimes.find((r) => r.id === rid)).filter(Boolean)
  const missingRuntime = needRuntime.filter((r) => !r.found && !r.optional)
  const current = resolveTool(plan.id, { root, config: cfg })
  const missingCmd = plan.requires.filter((cid) => host.commands[cid] && !host.commands[cid].found)
  const sudoNeeded = plan.needsSudo && !host.privilege.isRoot
  const sudoOk = !sudoNeeded || host.privilege.passwordless
  const network = options.skipNetwork === true
    ? { checked: false, ok: false, note: '（跳过联网检测）' }
    : await probeNetwork({ root, config: cfg, host })

  const checks = [
    {
      key: 'platform',
      label: '平台识别',
      ok: true,
      detail: host.summary,
    },
    {
      key: 'mode',
      label: '官方获取方式',
      ok: plan.mode === 'auto',
      detail: plan.mode === 'auto'
        ? '官方有可执行的获取命令（' + (plan.get.shell || '见来源页') + '）'
        : '官方只提供人工下载页，装不了 —— 需要自己下：' + plan.page,
    },
    {
      key: 'runtime',
      label: '工具依赖的运行环境',
      ok: missingRuntime.length === 0,
      detail: needRuntime.length === 0
        ? '零依赖（静态二进制）'
        : needRuntime.map((r) => r.label + (r.found ? ' 已装' : (r.optional ? '（可选，缺）' : ' 缺'))).join(' / '),
      fix: missingRuntime.map((r) => ({ label: r.label, cmd: r.install || '' })),
    },
    {
      key: 'hostCommands',
      label: '下载 / 解压等系统命令',
      ok: missingCmd.length === 0,
      detail: plan.requires.length === 0
        ? '这一步不需要额外系统命令'
        : plan.requires.map((cid) => cid + (host.commands[cid].found ? ' 有' : ' 缺')).join(' / '),
      fix: missingCmd.map((cid) => ({
        label: cid,
        cmd: (host.commands[cid].install && (host.commands[cid].install[host.shell] || host.commands[cid].install.linux)) || '',
      })),
    },
    {
      key: 'privilege',
      label: '权限',
      ok: sudoOk,
      detail: !sudoNeeded
        ? (host.privilege.isRoot ? 'root 身份，无需 sudo' : '普通用户身份即可完成（不写系统目录）')
        : (host.privilege.passwordless
          ? '需要 sudo，本机 sudo 免密，可直接执行'
          : '需要 sudo 输密码：插件起不了交互终端，这一条装不了'),
      fix: sudoNeeded && !host.privilege.passwordless
        ? [{ label: 'sudo', cmd: '在终端里手动执行下面的命令（会提示输密码）' }]
        : [],
    },
    {
      key: 'network',
      label: '出网',
      ok: network.ok,
      detail: network.note,
    },
  ]
  const blockers = []
  if (plan.mode !== 'auto') blockers.push({ key: 'mode', detail: '官方只提供人工下载（' + (plan.page || '见来源页') + '）', fix: [] })
  if (missingRuntime.length > 0) {
    blockers.push({
      key: 'runtime',
      detail: '缺运行环境：' + missingRuntime.map((r) => r.label).join('、'),
      fix: missingRuntime.map((r) => ({ label: r.label, cmd: r.install || '' })),
    })
  }
  if (missingCmd.length > 0) {
    blockers.push({
      key: 'hostCommands',
      detail: '缺系统命令：' + missingCmd.join('、'),
      fix: missingCmd.map((cid) => ({
        label: cid,
        cmd: (host.commands[cid].install && (host.commands[cid].install[host.shell] || host.commands[cid].install.linux)) || '',
      })),
    })
  }
  if (!sudoOk) {
    blockers.push({
      key: 'privilege',
      detail: '这条命令要 sudo 输密码，插件不带交互终端（会挂住）',
      fix: [],
    })
  }
  const warnings = []
  if (current.path) warnings.push('本机已经找到这个工具（' + current.source + '：' + current.path + '），重装会覆盖工具箱里的同名文件')
  if (!network.ok && network.checked) warnings.push('出网检测没通过，下载可能失败')
  if (plan.note) warnings.push(plan.note)

  const result = {
    ok: true,
    id: plan.id,
    label: plan.label,
    mode: plan.mode,
    kind: plan.kind,
    version: plan.version,
    page: plan.page,
    note: plan.note,
    verify: plan.verify,
    targetDir: plan.targetDir,
    toolkitDir: plan.toolkitDir,
    script: plan.script,
    requires: plan.requires,
    needsSudo: plan.needsSudo,
    host,
    checks,
    blockers,
    warnings,
    alreadyInstalled: !!current.path,
    currentPath: current.path || '',
    currentSource: current.source,
    canInstall: plan.mode === 'auto' && blockers.length === 0,
    network,
  }
  /* 面板要"看得见要跑什么"：把真正会交给 shell 的脚本一并返回，前端不再自己拼。 */
  result.installScript = plan.mode === 'auto' ? buildInstallScript(result) : ''
  return result
}

/** 组装真正交给 shell 的安装脚本（catalog 命令 + 前置建目录 + TOOLKIT 变量）。 */
function buildInstallScript(pre) {
  const notes = [
    '# dsh-purge 一键安装：' + pre.label + (pre.version ? '（核对版本 ' + pre.version + '）' : ''),
    '# 目标目录：' + pre.targetDir,
    '# 来源：' + (pre.page || ''),
  ]
  /* sudo 一律加 -n：非交互模式下有密码就直接失败，绝不挂住等输入 */
  const body = String(pre.script || '').replace(/^([ \t]*)sudo[ \t]+/gm, '$1sudo -n ')
  if (pre.host.shell === 'windows') {
    const dir = String(pre.targetDir).replace(/"/g, '""')
    return notes.concat([
      '$ErrorActionPreference = "Stop"',
      '$env:TOOLKIT = "' + dir + '"',
      'New-Item -ItemType Directory -Force -Path $env:TOOLKIT | Out-Null',
      body,
      'Write-Output "[dsh-purge] 安装步骤执行完毕，目标目录：$env:TOOLKIT"',
    ]).join('\n')
  }
  const q = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'"
  return notes.concat([
    'set -e',
    'export TOOLKIT=' + q(pre.toolkitDir),
    'mkdir -p ' + q(pre.targetDir),
    body,
    'echo "[dsh-purge] 安装步骤执行完毕，目标目录：$TOOLKIT"',
  ]).join('\n')
}

/** 日志太长就掐中间（保留头尾，便于看下载进度与错误）。 */
function trimLog(text, limit = 8000) {
  const s = String(text || '')
  if (s.length <= limit) return s
  const head = s.slice(0, Math.floor(limit * 0.6))
  const tail = s.slice(-Math.floor(limit * 0.35))
  return head + '\n…（中间省略 ' + (s.length - head.length - tail.length) + ' 字符）…\n' + tail
}

/** 跑一个子进程，返回 `{ code, out, err, timedOut, seconds }`；绝不抛错。 */
function runProcess(file, args, options = {}) {
  const timeoutMs = Math.min(Math.max(Number(options.timeoutMs) || 60000, 1000), 30 * 60 * 1000)
  const started = Date.now()
  return new Promise((resolveResult) => {
    let child = null
    const done = (value) => resolveResult(value)
    try {
      child = spawn(file, args, {
        cwd: options.cwd || undefined,
        env: options.env || process.env,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (error) {
      done({ code: -1, out: '', err: String(error && error.message ? error.message : error), timedOut: false, seconds: 0 })
      return
    }
    let out = ''
    let errText = ''
    let settled = false
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL') } catch { /* ignore */ }
      finish({ code: -1, timedOut: true })
    }, timeoutMs)
    function finish(patch) {
      if (settled) return
      settled = true
      try { clearTimeout(timer) } catch { /* ignore */ }
      done(Object.assign({
        code: typeof patch.code === 'number' ? patch.code : -1,
        out,
        err: errText,
        timedOut: false,
        seconds: Math.round((Date.now() - started) / 100) / 10,
      }, patch))
    }
    if (child.stdout) child.stdout.on('data', (b) => { if (out.length < 200000) out += String(b) })
    if (child.stderr) child.stderr.on('data', (b) => { if (errText.length < 200000) errText += String(b) })
    child.on('error', (error) => finish({
      code: -1,
      err: 'spawn ' + file + ' 失败：' + (error && error.message ? error.message : String(error))
        + (options.cwd ? '（cwd=' + options.cwd + '）' : ''),
    }))
    child.on('close', (code) => finish({ code: typeof code === 'number' ? code : -1 }))
  })
}

/**
 * 执行「一键安装」。
 *
 * @returns `{ ok, verified, installedPath, log, ... }`；`ok` 表示**事后复检找到了可执行文件**，
 *          不是"脚本退出码为 0" —— 下载成功但解压到别处、或装完名字不对，都算没装好。
 */
export async function installTool(id, options = {}) {
  const root = options.root || redteamRoot()
  const cfg = options.config || loadPlatformConfig(root)
  const pre = options.preflight || await installPreflight(id, { root, config: cfg })
  if (!pre.ok) return pre
  if (pre.mode !== 'auto') {
    return {
      ok: false, id: pre.id, label: pre.label, mode: pre.mode, preflight: pre,
      error: '这个工具的官方发布页只给人工下载（' + (pre.page || '见来源页') + '），插件不代取。已保留可复制的命令。',
    }
  }
  if (pre.blockers.length > 0 && options.force !== true) {
    return {
      ok: false, id: pre.id, label: pre.label, preflight: pre, blocked: true,
      error: '环境检测没过：' + pre.blockers.map((b) => b.detail).join('；') + '。先把缺的补上，或用「复制安装命令」自己跑。',
    }
  }
  if (pre.alreadyInstalled && options.force !== true) {
    return {
      ok: false, id: pre.id, label: pre.label, preflight: pre, alreadyInstalled: true,
      error: '本机已经能找到它了（' + pre.currentSource + '：' + pre.currentPath + '）。要覆盖请先卸载或勾选强制重装。',
    }
  }
  const script = buildInstallScript(pre)
  const isWin = pre.host.shell === 'windows'
  const ps = commandExists('pwsh.exe') ? 'pwsh.exe' : 'powershell.exe'
  const file = isWin ? ps : 'bash'
  const args = isWin
    ? ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script]
    : ['-c', script]
  const env = Object.assign({}, process.env, {
    TOOLKIT: pre.toolkitDir,
    DSH_HOME: String(process.env.DSH_HOME || join(homedir(), '.dsh')),
  })
  /* 工具箱根必须先存在：spawn 的 cwd 指向不存在的目录时，子进程直接 ENOENT，
     日志里只会看到 "spawn bash ENOENT"，很难查到是 cwd 的问题。 */
  try { mkdirSync(pre.toolkitDir, { recursive: true }) } catch { /* 建不了就让脚本自己报错 */ }
  const run = await runProcess(file, args, {
    cwd: pre.toolkitDir,
    env,
    timeoutMs: options.timeoutMs || 15 * 60 * 1000,
  })
  const after = resolveTool(pre.id, { root, config: cfg })
  const log = trimLog([
    '$ ' + (isWin ? 'powershell' : 'bash') + ' -c "…（脚本见下方）"',
    script,
    '',
    run.out ? '--- stdout ---\n' + run.out : '',
    run.err ? '--- stderr ---\n' + run.err : '',
    run.timedOut ? '--- 超时被中止 ---' : '',
  ].filter(Boolean).join('\n'), 9000)
  return {
    ok: !!after.path,
    verified: !!after.path,
    id: pre.id,
    label: pre.label,
    mode: pre.mode,
    code: run.code,
    timedOut: !!run.timedOut,
    seconds: run.seconds,
    targetDir: pre.targetDir,
    installedPath: after.path || '',
    installedSource: after.source || '',
    log,
    verify: pre.verify || '',
    preflight: pre,
    error: after.path ? '' : '脚本跑完了但检测不到这个工具：确认下载是否成功（看日志），或按「复制安装命令」手动装。',
  }
}

/** 递归数文件数量与体积（给"删了什么"用；有上限，避免超大目录把面板卡住）。 */
function countTree(dir, limit = 5000) {
  let files = 0
  let bytes = 0
  let truncated = false
  const walk = (base) => {
    if (files >= limit) { truncated = true; return }
    let entries
    try { entries = readdirSync(base, { withFileTypes: true }) } catch { return }
    for (const ent of entries) {
      if (files >= limit) { truncated = true; return }
      const full = join(base, ent.name)
      let isDir = false
      try {
        isDir = typeof ent.isDirectory === 'function' ? ent.isDirectory() : statSync(full).isDirectory()
      } catch { continue }
      if (isDir) { walk(full); continue }
      files += 1
      try { bytes += statSync(full).size } catch { /* ignore */ }
    }
  }
  walk(dir)
  return { files, bytes, truncated }
}

/**
 * 执行「一键卸载」：只删 `${toolkitDir}/<工具目录>`，别的地方一概不碰。
 *
 * 反例（都要拒绝，且说清原因）：
 *   · 目标目录不存在 → 不删；
 *   · 工具当前来自 `binDirs` / `PATH` / 用户手填的绝对路径 → 插件不动它；
 *   · 目录名与清单不符 / 解析到工具箱之外 → 拒绝（防越界删除）。
 */
export function uninstallTool(id, options = {}) {
  const root = options.root || redteamRoot()
  const cfg = options.config || loadPlatformConfig(root)
  const meta = TOOL_BY_ID.get(String(id || ''))
  if (!meta) return { ok: false, error: '未知工具：' + String(id) }
  const toolkitDir = resolve(toolkitDirOf(cfg, root))
  const name = tkDirName(meta.id)
  const targetDir = resolve(join(toolkitDir, name))
  const rel = relative(toolkitDir, targetDir)
  if (!rel || rel.startsWith('..') || isAbsolute(rel) || rel !== name) {
    return { ok: false, id: meta.id, error: '拒绝卸载：目标不在工具箱目录内（' + targetDir + '）' }
  }
  /* frpc / frps 共用 frp 目录：删一个会连带另一个 */
  const sharedWith = TOOLKIT_CATALOG
    .filter((t) => t.id !== meta.id && tkDirName(t.id) === name)
    .map((t) => t.id)
  const current = resolveTool(meta.id, { root, config: cfg })
  const insideTarget = (p) => {
    if (!p) return false
    const r = relative(targetDir, resolve(p))
    return r === '' || (!r.startsWith('..') && !isAbsolute(r))
  }
  if (!existsSync(targetDir)) {
    return {
      ok: false,
      id: meta.id,
      label: meta.label,
      removed: false,
      targetDir,
      sharedWith,
      currentPath: current.path || '',
      currentSource: current.source,
      error: '工具箱里没有这个目录（' + targetDir + '）'
        + (current.path
          ? '；该工具当前来自 ' + current.source + '：' + current.path + ' —— 不在工具箱里，插件不动它'
          : '；本机也没检测到这个工具'),
    }
  }
  if (current.path && !insideTarget(current.path)) {
    return {
      ok: false,
      id: meta.id,
      label: meta.label,
      removed: false,
      targetDir,
      sharedWith,
      currentPath: current.path,
      currentSource: current.source,
      error: '当前用的是别处的那个（' + current.source + '：' + current.path + '）。删掉工具箱这份也轮不到它生效，'
        + '所以插件不删；要换用工具箱里的版本，先清掉「工具可执行文件」里填的路径。',
    }
  }
  const stats = countTree(targetDir)
  if (options.dryRun === true) {
    return {
      ok: true,
      dryRun: true,
      id: meta.id,
      label: meta.label,
      removed: false,
      willRemove: true,
      targetDir,
      files: stats.files,
      bytes: stats.bytes,
      truncated: stats.truncated,
      sharedWith,
      currentPath: current.path || '',
      currentSource: current.source,
    }
  }
  try {
    rmSync(targetDir, { recursive: true, force: true })
  } catch (error) {
    return {
      ok: false, id: meta.id, label: meta.label, removed: false, targetDir, sharedWith,
      error: '删除失败：' + (error && error.message ? error.message : String(error)),
    }
  }
  /* config 里指着"刚被删掉的路径"的条目顺手清掉，避免下次检测报"路径不存在" */
  let clearedConfig = false
  const configured = cfg.tools && typeof cfg.tools[meta.id] === 'string' ? cfg.tools[meta.id].trim() : ''
  if (configured && insideTarget(configured)) {
    try {
      savePlatformConfig({ tools: { [meta.id]: '' } }, root)
      clearedConfig = true
    } catch { /* 清不掉不影响删除结果 */ }
  }
  const after = resolveTool(meta.id, { root, config: loadPlatformConfig(root) })
  return {
    ok: true,
    id: meta.id,
    label: meta.label,
    removed: true,
    targetDir,
    files: stats.files,
    bytes: stats.bytes,
    truncated: stats.truncated,
    sharedWith,
    clearedConfig,
    stillFound: after.path || '',
    stillSource: after.source || '',
  }
}

export default {
  TOOL_CATALOG,
  TOOLKIT_CATALOG,
  RUNTIME_CATALOG,
  configPathOf,
  redteamRoot,
  loadPlatformConfig,
  savePlatformConfig,
  resolveTool,
  resolveAllTools,
  platformSummary,
  mergeConfigEnv,
  toolkitDirOf,
  nucleiTemplatesDirOf,
  detectKali,
  scanFolderForTools,
  assignToolkitFolder,
  envAdaptStatus,
  markEnvAdaptSkip,
  shellPlatformOf,
  detectRuntimes,
  environmentReport,
  toolSetupText,
  hostProfile,
  installPlan,
  installPreflight,
  installTool,
  uninstallTool,
  probeNetwork,
  toolDirName,
  runtimeNeedOf,
}
