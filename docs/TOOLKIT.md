# 工具箱：目录约定、环境依赖与获取命令

本页说明**红队演练用的工具放哪、需要什么运行环境、怎么获取**。

> **重要（1.0.12 起）**：本页与演练台里给出的命令都是**文本**，你可以自己复制、自己执行。
> 演练台「环境适配」页另外提供**一键安装 / 一键卸载**：那是**你点了按钮之后**才在本机执行的操作，
> 执行前会先做装前环境检测（平台 / 发行版 / 包管理器 / 权限 / 依赖 / 下载解压工具 / 出网），
> 检测不过就不动手，只把命令交回给你。
>
> **底线没变**：插件在**启动、装包、更新**时不会发起任何下载。
> 这一点才是避免被代码托管平台判为「安装后自动下载渗透二进制」的关键。

---

## 一、目录约定：一个根目录，一个工具一个子目录

所有工具统一放在 `${TOOLKIT}` 下：

```
${TOOLKIT} = $DSH_HOME/redteam/toolkit          （默认值，可在演练台「环境适配」修改）
```

实际布局：

```
$DSH_HOME/redteam/toolkit/
├── nmap/            nmap
├── nuclei/          nuclei
├── naabu/           naabu
├── httpx/           httpx
├── dnsx/            dnsx
├── subfinder/       subfinder
├── ksubdomain/      ksubdomain
├── oneforall/       （源码目录 + .venv）
├── fscan/           fscan
├── gogo/            gogo
├── ffuf/            ffuf
├── dirsearch/       （源码目录）
├── katana/          katana
├── suo5/            suo5-linux-amd64
├── chisel/          chisel
├── frp/             frpc, frps        ← 客户端与服务端同目录
├── impacket/        （Python 包，入口脚本）
├── Behinder/        Behinder.jar
├── Godzilla/        godzilla.jar
├── AntSword/        Loader（自带 Electron）
└── vps/             id_rsa, vps.sh    ← 插件自带：SSH 私钥与载荷服务脚本
```

两条规则：

1. **技能正文不再写死绝对路径**，统一用 `${TOOLKIT}` 指代根目录。改一次 `toolkitDir`，全部技能跟着走。
2. **不要散落到 PATH 或 `~/.local/bin`**。历史版本曾把 httpx 的包装器放在 `~/.local/bin/pd-httpx`，
   这是碎片化的根源，已统一。

`vps/` 目录是例外：`id_rsa` 是你自己的 SSH 私钥、`vps.sh` 是插件附带的载荷服务脚本，**不是外部工具**，
所以不参与工具检测。

---

## 二、工具清单

版本为核对时的各项目官方最新版（核对时间 2026-10）。**版本会过期，但下载地址是稳定的官方发布页。**

<!-- TOOLKIT_TABLE_BEGIN -->
| 工具 | 存放目录 | 核对版本 | 形态 | 运行环境 |
| --- | --- | --- | --- | --- |
| Nmap | `${TOOLKIT}/nmap/` | 7.95 | 单文件二进制 | 零依赖 |
| Masscan | `${TOOLKIT}/masscan/` | 1.3.2 | 单文件二进制 | 零依赖 |
| Nuclei | `${TOOLKIT}/nuclei/` | v3.11.1 | 单文件二进制 | 零依赖 |
| naabu | `${TOOLKIT}/naabu/` | v2.6.1 | 单文件二进制 | 零依赖 |
| httpx（ProjectDiscovery） | `${TOOLKIT}/httpx/` | v1.12.0 | 单文件二进制 | 零依赖 |
| dnsx | `${TOOLKIT}/dnsx/` | v1.3.1 | 单文件二进制 | 零依赖 |
| subfinder | `${TOOLKIT}/subfinder/` | v2.16.0 | 单文件二进制 | 零依赖 |
| ksubdomain | `${TOOLKIT}/ksubdomain/` | v0.7 | 单文件二进制 | 零依赖 |
| OneForAll | `${TOOLKIT}/oneforall/` | v0.4.5 | 源码目录 | Python 3 + git |
| fscan | `${TOOLKIT}/fscan/` | v2.2.2 | 单文件二进制 | 零依赖 |
| gogo | `${TOOLKIT}/gogo/` | v2.15.0 | 单文件二进制 | 零依赖 |
| ffuf | `${TOOLKIT}/ffuf/` | v2.3.0 | 单文件二进制 | 零依赖 |
| dirsearch | `${TOOLKIT}/dirsearch/` | v0.5.0 | 源码目录 | Python 3 + git |
| katana | `${TOOLKIT}/katana/` | v1.8.0 | 单文件二进制 | 零依赖 |
| suo5 | `${TOOLKIT}/suo5/` | v2.2.0 | 单文件二进制 | 零依赖 |
| chisel | `${TOOLKIT}/chisel/` | v1.12.0 | 单文件二进制 | 零依赖 |
| frp 客户端 | `${TOOLKIT}/frp/` | v0.71.0 | 单文件二进制 | 零依赖 |
| frp 服务端 | `${TOOLKIT}/frp/` | v0.71.0 | 单文件二进制 | 零依赖 |
| impacket | `${TOOLKIT}/impacket/` | 0.13.1 | 源码目录 | Python 3 |
| Behinder（冰蝎） | `${TOOLKIT}/Behinder/` | v4.1 | Java 图形界面 | Java 运行时（JRE 8+） |
| Godzilla（哥斯拉） | `${TOOLKIT}/Godzilla/` | v4.0.1 | Java 图形界面 | Java 运行时（JRE 8+） |
| AntSword（中国蚁剑） | `${TOOLKIT}/AntSword/` | v4.0.3 | 单文件二进制 | 零依赖 |
<!-- TOOLKIT_TABLE_END -->

