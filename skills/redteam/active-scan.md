---
name: active-scan
description: 主动端口与服务扫描（nmap/masscan），严格遵守授权范围
whenToUse: 需要确认资产存活与开放端口时
role: recon
enabled: true
---

> **路径约定**：下文的 `${TOOLKIT}` 指工具根目录 `$DSH_HOME/redteam/toolkit`（可在演练台「环境适配」里改）。
> 工具一律放 `${TOOLKIT}/<工具名>/`，不要散落到 PATH 或 `~/.local/bin`。
> 缺什么工具、装到哪、官方获取命令：跑 `redteam_preflight`，或看仓库 `docs/TOOLKIT.md`。

## 前置检查
1. 确认目标 CIDR 在授权范围内。
2. 确认当前时间窗口允许主动扫描。

## 命令
- 快速存活：`nmap -sn <cidr>`
- 全端口（限速）：`nmap -sS -p- --min-rate 1000 -T4 <target> -oX runs/nmap-full.xml`
- 服务版本：`nmap -sV -sC -p <ports> <target> -oX runs/nmap-svc.xml`

## 本地已备好的工具（绝对路径，优先用它们，不要手搓）
| 用途 | 命令 |
| --- | --- |
| 端口扫描 | `nmap` / `masscan` / `${TOOLKIT}/naabu/naabu`（SYN 需 root，否则加 `-scan-type c`） |
| 内网综合扫描 | `${TOOLKIT}/fscan/fscan`（技能 fscan-intranet） |
| 内网测绘/指纹 | `${TOOLKIT}/gogo/gogo`（技能 gogo-intranet） |
| HTTP 探测（ProjectDiscovery） | `${TOOLKIT}/httpx/httpx`（**注意：`/usr/bin/httpx` 是 Python httpx 库的 CLI，不是这个**） |
| 子域/解析 | `${TOOLKIT}/subfinder/subfinder`、`${TOOLKIT}/dnsx/dnsx` |
| POC 扫描 | `nuclei`（模板已在 `~/.local/nuclei-templates`） |
| 目录爆破 | `ffuf`、`${TOOLKIT}/dirsearch/dirsearch` |
| 隧道 | `${TOOLKIT}/suo5/suo5-linux-amd64`、`toolkit/chisel/chisel`、`toolkit/frp/{frpc,frps}` |
| 完整清单 | `${TOOLKIT}/清单.md`、`技能工具清单.md` |

`setup.sh` 不下载 dirsearch。`清单.md` 是说明文件，缺了不代表扫描器没装。Windows 与 ARM 构建也不在安装脚本里。

## 落库要求
provenance = `active`，tool = `nmap`/`masscan`，记录 scan_run。
