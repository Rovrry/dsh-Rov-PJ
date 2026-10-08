# 二次开发注意事项

> 适用对象：在本仓库上继续开发的人（含 AI 编码助手）。
> 本仓库是 [YuJunZhiXue/dsh-purge](https://github.com/YuJunZhiXue/dsh-purge) 的**二次开发（fork）**，上游基线版本 **v1.1.62**（详见 README 的「一、📦 项目来源」）。

---

## 〇、给下一次对话：怎么接着开发

> **新开一轮对话 / 换一个编码助手时，先读这一节。** 这个仓库有几处「看代码看不出来」的约定，
> 不知道就会白改或改坏。

**第一件事：让助手读这个文件，然后跑一次体检。**

```sh
# 在仓库根目录
node --check client.js && node --check lib/update.js && echo "语法 OK"
grep -n "__DSH_PURGE_DRILL_BEGIN__\|__DSH_PURGE_DRILL_END__" client.js   # 标记必须在
node -p "require('./package.json').version"                              # 当前版本
```

**四条必须知道的硬约定：**

| 约定 | 一句话说明 | 违反的后果 |
|---|---|---|
| **演示台 UI 的源头不是 `client.js`** | `client.js` 里标记区间内是**生成物**，真源在 `lib/redteam/client.js` | 改 `client.js` 区间内 → 下次构建整段覆盖，白改 |
| **改完必须重建** | `node scripts/patch-client-dock.mjs` → `npm run build:client` | 不重建 → 源码改了但用户装的还是旧代码 |
| **版本号必须三段式且与日志首行一致** | `package.json` 的 `version` 与 `release-notes.md` **第一行** `# X.Y.Z` 完全相同 | 发布工作流直接失败（这是有意的防呆） |
| **发版 = 推 master** | 推上去自动打 tag、建 Release、打包 zip | — |

**最容易踩的三个坑（都真实发生过，详见第七节）：**

1. **改了源码没重建** → 产物与源码不一致，用户看到的还是旧行为。
2. **打了补丁的宿主再升级，新代码进不去** → `patch-client-dock.mjs` 的幂等守卫会整块跳过。
   该脚本已内置针对已知改动的**定点迁移**，但**新增改动需要自己补迁移**。
3. **新增文件没登记** → 发布包和「插件内更新」都不会带上它（见第三、七节两处登记点）。

**当前开发状态（截至 v1.0.10）：**

- 版本走 fork 自己的编号（`1.0.x`），**与上游 `1.1.x` 是两套编号，不要混淆**。
- 上游基线固定在 **v1.1.62**，README 里已标注，不要改成上游号。
- 已完成的大块：演练台 10 个页签、工具清单统一（22 工具 / 7 运行时）、
  「环境适配」页、全面浏览改页内全屏。

---

## 一、最重要的一条：有一段代码是「生成」的，手改会丢

`client.js` 里有 4000 多行是**构建产物**，由脚本从源文件重新生成写入。改错地方会在下次构建时被整段覆盖。

### 标记区间

```
client.js
├── 标记开始之前 ──────────── 手写，安全
├── /* __DSH_PURGE_DRILL_BEGIN__ */   ← 演练台区间开始
│      演练台（Drill）UI —— 生成产物，不要直接改
├── /* __DSH_PURGE_DRILL_END__   */   ← 演练台区间结束
└── 标记结束之后 ──────────── 手写，安全
```

定位标记（**不要记行号，行号会随编辑变动**）：

```bash
grep -n "__DSH_PURGE_DRILL_BEGIN__\|__DSH_PURGE_DRILL_END__" client.js
```

当前该区间约 4100 行，占 `client.js` 的一半左右。

### 判断表

| 你想改的地方 | 改哪里 | 说明 |
|---|---|---|
| 演练台 UI（区间内） | **`lib/redteam/client.js`** | 这才是源头。改完跑构建 |
| 清洗页 / 侧栏 / 设置页 / 文案 locale | `client.js` **标记区间之外** | 不会被构建覆盖 |
| 右侧双页签框架、授权弹窗、legal 页 | `scripts/patch-client-dock.mjs` | 它负责把页签和演练台骨架铺进 `client.js` |

> 一句话规则：**只要你的改动落在 `__DSH_PURGE_DRILL_BEGIN__` 和 `__DSH_PURGE_DRILL_END__` 之间，就必须改 `lib/redteam/client.js`，否则白改。**

---

## 二、五分钟地图

### 产物 vs 源

| 文件 | 性质 | 能直接改吗 |
|---|---|---|
| `client.js` | **构建产物**（根目录） | 只有标记区间**之外**能改 |
| `lib/redteam/client.js` | **源**，演练台 UI | ✅ 改这里 |
| `lib/default-prompt-inject.md` | 本地文件，**不在仓库里** | ❌ 拿不到 |
| `lib/asset-table.js` | 由上一项加密生成 | ❌ 生成物 |
| `docs/TOOLKIT.md` 的两张表 | 由脚本生成 | ❌ 改清单后重新生成 |

判断一个文件是不是生成物，最快的办法是看它有没有对应的 `scripts/*.mjs`。

### 构建脚本

| 命令 | 作用 | 注意 |
|---|---|---|
| `node scripts/patch-client-dock.mjs` | 把 `client.js` 改成右侧双页签，并嵌入演练台 UI 骨架、`docs/drill-auth-legal.html` | 会创建标记区间，是下一步的前置；**内含升级迁移逻辑** |
| `npm run build:client` | 把 `lib/redteam/client.js` 抽成片段，替换 `client.js` 的标记区间 | **要求标记已存在**，否则报 `client.js missing drill markers` |
| `node scripts/gen-toolkit-doc.mjs --write` | 从工具清单生成 `docs/TOOLKIT.md` 的两张表 | 改工具清单后必须重跑 |
| `npm run embed-prompt` | 从 `lib/default-prompt-inject.md` 生成 `lib/asset-table.js` | ⚠️ **本仓库跑不了**，见下 |

**构建顺序（顺序反了会报错）：**

```
patch-client-dock.mjs   →   build-client.mjs
   （先有标记）                （再填内容）
```

> `npm run build:client` **只**跑 `build-client.mjs`，不含补丁步骤。
> 改了注入脚本或需要跑迁移时，必须**手动**先跑 `patch-client-dock.mjs`。

### 两层「客户端代码」的关系（最容易绕晕的地方）

```
scripts/patch-client-dock.mjs
    ├─ 改 client.js 标记区间之外  →  右侧双页签、授权弹窗、清洗页
    └─ 改的是「宿主 @deepseek-ai 客户端」的那份代码

scripts/build-client.mjs
    └─ 把 lib/redteam/client.js 抽成片段，塞进 client.js 的标记区间
        并暴露成全局 __dshPurgeDrill
```

**两份代码通过全局 `__dshPurgeDrill` 通信**（见第四节）。改「谁能控制谁」的时候，
先确认你要改的是哪一层。

---

## 三、改代码 → 发版 全流程

### 场景 A：只改演练台界面

```sh
# 1. 改源文件
vim lib/redteam/client.js

# 2. 重建（顺序固定）
node --check lib/redteam/client.js
node scripts/patch-client-dock.mjs
npm run build:client

# 3. 确认产物对上了
node --check client.js
grep -c "你新增的关键字" client.js     # 必须 > 0

# 4. 发版（见场景 C）
```

### 场景 B：只改后端 / 文档 / 技能

不用重建 `client.js`（除非同时改了面板）。

```sh
node --check lib/redteam/ui.js         # 改哪个查哪个
# 改了技能或工具清单 → 同步生成物
node scripts/gen-toolkit-doc.mjs --write
```

### 场景 C：发版

```sh
# 1. 改版本号
vim package.json                       # "version": "1.0.8" → "1.0.9"

# 2. 同步改动日志首行（必须完全一致，否则工作流失败）
vim release-notes.md                   # 第一行必须是 "# 1.0.9"

# 3. 同步 README 里的展示版本号
#    README.md 与 README.en.md 各有一处 <strong>Version X.Y.Z</strong>

# 4. 提交推送
git add -A && git commit -m "fix(...): ..."
git push origin HEAD:master

# 5. 工作流自动完成：打 tag v1.0.9 → 建 Release → 打包 dsh-purge-1.0.9.zip
```

发布工作流的守卫（`.github/workflows/release.yml`，**都别绕**）：

```yaml
if: github.repository == 'Rovrry/dsh-Rov-PJ'      # 只在 fork 仓库触发
# 校验 release-notes.md 第一行 == "# <package.json version>"
```

### 版本号的三个作用

1. **检查更新的触发信号** —— `lib/update.js` 的 `describeLane()` **只比版本号，刻意不看提交号**
   （避免「更新→重启→再更新」死循环）。**只推代码不改版本号 → 插件不会提示有新版本。**
2. **过滤格式** —— 用 `/^\d+\.\d+\.\d+/` 过滤，所以**必须三段式**：写 `1.0` 会导致「最新版」判定失效。
3. `lib/update.js` 顶部的 `REPO` 决定从哪下载，已指向本 fork：

```js
const REPO = "Rovrry/dsh-Rov-PJ";   // 不要改回上游
const STABLE_REF = "master";
```

### 新增文件的**两处登记**（漏了不生效）

| 登记点 | 作用 |
|---|---|
| `package.json` 的 `files` | 决定**发布包**里有没有它 |
| `lib/update.js` 的 `COPY_NAMES` | 决定**插件内「检查更新」**会不会同步它 |

> 两处是独立的。只在 `files` 里加，发布包有、插件内更新没有 —— 这是真发生过的 bug（见第七节）。

---

## 四、演练台是怎么跑起来的

改面板之前建议先看这一节，否则很容易改到「看起来该生效但其实不生效」的位置。

### 挂载方式：往宿主槽位里注册

演练台 UI 通过 `ctx.slots.inject(...)` 注册到**宿主（`@deepseek-ai` 客户端）的槽位**。
当前用了三个：

| 槽位 | 用途 |
|---|---|
| `shell.overlay` | 演练台主面板（可浮动、可全屏） |
| `sidebar.footer.action` | 侧栏两个按钮：「RedTeam」「全面浏览」 |
| `conversation.session.header.utilities` | 会话标题栏的 RedTeam 按钮 |

> **这一点决定了「新窗口打开」为什么行不通**：新窗口会重新加载整个宿主前端，
> 槽位可能还没挂上，面板就渲染不出来。所以「全面浏览」是**当前窗口内的全屏**，不是新窗口。

### 前后端桥接：一个 POST 端点

前端只调一个接口：

```js
const api = (req) => fetch('/redteam/api', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(req),
})
```

后端注册在 `lib/redteam/ui.js`（`kind: 'exact'`，路径 `/redteam/api`），**分发链按顺序尝试，谁先返回非 `undefined` 就谁处理**：

| 顺序 | 处理者 | 负责的 op |
|---|---|---|
| 0 | 来源校验 | 回环一律放行；非回环要求 Origin 与 Host 同源 |
| 1 | `handlePlatformOp` | 平台/工具类，**同步**返回 |
| 2 | `handleAgentsOp` | 智能体 |
| 3 | `handleUpdateOp` | 版本与更新 |
| 4 | `handleSkillOp` | 技能库 / 知识库（失败时回退按插件目录直读文件） |
| 5 | `dispatchAsync(store, ...)` | 其余业务 op（资产、漏洞、会话、评分…） |

**平台类 op 的完整清单**（改「环境适配」页涉及）：

```
platformConfigGet      platformConfigSave       platformEnvAdaptStatus
platformEnvAdaptSkip   platformEnvironmentReport  platformToolSetup
version                updateCheck              setAgentsMax
skillCatalog           skillRead
```

**加一个新 op 的标准做法：**

1. 在 `handlePlatformOp`（或对应 handler）里加分支，**返回结果**；不认识就 `return undefined` 交给下一个。
2. 前端用 `api({ op: 'yourOp', ... })` 调用。
3. 两个 handler 都用 try/catch 包一下 —— 一个 op 抛错会变成整个请求 400。

### 全局桥：`__dshPurgeDrill`

`build-client.mjs` 把演练台模块包装后暴露成全局：

```js
const __dshPurgeDrill = (() => { /* ... */ })()
// 暴露：{ CSS, Panel, setUI, useUI, isFullWindow, setDockWidth }
```

**两个方向都在用它：**

- `patch-client-dock.mjs` 注入的清洗面板 → 调 `__dshPurgeDrill.setUI({ ... })` 打开/切换演练台。
- 演练台 UI 自身 → 通过它对外暴露 `Panel` 给外层 `embedded` 渲染。

> 想从「宿主那层」控制演练台，**唯一可用通道就是这个全局**。
> 注意 `patch-client-dock.mjs` 里有一份**同名占位声明**（默认空实现），那是给「演练台还没嵌进来」时兜底的。

### 前端状态

- `ui` 是模块级对象 + 订阅集合（`setUI` 通知所有 `useUI()` 订阅者），**不是** React Context。
  - 所以：在**任何**组件里调 `setUI` 都能切换面板状态，包括侧栏按钮。
- 面板尺寸存在 `localStorage`，只写在自己元素上，**不改宿主 frame 的宽度**。

---

## 五、README 的三个文件（改文档必看）

仓库首页（GitHub 落地页）显示的是 **`README.md`，内容为中文**。三个文件的分工：

| 文件 | 语言 | 作用 |
|---|---|---|
| **`README.md`** | 中文 | **主文档**，仓库首页显示的就是它 |
| `README.en.md` | 英文 | 英文版 |
| `README.zh-CN.md` | 中文 | **跳转页**，仅为旧链接保留，指向 `README.md` |

**仓库首页只放三块**（首页必须短，任何技术细节一律放进 `docs/`，不要往首页堆）：

```
一、📦 项目来源   ← 只保留版权与来源一行，不要展开成上游说明页
二、⚠️ 安装教程   ← 四条注意事项 + 一行命令 + 文档索引表
三、⚠️ 免责声明   ← 摘要 + 指向 docs/DISCLAIMER.md
```

**`docs/` 下的正文（这几份才是长文，改动都在这里做）：**

| 文件 | 内容 | 语言 |
|---|---|---|
| `docs/INSTALL.md` | 三步应用、各宿主差异、手动安装、交给助手安装、卸载 | 中文（顶部有英文入口） |
| `docs/USAGE.md` | 界面预览、使用命令、自己的服务器 | 中英双语 |
| `docs/REFERENCE.md` | 目录结构、本地校验、工作原理、还原、路径探测、版本与更新、说明 | 中英双语 |
| `docs/DISCLAIMER.md` | 零容忍条款与 10 条合规细则全文 | 中文（顶部有英文入口） |
| `docs/TOOLKIT.md` | 工具统一存放目录、运行环境依赖、官方获取命令 | 中文（表格**生成**，勿手改） |
| `docs/DEVELOPMENT.md` | 本文档 | 中文 |

**双语文件约定**：`USAGE.md` / `REFERENCE.md` 用 `<a id="english"></a>` 分隔中英两部分，
导航栏互相引用该锚点。新增英文内容时保持这个锚点存在，否则英文 README 的链接会断。

**首页不要出现的内容**：赞赏 / 打赏地址、致谢名单、上游说明大章节、完整合规条款正文、
以及任何技术参考章节（目录结构、工作原理等）。

**搬运注意事项**：把章节从根目录 README 移进 `docs/` 时，图片等相对路径要**去掉一层**
`docs/` 前缀（例如 `docs/preview/x.png` → `preview/x.png`）。移完必须跑链接校验。

**保留的锚点**：`<a id="strict-legal--compliance-disclaimer"></a>` 是旧链接兼容锚点，
改版时不要删（有外部链接指向它）。

**维护规则：**

1. **只维护 `README.md` 与 `README.en.md` 两份正文。** `README.zh-CN.md` 是固定的跳转页，
   不需要同步、不要往里写正文，也不要把它放进任何语言切换栏。
2. 改动主文档的**章节标题**时，同步更新「目录」里的锚点，以及文中指向该章节的链接。
   GitHub 锚点会去掉标点与 emoji，但**保留中文**并把空格转成连字符，例如
   `## 四、使用教程` → `#四使用教程`；带 `⚠️` 的标题因含变体选择符会多出一个连字符。
3. `README.md` 与 `README.en.md` 的 `Version X.Y.Z` 展示版本号要一起改（发布新版本时）。
4. 新增文件时记得登记两处：`package.json` 的 `files`、`lib/update.js` 的 `COPY_NAMES`。

---

## 六、关于 `embed-prompt`

`lib/default-prompt-inject.md`（默认提示词原文）**不随仓库发布**，被上游约定排除，本仓库也没有。

因此：

- **不要运行 `npm run embed-prompt`**，会直接抛 `missing local source`。
- **不要手改 `lib/asset-table.js`**，它是生成物，且被 `lib/table-key.js` 的解密逻辑读取。
  要换默认提示词，得先拿到那份 md 原文。
- 想改提示词内容，走插件的设置页/规则集，而不是改这两个文件。

---

## 七、验证与常见坑

### 提交前自检

```sh
# 语法（改到哪个查哪个）
node --check client.js
node --check lib/redteam/client.js
node --check lib/update.js

# 标记必须在（不在 = client.js 结构被破坏）
grep -n "__DSH_PURGE_DRILL_BEGIN__\|__DSH_PURGE_DRILL_END__" client.js

# 产物 vs 源 是否一致：搜你刚加的关键字，产物里必须也有
grep -c "你新增的关键字" client.js

# 版本号
node -p "require('./package.json').version"
head -1 release-notes.md    # 必须 == "# <上面那个版本>"
```

改了技能文档的话，额外查一下路径有没有写死（应统一用 `${TOOLKIT}`）：

```sh
grep -rn "~/.dsh/redteam/toolkit\|/redteam/toolkit/" skills/redteam/*.md
```

### 真实踩过的坑

| # | 现象 | 根因 | 怎么避免 |
|---|---|---|---|
| 1 | 改了演练台 UI，用户看到的还是旧行为 | 只改了 `lib/redteam/client.js`，没重建 | 改完必跑 `patch-client-dock.mjs` + `build:client`，再 grep 产物确认 |
| 2 | 打了补丁的宿主升级后，新代码没生效 | `patch-client-dock.mjs` 用「`PurgeDock` 已存在就整块跳过」做幂等，**整体跳过** | 新增改动要**自己补定点迁移**；脚本已对已知改动内置迁移 |
| 3 | 按文档装好工具，面板却显示"未找到" | 解析器只查 `toolkit/` 根目录和 `bin`/`tools` 等固定子目录，**不查 `toolkit/<工具名>/`** | 改解析逻辑时，**三种布局都要回归**：子目录 / 根目录平铺 / config 绝对路径 |
| 4 | 文件在发布包里，但「插件内更新」后没变化 | 只登记了 `package.json` 的 `files`，漏了 `lib/update.js` 的 `COPY_NAMES` | 新增文件**两处都登记**；目录型条目要同时在 `COPY_DIRS` 里 |
| 5 | 「全面浏览」开出新 dsh 页面，看不到演练台 | `window.open(同 URL + hash)` 等于在新窗口重载整个宿主，槽位没挂上 | 需要"更大视图"时用**页内状态**，不要开新窗口 |
| 6 | 面板改动一直不生效 | 宿主读的是**已加载的** `client.js` | 装/更新后必须**重开宿主**再点「应用」 |
| 7 | 文档链接/锚点失效 | 改了标题忘了同步锚点 | 改标题后全文搜一遍引用 |
| 8 | 命令行卸载「提示完成」，插件文件却原地不动 | `uninstallPurge()` 只把路径收进 `report.cleanup`，真正删除交给重启助手；而助手**先等端口释放**，CLI 没有宿主可结束 → 永远等下去。GUI 路径有 `scheduleCleanupRestart(...)`，**CLI 分支漏了** | 卸载要**自己先删一遍**（`removeCleanupDirs`），残留才交给助手。见第十节 |
| 9 | 卸载后 `dsh plugin ls` 仍列出插件 | 插件在 `package.json` 里注册**两处**：`dependencies` 和 `dsh.profile.bundles`；`ls` 读的是后者。另有 3 个 pnpm 状态文件 | 卸载要清**全部 六处**；只清 `dependencies` 不够。见第十节 |
| 10 | 孤儿 `.dshpurge.bak` 永远清不掉 | 清理函数用了 `fsp.readdir`，但 `hostFs.promises` **只暴露 6 个方法、没有 `readdir`**；抛出的 TypeError 被 `try/catch { continue }` 静默吞掉，函数一声不响什么都没做 | **`hostFs.promises` 只有 `readFile/writeFile/mkdir/unlink/rm/copyFile`**，其余一律用同步 API。`catch { continue }` 这种写法必须自查是否吞掉了真错误 |

### 改「工具清单」的完整流程

清单是唯一事实来源：`lib/redteam/toolkit-catalog.js`。

```sh
vim lib/redteam/toolkit-catalog.js          # 加/改工具
node scripts/gen-toolkit-doc.mjs --write    # 同步 docs/TOOLKIT.md 两张表
node --check lib/redteam/toolkit-catalog.js # 语法
npm run build:client                        # 面板里也用到清单
```

**注意 `frpc` / `frps` 是两个 id 共享一个 `dir: 'frp'`** —— 这是为了兼容已发出的 `config.json`，
不要「顺手合并」成一个 id。

### 验真习惯（重要）

这个仓库的多数改动**没法靠读代码确认对错**，必须实跑：

- 改了**安装/打包** → 把产物下载下来**解包**，逐个确认文件真的在（别只看工作流绿了）。
- 改了**解析/检测** → 造真实样本跑一遍，并且**做反例回归**（老用法不能被破坏）。
- 改了**前端** → 至少把状态机抽出来在 Node 里跑一遍；能开浏览器验证最好。
- 改了**删除/卸载** → 必须**实测删干净了没**，并**构造反例**（内容不同 / 目标缺失时**绝不能删**）。

> 别用「看起来应该对」交差。本仓库历史上第 3、4 条 bug 都是「读代码觉得没问题」的类型，
> 实跑才发现。

---

## 八、不要改的文件

| 文件 | 原因 |
|---|---|
| `lib/official-update.js`<br>`lib/official-update.wscript` | 给官方 DSH 桌面端打补丁 / 官方更新握手逻辑。改坏会影响插件自身更新，且 wscript 必须是**纯 ASCII**（含中文注释会触发 `official update script is not ASCII`） |
| `lib/update.js` 顶部的 `REPO` | 已指向本 fork。改回上游会导致「插件内更新」用上游文件覆盖本仓库全部改动 |
| `lib/asset-table.js` | 生成物，见第六节 |
| `client.js` 标记区间内 | 生成物，见第一节 |
| `lib/table-key.js`<br>`lib/capability-protocol.js` | 加解密 / 能力协议底层，改动会导致已发出的 `asset-table.js` 解不开 |

---

## 九、工具目录与运行时约定

**单一根目录**：所有外部工具放 `${toolkitDir}`（默认 `$DSH_HOME/redteam/toolkit`）下的
`<工具名>/` 子目录。技能正文**不得写死绝对路径**，统一用 `${TOOLKIT}` 指代根目录，
并在文件顶部放路径约定说明（见任一已迁移的技能）。

**清单是唯一事实来源**：`lib/redteam/toolkit-catalog.js` 定义每个工具的
`names`（候选文件名）、`dir`（存放子目录）、`version`、`runtime`（运行环境依赖）、
`page`（官方发布页）、`get`（分平台获取命令）。改工具或加工具都改这里，然后：

```sh
node scripts/gen-toolkit-doc.mjs --write   # 同步 docs/TOOLKIT.md 的两张表
npm run build:client                        # 若同时改了面板
```

**运行时检测**：`platform-config.js` 的 `detectRuntimes()` 只跑「打印版本号」的只读命令，
带 5 秒超时，且拒绝含 `` | & ; < > ` $ `` 的命令文本（防注入）。探测**绝不修改本机**。

**红线**：插件不替用户下载或安装任何工具。所有获取命令只是**文本**，
由 `toolSetupText()` 生成、用户自己复制执行。这条既是安全边界，
也是避免被代码托管平台判为"安装后自动下载渗透二进制"的前提。

---

## 十、卸载与还原：机制、六处注册、以及为什么容易「假成功」

> **这一节是踩坑重灾区。** 卸载类改动最容易「提示成功但没生效」，因为失败被吞掉了。

### 两个方向，别搞混

| 方向 | 做什么 | 入口 |
|---|---|---|
| **还原（revert）** | 把打过补丁的宿主文件**恢复成原版**（用旁边的 `.dshpurge.bak`） | `dsh-purge --revert` |
| **卸载（uninstall）** | 还原 + 从 profile **摘掉注册** + **删掉插件文件** | `dsh-purge --uninstall`、GUI 卸载 |

顺序是**先还原、再删文件**。这个顺序不能反：还原依赖插件自己的代码，插件目录先没了就没人还原了。

### 插件在 profile 里的「六处注册」

卸载必须清干净这六处，少一处就会「看起来卸载了但还在」：

```sh
# ① package.json 的 dependencies        ← 最容易清的一处
# ② package.json 的 dsh.profile.bundles ← dsh plugin ls 读的是这里！只清①会仍被列出
# ③ pnpm-lock.yaml
# ④ node_modules/.modules.yaml          ← pnpm 的安装状态
# ⑤ node_modules/.pnpm/lock.yaml
# ⑥ node_modules/.package-map.json
```

`dsh plugin --profile web ls` 读的是 **②**。所以「`dependencies` 里没有了、`ls` 还列着」是必然现象，不是缓存。

**插件文件 3 处**（这些是插件自己的，删掉不影响用户数据）：

```sh
~/.dsh/profiles/<profile>/node_modules/dsh-purge      # 插件本体
~/.dsh/profiles/<profile>/node_modules/.bin/dsh-purge # 软链
~/.dsh/dsh-purge                                      # 插件数据
```

**务必保留的用户数据**（不是插件文件）：

```sh
~/.dsh/redteam                  # 工具目录、config.json、用户装的红队工具
~/.dsh/.agent-presets/redteam   # 预设，插件会从 presets/ 重新生成
~/.dsh/prompt-inject.md         # 用户的提示词注入文件
```

### 为什么 CLI 卸载会「假成功」

```js
// lib/uninstall.js —— 修复前
report.cleanup = collectCleanupDirs(profiles, dshHome);  // 只是【收集路径】
return report;                                           // 然后就返回了，一个文件都没删
```

真正的删除在重启助手 `lib/uninstall-restart.js` 里，而它：

1. **先等宿主端口释放**（`waitFree()`），超时就 `process.exit(1)`；
2. 再删目录，然后重启宿主。

GUI 卸载能成功，是因为宿主**自己结束了自己**，端口随即释放。而 CLI 是**另一个进程**，它没有能力结束正在跑的 `dsh web` —— 于是助手一直等，文件一直不删。

**修复**（`removeCleanupDirs`）：卸载时**先立刻删一遍**，删成功的就不再依赖助手，删不掉的留在 `report.cleanup_failed` 交给助手兜底。两种入口都不会再「说完成了但文件还在」。

### 孤儿备份（orphan `.dshpurge.bak`）

`revertAll` 只遍历 `targetFiles(aiBase)` 里的路径。**老版本补丁集打过、新版本已移除**的文件不在清单里，它的 `.bak` 就没人管了 —— 实测在一个真实宿主上留下 5 个。

清理函数 `dropOrphanBackups` 的两条硬规矩：

- **只删与当前文件逐字节相同的备份。** 内容有差异 = 补丁可能还没还原 → **保留**并记进 `errors`。
- **目标文件不存在时保留备份**，不做任何删除。

扫描范围不能只取 `aiBase`：`targetFiles()` 里有 3 个目标在**兄弟命名空间** `node_modules/@earendil-works/pi-ai/...`（插件确实会打这三个文件）。所以扫描根从**真实目标路径**反推（向上找到以 `@` 开头的 scope 目录），而不是硬编码 `@earendil-works`。

### 写这类代码的三条纪律

1. **`catch { continue }` 是危险写法。** 第 10 条坑就是它把 `TypeError` 吞了，函数静默空转。吞异常前先确认「这里出错确实无所谓」。
2. **`hostFs.promises` 只有 6 个方法**（`readFile` / `writeFile` / `mkdir` / `unlink` / `rm` / `copyFile`）。要 `readdir`、`statSync`、`existsSync` 等，用 `hostFs` 上的**同步**版本。
3. **卸载/删除类改动，必须自己验证「删干净了没」**，不能只看函数返回 `ok: true`：

```sh
# 验证脚本骨架：每一条都断言，不要只看输出「完成」
find ~/.dsh -name "*.dshpurge.bak" | wc -l          # 期望 0
grep -c dsh-purge ~/.dsh/profiles/web/package.json  # 期望 0（两处都算）
dsh plugin --profile web ls | grep -qi purge && echo 仍在 || echo 已清
```

---

## 十一、署名与边界

- 二次开发不改变版权归属：原始代码、补丁集、默认提示词、演练台设计**均归上游作者所有**（MIT 协议）。
- 本仓库的独立版本号（`1.0.0` 起）是 fork 自己的编号，**不要**用它去覆盖或混淆上游的版本号；上游基线始终是 **v1.1.62**，README 中已固定标注。
- 新增功能请在 README 的「一、📦 项目来源」章节补一句说明，保持基线可追溯。
- 上游的「非盈利、禁止商业售卖与黑灰产牟利」约束同样适用于本 fork，见 README 的免责声明。

---

[← 返回仓库首页](../README.md) | [安装教程](INSTALL.md) | [技术参考](REFERENCE.md)