> 本表由 `node scripts/gen-toolkit-doc.mjs --write` 从 `lib/redteam/toolkit-catalog.js` 生成，别手改。

---

## 三、运行环境依赖

工具本身之外，有几项**系统级依赖**。装错或没装，工具拿到了也起不来。

<!-- RUNTIME_TABLE_BEGIN -->
| 运行时 | 必需性 | 谁需要它 | Linux 安装命令 |
| --- | --- | --- | --- |
| Python 3 | **必需** | dirsearch、OneForAll、impacket 的部分入口脚本 | `sudo apt install -y python3 python3-pip python3-venv` |
| Java 运行时（JRE 8+） | **必需** | Behinder（冰蝎）、Godzilla（哥斯拉）—— 都是 `java -jar` 启动 | `sudo apt install -y default-jre` |
| Go 工具链 | 可选 | 仅编译安装方式需要（`go install`）；用 Release 二进制则不需要 | `sudo apt install -y golang-go` |
| Node.js 18+ | **必需** | DSH 宿主本身；部分技能用 node 写小脚本 | `sudo apt install -y nodejs npm` |
| git | **必需** | 从源码目录安装的工具（dirsearch、OneForAll、impacket） | `sudo apt install -y git` |
| proxychains（可选） | 可选 | 内网横向时代理链；没有也能用隧道工具替代 | `sudo apt install -y proxychains4` |
| Chromium / Chrome（可选） | 可选 | 技能 browser-automation 的零依赖方案；也能用已装的 Chrome | `sudo apt install -y chromium` |
<!-- RUNTIME_TABLE_END -->

本插件最常踩的坑：**冰蝎与哥斯拉是 Java 图形界面程序**，只装了 Python/Node 的机器上
`java -jar` 会直接报 `command not found`，而这两个工具在技能正文里看起来"只要有文件就行"。

---

## 四、怎么拿到命令

四种方式，内容一致：

**① 一键安装（1.0.12 起，最省事）**

打开 `dsh-purge → 环境适配`，每个缺失工具那一行有按钮：

- **一键安装** —— 点下去先跑**装前环境检测**，逐项给出结论：平台与发行版、包管理器、权限
  （root / sudo 免密 / sudo 需密码）、该工具依赖的运行环境、装机要用的系统命令（curl / unzip / tar / git…）、
  出网是否通。**全部通过才执行**，并把「要跑的完整脚本」展开给你看；不通过就不执行，
  改成把缺的那几项安装命令摆出来让你复制。
- **一键卸载** —— 只删工具箱里这一个工具的子目录，删前先干跑报「会删几个文件 / 多大」。
  工具来自 `binDirs`、`PATH` 或你手填的绝对路径时**不删**（面板会说明原因）。
- 顶部还有 **一键安装缺失（N）**：逐个做装前检测，通过才装，不过的跳过并列原因。

两条硬规则：sudo 类命令会被改写成 `sudo -n`（没填密码时**不会挂在密码提示上**；
填了密码并校验通过则改写为 `sudo -A`，由临时 askpass 助手提供密码）；装完会**复检**，
能在本机解析到可执行文件才算成功 —— **退出码 0 不算数**。

失败时别猜：面板按退出码给方向（`404` = 官方资产名/版本变了、`7` = 连不上、`28` = 超时、
`127` = 缺命令、`1` = 某条命令失败），并附上最后几行真实输出。装前还会先 HEAD 一次官方资产直链，
地址失效**在装之前**就会报出来。

**② 演练台面板**（推荐，内容最全）

打开 `dsh-purge → 环境适配`：

- 「宿主环境」——平台 / 发行版 / 包管理器 / 权限 / 下载解压命令 / 出网，先看清这台机器装得动什么
- 「运行时依赖检测」——每项显示已装/缺/可选，缺的带**一键复制安装命令**
- 「工具统一存放目录」——显示根目录与每个缺失工具的目标路径、官方来源、**一键复制安装命令**

**③ 让智能体跑 preflight**

```
redteam_preflight
```

返回里 `environment` 是运行时与工具总览，`tool_commands` 是缺失工具的完整获取文本
（建目录 → 获取 → 验证）。可用 `tool_commands: false` 只看清单，或用 `tool_limit` 限制条数。

**④ 直接问**

