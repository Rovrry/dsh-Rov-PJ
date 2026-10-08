<p align="center">
  <img src="docs/banner.svg" alt="dsh-purge" width="720">
</p>

<h1 align="center">⚔️ DeepSeek Harness cybersecurity red-team tool (dsh-purge)</h1>

<p align="center"><strong>Version 1.0.9</strong></p>

<p align="center">
  <em>Local official DeepSeek Harness cybersecurity red-team plugin. Clean host policy, and ship a built-in drill console. Swap prompts per model. Default prompt for Chinese models — 小码酱. Please star ⭐</em>
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
  <a href="README.md">中文</a>（main） | <strong>English</strong>（current）
</p>

---

## 1. 📦 Project origin

| Item | Note |
|---|---|
| This repository | <https://github.com/Rovrry/dsh-Rov-PJ> |
| Current version | 1.0.9 (this repository's own version number) |
| License | MIT |

**Copyright and origin**: this project is a secondary development of an open-source project;
the original copyright belongs to its author - Copyright (c) 2026 小杨, MIT license, upstream
repository <https://github.com/YuJunZhiXue/dsh-purge>. Everything added in this repository
(versioning, packaging, documentation, UI and interaction changes) was produced by this
repository's maintainer with the assistance of AI large language models.

---

## 2. ⚠️ Installation

> You **must click Apply once** after installing. Selecting the install inside the plugin is not enough.

```sh
# Official dsh web
dsh plugin --profile web add https://github.com/Rovrry/dsh-Rov-PJ/archive/refs/heads/master.tar.gz

# Official desktop EXE
dsh plugin --profile desktop add https://github.com/Rovrry/dsh-Rov-PJ/archive/refs/heads/master.tar.gz
```

Four things to know:

1. **Install only for the host you are actually using.** Web uses the `web` profile, the desktop
   EXE uses the `desktop` profile. Install and apply them separately.
2. **dsh 0.2 is required** (official desktop 0.2.0-rc.2). **0.1.x is not supported.**
3. **You must click Apply**: quit and reopen the host, click **dsh-purge** beside the session
   title, click **Apply** on the **Clean** page in the right dock, let it restart, then
   **start a new chat**.
4. **Do not use the plugin Hub's one-click install** (the [Hub page](https://deepseek.stream/plugins/dsh-purge)
   is for reading only). Use the `.tar.gz` command above.

**Full documentation:**

| Document | Contents |
|---|---|
| **[Installation](docs/INSTALL.md#english)** | Three-step apply, per-host differences, manual install, assistant-assisted install, uninstall |
| [Interface and usage](docs/USAGE.md#english) | UI preview, commands and chat directives, own servers |
| [Technical reference](docs/REFERENCE.md#english) | Layout, how it works, restore, path detection, releases, notes |
| **[Toolkit](docs/TOOLKIT.md)** | Unified tool directory, runtime requirements (Python/Java etc.), official fetch commands |
| **[Development](docs/DEVELOPMENT.md)** | Notes for secondary development: generated vs source files, build flow, release steps, pitfalls |
| **[Disclaimer](docs/DISCLAIMER.md)** | Zero-tolerance terms and all 10 compliance rules |

---

## 3. ⚠️ Disclaimer

**This project is a secondary development and creation carried out with the assistance of AI
large language models.** It is provided under an open-source license on an "as is" basis; the
author gives no warranty of completeness, security or fitness.

- Users must comply with the laws and platform rules that apply to them.
- **All consequences and legal liability arising from any illegal or non-compliant use of this
  project (including but not limited to unauthorized attacks, intrusion, data theft, sabotage, or
  generating illegal content) are borne solely by the user, and are unrelated to the project author.**
- Commercial sale, paid resale, or use for illegal or gray-market profit is strictly forbidden.
  For technical reference only.
- This project has no affiliation, partnership, authorization or endorsement relationship with
  DeepSeek officials.

<a id="strict-legal--compliance-disclaimer"></a>

👉 **Full disclaimer, zero-tolerance terms and the 10 compliance rules: [docs/DISCLAIMER.md](docs/DISCLAIMER.md)**

---

<p align="center"><sub>This page keeps only project origin, installation and the disclaimer; see the table above for detailed docs.</sub></p>
