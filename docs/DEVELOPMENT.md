# 二次开发注意事项

> 适用对象：在本仓库上继续开发的人（含 AI 编码助手）。
> 本仓库是 [YuJunZhiXue/dsh-purge](https://github.com/YuJunZhiXue/dsh-purge) 的**二次开发（fork）**，上游基线版本 **v1.1.62**（详见 README 的「上游与二次开发」）。

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
| 演练台 UI（区间内） | **`lib/redteam/client.js`** | 这才是源头。改完跑 `npm run build:client` |
| 清洗页 / 侧栏 / 设置页 / 文案 locale | `client.js` **标记区间之外** | 不会被构建覆盖 |
| 右侧双页签框架、授权弹窗、legal 页 | `scripts/patch-client-dock.mjs` | 它负责把页签和演练台骨架铺进 `client.js` |

> 一句话规则：**只要你的改动落在 `__DSH_PURGE_DRILL_BEGIN__` 和 `__DSH_PURGE_DRILL_END__` 之间，就必须改 `lib/redteam/client.js`，否则白改。**

---

## 二、README 的三个文件（改文档必看）

仓库首页（GitHub 落地页）显示的是 **`README.md`，内容为中文**。三个文件的分工：

| 文件 | 语言 | 作用 |
|---|---|---|
| **`README.md`** | 中文 | **主文档**，仓库首页显示的就是它 |
| `README.en.md` | 英文 | 英文版 |
| `README.zh-CN.md` | 中文 | `README.md` 的**兼容副本**，为旧链接保留 |

**维护规则：**

1. `README.md` 与 `README.zh-CN.md` 必须**内容完全一致**，改完主文档后同步：
   ```bash
   cp README.md README.zh-CN.md
   ```
2. 改动主文档的**章节标题**时，同步更新「目录」里的锚点，以及文中指向该章节的链接。
3. 三个文件的 `<strong>Version X.Y.Z</strong>` 展示版本号要一起改（发布新版本时）。
4. 新增 README 文件时，记得同时登记到两处，否则发布/更新会漏掉它：
   - `package.json` 的 `files` 数组
   - `lib/update.js` 的 `COPY_NAMES` 数组

> 漏登记的后果：`release.yml` 打出的包和客户端「更新」拉取的内容里不会有该文件。

---

## 三、构建脚本

| 命令 | 作用 | 注意 |
|---|---|---|
| `npm run build:client` | 把 `lib/redteam/client.js` 抽成片段，替换 `client.js` 的标记区间 | **要求标记已存在**，否则报 `client.js missing drill markers` |
| `node scripts/patch-client-dock.mjs` | 把 `client.js` 改成右侧双页签，并嵌入演练台 UI 骨架、`docs/drill-auth-legal.html` | 会创建标记区间，是 `build:client` 的前置 |
| `npm run embed-prompt` | 从 `lib/default-prompt-inject.md` 生成 `lib/asset-table.js` | ⚠️ **本仓库跑不了**：该 md 是本地未发布文件，见下方说明 |

### 构建顺序

```
patch-client-dock.mjs   →   build-client.mjs
   （先有标记）                （再填内容）
```

### 关于 `embed-prompt`

`lib/default-prompt-inject.md`（默认提示词原文）**不随仓库发布**，被 `.npmignore` / 上游约定排除，本仓库也没有。而 `lib/asset-table.js` 是由它加密生成的。

因此：

- **不要运行 `npm run embed-prompt`**，会直接抛 `missing local source`。
- **不要手改 `lib/asset-table.js`**，它是生成物，且被 `lib/table-key.js` 的解密逻辑读取。要换默认提示词，得先拿到那份 md 原文。
- 想改提示词内容，走插件的设置页/规则集，而不是改这两个文件。

---

## 四、版本号与发版

版本号不是随便写的，**它同时是「检查更新」的触发信号和发布流程的开关**。

### 硬性格式：必须三段式 `X.Y.Z`

必须写 `1.0.0`，**不能写 `1.0`**。原因：`lib/update.js` 用 `/^\d+\.\d+\.\d+/` 过滤版本列表，两段式会导致「最新版」判定失效。

### 判断更新的依据是版本号，不是提交号

`lib/update.js` 的 `describeLane()` **只比较版本号**，刻意不看提交号（避免更新→重启→再更新的死循环）。

- 只推代码、不改版本号 → 插件**不会**提示有新版本
- 改了版本号 → 插件才提示可更新，并从**本仓库**（`Rovrry/dsh-Rov-PJ`）下载

更新通道常量在 `lib/update.js` 顶部：

```js
const REPO = "Rovrry/dsh-Rov-PJ";   // 指向本 fork，不要改回上游
const STABLE_REF = "master";
```

### 发版步骤

1. 改 `package.json` 的 `version`（如 `1.0.0` → `1.0.1`）
2. **同步**改 `release-notes.md` **第一行**为 `# 1.0.1`
3. 提交并推送到 `master`

推送后 `.github/workflows/release.yml` 会自动：建 tag `v1.0.1`、建 Release、打包 `dsh-purge-1.0.1.zip`。

> 工作流会校验 `release-notes.md` 首行与 `package.json` 版本号**完全一致**，不一致会直接失败。这是有意的防呆。

---

## 五、不要改的文件

| 文件 | 原因 |
|---|---|
| `lib/official-update.js`<br>`lib/official-update.wscript` | 给官方 DSH 桌面端打补丁 / 官方更新握手逻辑。改坏会影响插件自身更新，且 wscript 必须是**纯 ASCII**（含中文注释会触发 `official update script is not ASCII`） |
| `lib/update.js` 顶部的 `REPO` | 已指向本 fork。改回上游会导致「插件内更新」用上游文件覆盖本仓库全部改动 |
| `lib/asset-table.js` | 生成物，见上文 |
| `client.js` 标记区间内 | 生成物，见第一节 |
| `lib/table-key.js`<br>`lib/capability-protocol.js` | 加解密 / 能力协议底层，改动会导致已发出的 `asset-table.js` 解不开 |

---

## 六、提交前自检

```bash
node --check client.js            # 前端语法
node --check lib/update.js        # 更新逻辑语法
node -p "require('./package.json').version"   # 确认版本号是否符合预期
```

改了演练台 UI 的话，额外确认：

```bash
grep -n "__DSH_PURGE_DRILL_BEGIN__\|__DSH_PURGE_DRILL_END__" client.js
```

若标记消失，说明 `client.js` 结构被破坏，需重跑 `patch-client-dock.mjs`。

---

## 七、署名与边界

- 二次开发不改变版权归属：原始代码、补丁集、默认提示词、演练台设计**均归上游作者所有**（MIT 协议）。
- 本仓库的独立版本号（`1.0.0` 起）是 fork 自己的编号，**不要**用它去覆盖或混淆上游的版本号；上游基线始终是 **v1.1.62**，README 中已固定标注。
- 新增功能请在 README 的「上游与二次开发」章节补一句说明，保持基线可追溯。
- 上游的「非盈利、禁止商业售卖与黑灰产牟利」约束同样适用于本 fork，见 README 的免责声明。
