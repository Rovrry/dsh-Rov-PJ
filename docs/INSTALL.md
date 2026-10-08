# 安装与使用教程

> 本文件是 [README](../README.md) 的安装与使用教程详细版。

[← 返回仓库首页](../README.md) | [免责声明](DISCLAIMER.md)

---

## 安装与使用教程

现在只维护官方 `dsh web` 和官方桌面 EXE，**分开装、分开应用**。只装你正在打开的那一个。必须是 **dsh 0.2**。社区桌面端暂不维护；需要的话请单独开一个 issue。

| 你正在用 | profile | 安装 |
|---|---|---|
| 官方 `dsh web` | `web` | [Web](#web) |
| 官方 Harness 桌面 EXE | `desktop` | [官方桌面 EXE](#official-exe) |

`dsh` 不在 PATH、或不想走远程安装时，用 [手动安装](#manual)。

### 装完都要做完这三步

只把插件写进 profile **还不会**改 `@deepseek-ai`。

1. **退出并重新打开**刚装的那个宿主。Web 关掉 `dsh web` 再开；桌面端退出托盘，再打开对应的 exe。
2. 点会话标题旁的 **dsh-purge**，在右侧栏的 **清洗** 里点 **「应用」**。宿主的设置页里没有这个条目。
3. 点「应用」成功后会自动重启一次，让补丁进入当前进程。应用没做完不会重启。

> **macOS / Windows 官方桌面**：点「应用」会解开 `app.asar`，并修补官方 `dsh` 入口（asar 不在时改走 `app/`），同时补上 `app/runtime` 链接。若 `dsh.cmd` 里已有 `dsh-purge cli entry begin`，但写成了 `set "entry=%entry%"`，用当前版本再点一次「应用」会改回来。`app.asar` 还在、补丁只写在解开目录时，再点「应用」不会让当前进程读到那些补丁。

Web 的「应用 / 重启 / 卸载」只动 Web。桌面端的只动桌面应用，不会去拉 `dsh web`。不要在 Web 里点桌面端的应用，也不要反过来。

<a id="web"></a>

### Web

官方 `dsh` 需要在 PATH 上。没有就先装官方 CLI，或改走手动安装。

```sh
dsh plugin --profile web add https://github.com/Rovrry/dsh-Rov-PJ/archive/refs/heads/master.tar.gz
```

当前目录已经是本仓库时：

```sh
dsh plugin --profile web add .
```

然后按上面三步，点会话标题旁的 **dsh-purge**，在 **清洗** 里点「应用」。

<a id="desktop"></a>

### 社区桌面端

暂不维护。当前只支持官方 Web 和官方桌面 EXE。以后若要社区版，请单独开一个 issue，不要和这次的行为混在一起。

<a id="official-exe"></a>

### 官方桌面 EXE

已经安装 **DeepSeek Harness 官方桌面客户端** 时，用下面的命令，或点按钮走 `dsh://`。社区桌面端不维护，不要用这个协议去装它。当前只适配 **0.2.0-rc.2**。

```sh
dsh plugin --profile desktop add https://github.com/Rovrry/dsh-Rov-PJ/archive/refs/heads/master.tar.gz
```

官方桌面 0.2 读的 profile 是 `desktop`。不要改成 `default`，也不要改成 `git+https://github.com/yujunzhixue/dsh-purge.git`。git 地址会先跑 `git ls-remote`，失败后的 allowBuilds 提示可以忽略。

<p align="center">
  <a href="https://deepseek.stream/plugins/dsh-purge"><strong>🌐 打开插件市场页</strong></a>
  &nbsp;·&nbsp;
  <a href="dsh://plugin/install?id=dsh-purge&name=dsh-purge&version=1.0.1&repo=Rovrry%2Fdsh-Rov-PJ&permissions=%E7%B3%BB%E7%BB%9F%E6%8F%90%E7%A4%BA%E8%AF%8D%E6%B3%A8%E5%85%A5%2C%E6%9C%AC%E6%9C%BA%E8%A1%A5%E4%B8%81%2C%E8%AE%BE%E7%BD%AE%E9%A1%B5&downloadUrl=https%3A%2F%2Fgithub.com%2FRovrry%2Fdsh-Rov-PJ%2Farchive%2Frefs%2Fheads%2Fmaster.tar.gz"><strong>🚀 唤起客户端一键安装</strong></a>
</p>

🔗 **原生协议链接：**

```
dsh://plugin/install?id=dsh-purge&name=dsh-purge&version=1.0.1&repo=Rovrry%2Fdsh-Rov-PJ&permissions=%E7%B3%BB%E7%BB%9F%E6%8F%90%E7%A4%BA%E8%AF%8D%E6%B3%A8%E5%85%A5%2C%E6%9C%AC%E6%9C%BA%E8%A1%A5%E4%B8%81%2C%E8%AE%BE%E7%BD%AE%E9%A1%B5&downloadUrl=https%3A%2F%2Fgithub.com%2FRovrry%2Fdsh-Rov-PJ%2Farchive%2Frefs%2Fheads%2Fmaster.tar.gz
```

<details>
<summary><strong>协议参数和网页触发代码</strong></summary>

**网页端（前端）触发代码示例：**

```js
/**
 * 唤起 DeepSeek Harness 桌面客户端一键安装 dsh-purge
 */
export function installDshPurgeToDesktop() {
  const params = new URLSearchParams({
    id: 'dsh-purge',
    name: 'dsh-purge',
    version: '1.0.0',
    repo: 'Rovrry/dsh-Rov-PJ',
    permissions: '系统提示词注入, 本机补丁, 设置页',
    downloadUrl: 'https://github.com/Rovrry/dsh-Rov-PJ/archive/refs/heads/master.tar.gz',
  });

  const deepLink = `dsh://plugin/install?${params.toString()}`;

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = deepLink;
  document.body.appendChild(iframe);
  setTimeout(() => document.body.removeChild(iframe), 2000);
}
```

**HTML 静态链接方式：**

```html
<a href="dsh://plugin/install?id=dsh-purge&name=dsh-purge&version=1.0.1&repo=Rovrry%2Fdsh-Rov-PJ&permissions=%E7%B3%BB%E7%BB%9F%E6%8F%90%E7%A4%BA%E8%AF%8D%E6%B3%A8%E5%85%A5%2C%E6%9C%AC%E6%9C%BA%E8%A1%A5%E4%B8%81%2C%E8%AE%BE%E7%BD%AE%E9%A1%B5&downloadUrl=https%3A%2F%2Fgithub.com%2FRovrry%2Fdsh-Rov-PJ%2Farchive%2Frefs%2Fheads%2Fmaster.tar.gz">
  🚀 唤起客户端一键安装
</a>
```

**协议参数配置（dsh://plugin/install）：**

| 参数名 | 值 / 示例 | 说明 |
|---|---|---|
| id | `dsh-purge` | 插件唯一标识符 |
| name | `dsh-purge` | 插件展示名称 |
| version | `1.0.0` | 语义化版本号 |
| repo | `Rovrry/dsh-Rov-PJ` | GitHub 仓库 |
| permissions | `系统提示词注入, 本机补丁, 设置页` | 申请权限 |
| downloadUrl | `https://github.com/Rovrry/dsh-Rov-PJ/archive/refs/heads/master.tar.gz` | GitHub 源码包地址 |

</details>

然后完全退出官方客户端（含托盘），再打开，点会话标题旁的 **dsh-purge**，在「清洗」里点「应用」。

**官方桌面点「应用」即可（成功后会自动重启）。**

### 怎样算装上了

- 会话标题旁有 **dsh-purge**，点开后在「清洗」里能点「应用」
- 聊天里 `/purge status` 能打出 `DSH_HOME` 和补丁列表，路径应是你正在用的那一份
- 没装的可选包（例如梁神）显示跳过，不挡住应用完成

### 交给助手安装

把下面整段发给本机助手。它只执行安装命令：不要全盘搜索，不要改其它文件，不要代点「应用」，也不要重启。

<details>
<summary><strong>给 AI 助手（只安装）</strong></summary>

<!-- AI-AGENT-START -->

安装 DeepSeek Harness 插件 `dsh-purge`。先确认宿主，只装正在用的那一个。不要全盘搜索，不要读或改其它文件，不要应用设置，也不要重启应用。

**Web 端（官方 `dsh web`）**

`dsh` 不在 PATH 就告诉用户后停止。

```sh
dsh plugin --profile web add https://github.com/Rovrry/dsh-Rov-PJ/archive/refs/heads/master.tar.gz
```

当前目录已是本仓库时改用 `dsh plugin --profile web add .`。

**社区桌面端**

暂不维护。不要安装。需要的话请单独开一个 issue。

**官方 Harness 桌面 EXE**

```sh
dsh plugin --profile desktop add https://github.com/Rovrry/dsh-Rov-PJ/archive/refs/heads/master.tar.gz
```

官方桌面 0.2 读的 profile 是 `desktop`。不要改成 `default`，也不要改成 `git+https://github.com/yujunzhixue/dsh-purge.git`。git 地址会先跑 `git ls-remote`，失败后的 allowBuilds 提示可以忽略。

命令结束后，提醒：完全退出并重启刚装的那个宿主，再点会话标题旁的 **dsh-purge**，在「清洗」里点「应用」。Web 和桌面端不要交叉点应用。然后停止。

<!-- AI-AGENT-END -->

</details>

<a id="manual"></a>

### 手动安装

命令行装不上、官方 `dsh plugin add` 失败、或不想走远程包时，按下面做。只改**正在用的那个宿主**对应的 profile，不要删原有 bundle，不要同时改 Web 和桌面端。

**0. 先确认宿主，只动一个 profile**

| 你实际在用的 | 只改这个目录 | 不要改 |
|---|---|---|
| 官方 `dsh web` | `$DSH_HOME/profiles/web` | `desktop` |
| 官方 Harness 桌面 EXE | `$DSH_HOME/profiles/desktop` | `web` |

对应 `profiles/<名>/package.json` 还不存在时，先正常启动一次该宿主，让官方程序自己建好 profile，再继续。

**1. 找到真正在用的 `$DSH_HOME`**

认目录：名字是 `.dsh`（官方 EXE 偶见 `dsh-home`），里面有 `profiles`，并且至少有一个 `profiles/<名>/package.json`。

按这个顺序找，找到第一份能对上当前宿主的就用它：

| 顺序 | 安装形态 | 典型路径 |
|---|---|---|
| 1 | 环境变量 | `DSH_HOME`（已设置就用它） |
| 2 | Windows 便携 / 安装目录 | `dsh.cmd` 或 `npm-global` 旁边的 `.dsh`，例如 `<安装根>\.dsh` |
| 3 | 用户默认 | Windows `%USERPROFILE%\.dsh`；Linux / macOS `~/.dsh` |
| 4 | 官方桌面 EXE | `%APPDATA%\DeepSeek Harness\dsh-home`、`%LOCALAPPDATA%\DeepSeek Harness\dsh-home` |

Windows PowerShell 可先列出本机有哪些候选：

```powershell
$cands = @()
if ($env:DSH_HOME) { $cands += $env:DSH_HOME }
$cands += "$env:USERPROFILE\.dsh"
$dsh = Get-Command dsh -ErrorAction SilentlyContinue
if ($dsh) {
  $dir = Split-Path $dsh.Source
  $cands += @(
    (Join-Path $dir ".dsh"),
    (Join-Path (Split-Path $dir) ".dsh"),
    (Join-Path (Split-Path (Split-Path $dir)) ".dsh")
  )
}
$cands += @(
  "$env:APPDATA\DeepSeek Harness\dsh-home",
  "$env:LOCALAPPDATA\DeepSeek Harness\dsh-home"
)
$cands | Select-Object -Unique | Where-Object { $_ -and (Test-Path (Join-Path $_ "profiles")) }
```

怎么确认找对了：

- Web：`$DSH_HOME/profiles/web/package.json` 里 `"name"` 是 `dsh-profile-web`
- 官方 EXE：`$DSH_HOME/profiles/desktop/package.json` 里 `"name"` 是 `dsh-profile-desktop`

本机常有两份 `.dsh`（用户目录一份、安装目录一份）。便携包、安装目录里的官方 `dsh` **用安装根下那份**，不要改到空的 `%USERPROFILE%\.dsh`。改完下面步骤后，启动的必须是这份主目录对应的宿主。

**2. 把插件放到 `$DSH_HOME/plugins/dsh-purge`**

目标树必须长这样（目录名不能改）：

```
$DSH_HOME/
  plugins/
    dsh-purge/                 ← 必须叫 dsh-purge
      package.json             ← 里面 "name" 必须是 "dsh-purge"
      client.js
      cordis.patch.yml
      lib/
  profiles/
    web/package.json           ← 或 desktop
```

有 git 时：

```sh
mkdir -p "$DSH_HOME/plugins"
git clone https://github.com/Rovrry/dsh-Rov-PJ.git "$DSH_HOME/plugins/dsh-purge"
```

没有 git 时，下载 [master.tar.gz](https://github.com/Rovrry/dsh-Rov-PJ/archive/refs/heads/master.tar.gz)，解压后把里面的 `dsh-purge-master` **改名为** `dsh-purge`，再整夹放到 `plugins` 下。Windows PowerShell 示例（先把 `$home` 换成上一步找到的路径）：

```powershell
$home = $(if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE ".dsh" })
$plugins = Join-Path $home "plugins"
New-Item -ItemType Directory -Force -Path $plugins | Out-Null
$tmp = Join-Path $env:TEMP "dsh-purge-master.tar.gz"
Invoke-WebRequest -Uri "https://github.com/Rovrry/dsh-Rov-PJ/archive/refs/heads/master.tar.gz" -OutFile $tmp
tar -xzf $tmp -C $plugins
$src = Join-Path $plugins "dsh-purge-master"
$dst = Join-Path $plugins "dsh-purge"
if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
Rename-Item $src "dsh-purge"
```

已有本仓库副本时，复制整个目录到 `$DSH_HOME/plugins/dsh-purge`，不要只拷几个 js。

放好后检查：`$DSH_HOME/plugins/dsh-purge/package.json` 能打开，且 `"name": "dsh-purge"`。不要用插件市场的 `api/plugins/download` 地址当源。

**3. 只改对应 profile 的 `package.json`，先备份**

| 宿主 | 要改的文件 |
|---|---|
| Web | `$DSH_HOME/profiles/web/package.json` |
| 官方桌面 EXE | `$DSH_HOME/profiles/desktop/package.json` |

先复制一份 `package.json.bak`。然后**只追加两处**，原有依赖、原有 bundle、其它字段全部留着：

1. `dependencies` 增加一行：`"dsh-purge": "file:../../plugins/dsh-purge"`
2. `dsh.profile.bundles` **末尾**追加 `"dsh-purge"`（已经有就不要再加）

`file:../../plugins/dsh-purge` 是从 `profiles/web` 或 `profiles/desktop` 走到 `$DSH_HOME/plugins/dsh-purge` 的相对路径，两处都一样，不要改成绝对路径。

改前（官方默认常见长这样，你机器上还会有其它插件，那些一行都不要删）：

```json
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": {},
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app"
      ],
      "patchReload": "live"
    }
  }
}
```

改后：

```json
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": {
    "dsh-purge": "file:../../plugins/dsh-purge"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-purge"
      ],
      "patchReload": "live"
    }
  }
}
```

注意：

- Web：**必须保留** `@deepseek-ai/dsh-web-app`，只在数组末尾追加本插件
- 桌面端：保留原来的 `@deepseek-ai/dsh-base` 等；没有 `dsh-web-app` 就不要硬加
- JSON 要合法：新增项前面要有逗号，最后一项后面不要多余逗号
- `patchReload`、其它插件名、版本号都不要动
- 已经写过 `"dsh-purge"` 就不要再写第二份

**4. 只在刚改的那个 profile 目录装依赖**

本机要有 `pnpm`（官方 dsh 一般自带）。进入**上一步改过的那个** profile 目录再执行，不要在仓库根目录、也不要在 `$DSH_HOME` 根目录执行。下面两条命令只跑和你宿主对应的一条，不要连着跑。

```sh
cd "$DSH_HOME/profiles/web"       # Web
pnpm install

cd "$DSH_HOME/profiles/desktop"   # 官方 EXE
pnpm install
```

Windows PowerShell（路径换成第 1 步找到的那份）：

```powershell
cd "$env:USERPROFILE\.dsh\profiles\web"
# 官方桌面 EXE：
# cd "$env:USERPROFILE\.dsh\profiles\desktop"
# 便携包把 $env:DSH_HOME 指到那份 .dsh，不要写死盘符：
# cd "$env:DSH_HOME\profiles\web"
pnpm install
```

成功标志：出现 `$DSH_HOME/profiles/<web|desktop>/node_modules/dsh-purge/package.json`。

常见失败：

- 提示找不到 `pnpm`：先装 pnpm，或用官方 dsh 自带的 Node / pnpm
- `Could not resolve` / 找不到本地包：检查 `plugins/dsh-purge/package.json` 是否存在，以及 `file:../../plugins/dsh-purge` 有没有写错
- JSON 解析失败：把 `package.json` 用编辑器校验逗号后重试；不行就用备份还原再改一次

**5. 完全退出该宿主，再启动，再打补丁**

只写入 `package.json` **还不会**改 `@deepseek-ai` 包，必须重启后再点「应用」。

1. 完全退出刚装的那个宿主：Web 关掉 `dsh web`；官方 EXE 退出托盘
2. 打开**这个宿主**，会话标题旁应出现 **dsh-purge**。点开后是「清洗」。
3. 只在这个宿主点「应用」，或聊天 `/purge apply`。不要用 Web 去点桌面端的应用，也不要反过来
4. 应用成功后会自动重启一次，补丁才会进当前进程。应用没做完不会重启。官方桌面的「重启 / 卸载」只重启官方桌面，不会去拉 `dsh web`

**6. 怎么确认装上了**

- 会话标题旁有 **dsh-purge**
- 聊天 `/purge status` 能打出 `DSH_HOME` 和补丁列表，路径应等于第 1 步用的那份
- `profiles/<名>/node_modules/dsh-purge` 指向 `plugins/dsh-purge`

还没有这个按钮时，多半是改错了另一份 `.dsh`，或改了 `web` 却在桌面端里等。回到第 1 步核对路径，不要在两份主目录各改一半。

### 卸载

会话标题旁的 **dsh-purge** →「清洗」→「卸载」。弹窗确认：卸载将还原回原版并清除本插件。如果已经点过「应用」，会先还原补丁，再删插件文件，然后重启当前宿主（Web 重启 `dsh web`；官方桌面重启官方客户端）。

```sh
# 也可以用命令行
dsh-purge --uninstall
# 或聊天里 /purge uninstall
```

插件配置在 `cordis.patch.yml`：

```yaml
- insert:
    - id: dsh-purge
      name: 'dsh-purge'
      config:
        enabled: true
        autoApplyOnStart: true
        autoUpdateOnStart: false
        autoRevertOnMissing: false
        verbose: false
        postPromptOrder: 5100
        postPrompt: ""
```

`postPrompt` 默认为空。需要时再追加一段有序 systemPrompt，不改 `prompt-inject.md`。

---

[← 返回仓库首页](../README.md) | [免责声明](DISCLAIMER.md)
