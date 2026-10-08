<p align="center">
  <img src="docs/banner.svg" alt="dsh-purge" width="720">
</p>

<h1 align="center">⚔️ DeepSeek Harness 网络安全红队工具（dsh-purge）</h1>

<p align="center"><strong>Version 1.0.11</strong></p>

<p align="center">
  <em>本机官方 DeepSeek Harness 网络安全红队评测插件。清洗宿主策略，并带内嵌演练台。不同模型可换不同提示词。默认提示词面向国模「小码酱」。求 Star 收藏 ⭐</em>
</p>

<p align="center">
  <a href="https://github.com/Rovrry/dsh-Rov-PJ/stargazers"><img src="https://img.shields.io/github/stars/Rovrry/dsh-Rov-PJ?logo=github&label=Stars" alt="GitHub stars"></a>
  <a href="https://github.com/Rovrry/dsh-Rov-PJ/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-65a30d?style=flat" alt="MIT license"></a>
  <a href="https://awesome-dsh-plugin.com"><img src="https://awesome-dsh-plugin.com/badge.svg" alt="awesome · DSH plugin"></a>
  <a href="https://deepseek.stream/plugins/dsh-purge"><img src="https://img.shields.io/badge/Hub-dsh--purge-1a73e8" alt="DeepSeek Harness Hub"></a>
  <a href="https://www.deepseek.com/harness/"><img src="https://img.shields.io/badge/dsh-0.2.0--rc.2-blue" alt="DSH"></a>
  <br>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=fff" alt="Node.js">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000" alt="JavaScript">
</p>

<p align="center">
  <strong>中文</strong>（当前） | <a href="README.en.md">English</a>
</p>

---

## 一、📦 项目来源

| 项目 | 说明 |
|---|---|
| 本仓库 | <https://github.com/Rovrry/dsh-Rov-PJ> |
| 当前版本 | 1.0.11（本仓库独立版本号） |
| 授权协议 | MIT |

**版权与来源**：本项目基于开源项目二次开发，原始版权归其作者所有 ——
Copyright (c) 2026 小杨，MIT 协议，上游仓库 <https://github.com/YuJunZhiXue/dsh-purge>。
本仓库全部新增内容（版本号、打包、文档、界面与交互改动）由本仓库维护者以 AI 大模型协助完成。

---

## 二、⚠️ 安装教程

> 装完**必须点一次「应用」**，只在插件里选了安装还不生效。

```sh
# 官方 dsh web
dsh plugin --profile web add https://github.com/Rovrry/dsh-Rov-PJ/archive/refs/heads/master.tar.gz

# 官方桌面 EXE
dsh plugin --profile desktop add https://github.com/Rovrry/dsh-Rov-PJ/archive/refs/heads/master.tar.gz
```

四条注意事项：

1. **只装你正在打开的那一个宿主。** Web 用 `web` profile，桌面 EXE 用 `desktop` profile，分开装、分开应用。
2. **必须是 dsh 0.2**（官方桌面 0.2.0-rc.2）。**0.1.x 不支持。**
3. **装完必须点「应用」**：退出并重开宿主 → 点会话标题旁的 **dsh-purge** → 右侧栏 **清洗** 页点 **「应用」** → 自动重启 → **新开一轮对话**。
4. **不要用插件市场的一键安装**（[市场页](https://deepseek.stream/plugins/dsh-purge)只看介绍），用上面的 `.tar.gz` 命令。

**完整文档：**

| 文档 | 内容 |
|---|---|
| **[安装教程](docs/INSTALL.md)** | 三步应用、各宿主差异、手动安装、交给助手安装、卸载 |
| [界面与使用](docs/USAGE.md) | 界面预览、命令与聊天指令、自己的服务器 |
| [技术参考](docs/REFERENCE.md) | 目录结构、工作原理、还原、路径探测、版本与更新、说明 |
| **[工具箱](docs/TOOLKIT.md)** | 工具统一存放目录、运行环境依赖（Python/Java 等）、官方获取命令 |
| **[免责声明](docs/DISCLAIMER.md)** | 零容忍条款与 10 条合规细则全文 |

---

## 三、⚠️ 免责声明

**本项目系由 AI 人工智能大模型协助进行的二次开发与创作成果**，按开源协议「按现状」提供，
作者不对其完整性、安全性、适用性作任何保证。

- 使用者须自行遵守所在地法律法规及平台规范。
- **任何因使用者违法违规使用本项目（包括但不限于未授权攻击、入侵、数据窃取、破坏系统或生成违法违禁内容）而产生的全部后果与法律责任，均由使用者本人独立承担，与项目作者无关。**
- 严禁任何主体用于商业售卖、付费倒卖或黑灰产牟利，仅供技术参考。
- 本项目与 DeepSeek 官方无任何隶属、合作、授权或背书关系。

<a id="strict-legal--compliance-disclaimer"></a>

👉 **完整免责声明、零容忍条款与 10 条合规细则：[docs/DISCLAIMER.md](docs/DISCLAIMER.md)**

---

<p align="center"><sub>本页面只保留项目来源、安装教程与免责声明；详细文档见上方表格。</sub></p>