跟智能体说"某某工具装到哪、怎么装"，它会按清单回答。

---

## 五、一个完整的例子

以 nuclei 为例，面板/ preflight 给出的文本长这样：

```bash
# Nuclei（核对版本 v3.11.1）
# 目标目录：$DSH_HOME/redteam/toolkit/nuclei
# 来源：https://github.com/projectdiscovery/nuclei/releases

# 1) 建目录
mkdir -p "$DSH_HOME/redteam/toolkit/nuclei"

# 2) 获取（Release 二进制）
V=3.11.1
curl -fsSL -o /tmp/nuclei.zip "https://github.com/projectdiscovery/nuclei/releases/download/v${V}/nuclei_${V}_linux_amd64.zip"
unzip -o /tmp/nuclei.zip -d "$DSH_HOME/redteam/toolkit/nuclei" && chmod +x "$DSH_HOME/redteam/toolkit/nuclei/nuclei"

# 3) 验证
nuclei -version

# 完成后再跑一次 redteam_preflight 确认已被识别。
```

装完重跑 `redteam_preflight`，`toolkit` 字段里能看到它被识别到，`environment.foundCount` 会 +1。

---

## 六、常见问题

**Q：工具装在别处行不行？**

行。三条途径任选：`toolkitDir` 改根目录、`binDirs` 加搜索目录、`tools.<id>` 填单个绝对路径。
解析顺序是：**本表绝对路径 → toolkitDir → binDirs → PATH**。

**Q：`httpx` 明明装了却报未找到？**

多半装成了 Python 的 `httpx` 库 CLI（`/usr/bin/httpx`）。ProjectDiscovery 的 httpx 是另一个程序，
清单里按 `rejectPython` 排除了前者。用 `httpx -version` 确认：能打印版本号且有 `-l` 参数的才是对的。

**Q：Windows 上哪些工具用不了？**

fscan / gogo / suo5 等有 Windows 构建；**冰蝎、哥斯拉需要 Java + 桌面环境**；
dirsearch / OneForAll / impacket 需要 Python；部分工具官方没有 Windows 二进制（如 masscan），
建议在 Linux 跳板机上用。

**Q：版本一定要和表里一致吗？**

不用。表里的版本只是"核对时的最新版"，用于给你一个参照。检测只看**文件在不在**，不校验版本。
不过版本过旧可能缺新参数，技能正文里的命令是按较新版本写的。

**Q：能自动下载吗？**

**能，但只在你点按钮时。** 「环境适配」页的**一键安装**会在本机执行获取命令，下载到 `${TOOLKIT}` 下。
两种方式并存：

- **一键安装**：点了才跑，装前必做环境检测（平台 / 权限 / 依赖 / 系统命令 / 出网），跑完复检；
- **复制安装命令**：只给文本，你自己执行（老做法，仍然保留）。

**插件在启动、装包、更新时不发起任何下载** —— 这条是底线，也是避免被代码托管平台
判为「安装后自动下载渗透二进制」的前提（见 `skills/redteam/redteam-setup.md`）。

**Q：一键安装装不了怎么办？**

常见四种，面板会直接说原因：

| 拦路条件 | 面板表现 | 怎么办 |
|---|---|---|
| **sudo 需密码** | `apt` 类工具（nmap / masscan / impacket）提示要密码 | 在「宿主环境」卡片**填一次 sudo 密码 → 点「校验」→ 再点「一键安装」**；也可以复制命令自己跑 |
| **缺系统命令** | 提示缺 curl / unzip / tar / git / pipx | 点旁边的「装上」按钮直接装，或复制命令自己跑；装完点「重新检测」 |
| **缺运行环境** | 提示缺 Python / Java | 同上，点「装上」装 `default-jre` 等；冰蝎、哥斯拉必须有 Java |
| **官方资产 404** | 装前就报「官方资产直链 404」 | 官方改过文件名/版本号了：点「官方来源 ↗」对照后改 `lib/redteam/toolkit-catalog.js` |

外加：官方只给人工下载页的工具（`Behinder` / `Godzilla` / `AntSword`）标为**需人工下载**，
按钮点不动，只有「官方来源 ↗」和「复制安装命令」。

### 关于 sudo 密码（1.0.13 起）

- **只活在页面内存**：不写 `config.json`、不进日志、关掉页面（或点「清除密码」）即弃。
- 代跑时用**临时 askpass 助手**（目录与脚本 0700、跑完即删）把密码交给 `sudo -A`；
  密码**不走命令行参数**，所以 `ps` 与安装日志里都看不到它。
- 校验用 `sudo -k -v`：先作废旧时间戳再验，**本机已有时间戳时也能识破错密码**；
  验过会刷新时间戳，之后 15 分钟内的安装直接免密。
- 不填密码时一切照旧：`sudo -n` 快速失败，**不会挂住等输入**。

---

## 相关文档

- [安装与教程](./INSTALL.md)
- [使用说明](./USAGE.md)
- [技术参考](./REFERENCE.md)
- [免责声明](./DISCLAIMER.md)
