/**
 * 红队工具箱清单（工具 → 版本 / 运行环境 / 官方获取命令）
 *
 * 用途：
 *   · 统一工具存放位置：全部落在 `${toolkitDir}`（默认 `$DSH_HOME/redteam/toolkit`）；
 *   · 环境检测：每个工具声明 runtime，preflight 与「环境适配」据此报告缺什么；
 *   · 下载命令：给出官方 Release 地址与分平台命令，**由用户自己执行**。
 *
 * 红线（1.0.12 起，与 skills/redteam/redteam-setup.md 一致）：
 *   · 插件在**启动 / 装包 / 更新**时不发起任何下载；
 *   · 本文件仍是"去哪取、怎么装"的**事实来源**：面板「一键安装」由后端按这里生成脚本，
 *     且 op 只接收工具 id（前端传不了命令文本）；
 *   · 执行前必做环境检测（平台 / 发行版 / 包管理器 / 权限 / 依赖 / 出网），
 *     见 platform-config.js 的 installPreflight()。
 *
 * 版本核对时间：2026-10（均为各项目 GitHub Release 的实测最新版）。
 * 版本会过期，但命令里的下载地址是稳定的官方发布页，不会失效。
 */

/** 工具存放子目录名（相对 toolkitDir）。一个工具一个目录，避免同名互撞。 */
export const TOOL_DIRS = {
  nmap: 'nmap',
  masscan: 'masscan',
  nuclei: 'nuclei',
  naabu: 'naabu',
  httpx: 'httpx',
  dnsx: 'dnsx',
  subfinder: 'subfinder',
  ksubdomain: 'ksubdomain',
  oneforall: 'oneforall',
  fscan: 'fscan',
  gogo: 'gogo',
  ffuf: 'ffuf',
  dirsearch: 'dirsearch',
  suo5: 'suo5',
  chisel: 'chisel',
  frp: 'frp',
  impacket: 'impacket',
  behinder: 'Behinder',
  godzilla: 'Godzilla',
  antsword: 'AntSword',
}

/**
 * 运行时依赖定义：id → 探测方式与安装命令。
 * `probe` 是**只读**命令，只拿版本号，不改任何东西。
 * `min` 为最低要求，仅作提示，不阻断（工具自身会报错）。
 */
export const RUNTIME_CATALOG = [
  {
    id: 'python3',
    label: 'Python 3',
    probe: 'python3 --version',
    winProbe: 'python --version',
    need: 'dirsearch、OneForAll、impacket 的部分入口脚本',
    install: {
      linux: 'sudo apt install -y python3 python3-pip python3-venv',
      darwin: 'brew install python3',
      windows: 'winget install --id Python.Python.3.12 -e',
    },
  },
  {
    id: 'java',
    label: 'Java 运行时（JRE 8+）',
    probe: 'java -version',
    need: 'Behinder（冰蝎）、Godzilla（哥斯拉）—— 都是 `java -jar` 启动',
    install: {
      linux: 'sudo apt install -y default-jre',
      darwin: 'brew install openjdk',
      windows: 'winget install --id Microsoft.OpenJDK.21 -e',
    },
  },
  {
    id: 'go',
    label: 'Go 工具链',
    probe: 'go version',
    need: '仅编译安装方式需要（`go install`）；用 Release 二进制则不需要',
    optional: true,
    install: {
      linux: 'sudo apt install -y golang-go',
      darwin: 'brew install go',
      windows: 'winget install --id GoLang.Go -e',
    },
  },
  {
    id: 'node',
    label: 'Node.js 18+',
    probe: 'node --version',
    need: 'DSH 宿主本身；部分技能用 node 写小脚本',
    install: {
      linux: 'sudo apt install -y nodejs npm',
      darwin: 'brew install node',
      windows: 'winget install --id OpenJS.NodeJS.LTS -e',
    },
  },
  {
    id: 'git',
    label: 'git',
    probe: 'git --version',
    need: '从源码目录安装的工具（dirsearch、OneForAll、impacket）',
    install: {
      linux: 'sudo apt install -y git',
      darwin: 'brew install git',
      windows: 'winget install --id Git.Git -e',
    },
  },
  {
    id: 'proxychains',
    label: 'proxychains（可选）',
    probe: 'proxychains4 -V',
    probe2: 'proxychains -V',
    need: '内网横向时代理链；没有也能用隧道工具替代',
    optional: true,
    install: {
      linux: 'sudo apt install -y proxychains4',
      darwin: 'brew install proxychains-ng',
      windows: '（Windows 建议改用 chisel / frp 的 socks 模式）',
    },
  },
  {
    id: 'chromium',
    label: 'Chromium / Chrome（可选）',
    probe: 'chromium --version',
    probe2: 'chromium-browser --version',
    need: '技能 browser-automation 的零依赖方案；也能用已装的 Chrome',
    optional: true,
    install: {
      linux: 'sudo apt install -y chromium',
      darwin: 'brew install --cask chromium',
      windows: 'winget install --id Chromium.Chromium -e',
    },
  },
]

/**
 * 工具清单。
 *
 * 字段：
 *   id / label / names / dir —— 与旧 TOOL_CATALOG 兼容（names 为候选可执行名）
 *   version —— 核对到的官方最新版（仅供提示，不强制）
 *   runtime —— 依赖的运行时 id 数组，空数组表示静态二进制、零依赖
 *   kind    —— binary（单文件即可跑）| source（需要源码目录/venv）| jar（需要 Java）
 *   repo    —— 官方仓库
 *   page    —— 官方发布页（永久有效，优先给用户这个）
 *   get     —— 分平台获取步骤：{ shell: 说明, cmd: 可复制命令 }
 *   verify  —— 装完怎么确认
 *   note    —— 坑与说明
 */
export const TOOLKIT_CATALOG = [
  /* ---------------- 侦察 / 扫描 ---------------- */
  {
    id: 'nmap', label: 'Nmap', names: ['nmap.exe', 'nmap'], dir: 'nmap',
    version: '7.95', runtime: [], kind: 'binary',
    repo: 'nmap/nmap', page: 'https://nmap.org/download.html',
    get: {
      linux: { shell: '包管理器', cmd: 'sudo apt install -y nmap' },
      darwin: { shell: 'Homebrew', cmd: 'brew install nmap' },
      windows: { shell: '官方安装包', cmd: 'winget install --id Insecure.Nmap -e\n# 或到 https://nmap.org/download.html 下载 winpcap/npcap + nmap 安装包' },
    },
    verify: 'nmap --version',
    note: 'SYN 扫描需要 root/管理员；Windows 需先装 Npcap。',
  },
  {
    id: 'masscan', label: 'Masscan', names: ['masscan.exe', 'masscan'], dir: 'masscan',
    version: '1.3.2', runtime: [], kind: 'binary',
    repo: 'robertdavidgraham/masscan', page: 'https://github.com/robertdavidgraham/masscan',
    get: {
      linux: { shell: '包管理器 / 源码', cmd: 'sudo apt install -y masscan\n# 或源码编译：git clone https://github.com/robertdavidgraham/masscan && cd masscan && make -j' },
      darwin: { shell: 'Homebrew', cmd: 'brew install masscan' },
      windows: { shell: '需自行编译', cmd: '# Windows 无官方二进制，建议在 Linux 跳板机上使用' },
    },
    verify: 'masscan --version',
    note: '需要 root。发包含量大，务必先限定范围与速率（--rate）。',
  },
  {
    id: 'nuclei', label: 'Nuclei', names: ['nuclei.exe', 'nuclei'], dir: 'nuclei',
    version: 'v3.11.1', runtime: [], kind: 'binary',
    repo: 'projectdiscovery/nuclei', page: 'https://github.com/projectdiscovery/nuclei/releases',
    get: {
      linux: { shell: 'Release 二进制', cmd: 'V=3.11.1\ncurl -fsSL -o /tmp/nuclei.zip "https://github.com/projectdiscovery/nuclei/releases/download/v${V}/nuclei_${V}_linux_amd64.zip"\nunzip -o /tmp/nuclei.zip -d "$TOOLKIT/nuclei" && chmod +x "$TOOLKIT/nuclei/nuclei"' },
      darwin: { shell: 'Homebrew', cmd: 'brew install nuclei' },
      windows: { shell: 'Release 二进制', cmd: '# 到 https://github.com/projectdiscovery/nuclei/releases 下载 nuclei_<版本>_windows_amd64.zip\n# 解压到 %DSH_HOME%\\redteam\\toolkit\\nuclei\\' },
    },
    verify: 'nuclei -version',
    note: '首次跑模板要联网更新：nuclei -update-templates。模板目录可在「环境适配」里指定。',
  },
  {
    id: 'naabu', label: 'naabu', names: ['naabu.exe', 'naabu'], dir: 'naabu',
    version: 'v2.6.1', runtime: [], kind: 'binary',
    repo: 'projectdiscovery/naabu', page: 'https://github.com/projectdiscovery/naabu/releases',
    get: {
      linux: { shell: 'Release 二进制', cmd: 'V=2.6.1\ncurl -fsSL -o /tmp/naabu.zip "https://github.com/projectdiscovery/naabu/releases/download/v${V}/naabu_${V}_linux_amd64.zip"\nunzip -o /tmp/naabu.zip -d "$TOOLKIT/naabu" && chmod +x "$TOOLKIT/naabu/naabu"' },
      darwin: { shell: 'Homebrew', cmd: 'brew install naabu' },
      windows: { shell: 'Release 二进制', cmd: '# https://github.com/projectdiscovery/naabu/releases 下载 naabu_<版本>_windows_amd64.zip' },
    },
    verify: 'naabu -version',
    note: 'SYN 扫描需 root，否则加 -scan-type c（connect 扫描，慢但不需权限）。',
  },
  {
    id: 'httpx', label: 'httpx（ProjectDiscovery）',
    names: ['httpx.exe', 'httpx-toolkit', 'pd-httpx', 'httpx'],
    dir: 'httpx', rejectPython: true, adapt: [/^httpx-toolkit$/, /^pd-httpx$/, /^httpx$/],
    version: 'v1.12.0', runtime: [], kind: 'binary',
    repo: 'projectdiscovery/httpx', page: 'https://github.com/projectdiscovery/httpx/releases',
    get: {
      linux: { shell: 'Release 二进制', cmd: 'V=1.12.0\ncurl -fsSL -o /tmp/httpx.zip "https://github.com/projectdiscovery/httpx/releases/download/v${V}/httpx_${V}_linux_amd64.zip"\nunzip -o /tmp/httpx.zip -d "$TOOLKIT/httpx" && chmod +x "$TOOLKIT/httpx/httpx"' },
      darwin: { shell: 'Homebrew', cmd: 'brew install httpx' },
      windows: { shell: 'Release 二进制', cmd: '# https://github.com/projectdiscovery/httpx/releases 下载 httpx_<版本>_windows_amd64.zip' },
    },
    verify: 'httpx -version',
    note: '**重名坑**：`/usr/bin/httpx` 是 Python httpx 库的 CLI，不是这个工具。'
      + '配置面板已按 rejectPython 排除，自己填路径时别填错。',
  },
  {
    id: 'dnsx', label: 'dnsx', names: ['dnsx.exe', 'dnsx'], dir: 'dnsx',
    version: 'v1.3.1', runtime: [], kind: 'binary',
    repo: 'projectdiscovery/dnsx', page: 'https://github.com/projectdiscovery/dnsx/releases',
    get: {
      linux: { shell: 'Release 二进制', cmd: 'V=1.3.1\ncurl -fsSL -o /tmp/dnsx.zip "https://github.com/projectdiscovery/dnsx/releases/download/v${V}/dnsx_${V}_linux_amd64.zip"\nunzip -o /tmp/dnsx.zip -d "$TOOLKIT/dnsx" && chmod +x "$TOOLKIT/dnsx/dnsx"' },
      darwin: { shell: 'Homebrew', cmd: 'brew install dnsx' },
      windows: { shell: 'Release 二进制', cmd: '# https://github.com/projectdiscovery/dnsx/releases 下载 dnsx_<版本>_windows_amd64.zip' },
    },
    verify: 'dnsx -version',
  },
  {
    id: 'subfinder', label: 'subfinder', names: ['subfinder.exe', 'subfinder'], dir: 'subfinder',
    version: 'v2.16.0', runtime: [], kind: 'binary',
    repo: 'projectdiscovery/subfinder', page: 'https://github.com/projectdiscovery/subfinder/releases',
    get: {
      linux: { shell: 'Release 二进制', cmd: 'V=2.16.0\ncurl -fsSL -o /tmp/subfinder.zip "https://github.com/projectdiscovery/subfinder/releases/download/v${V}/subfinder_${V}_linux_amd64.zip"\nunzip -o /tmp/subfinder.zip -d "$TOOLKIT/subfinder" && chmod +x "$TOOLKIT/subfinder/subfinder"' },
      darwin: { shell: 'Homebrew', cmd: 'brew install subfinder' },
      windows: { shell: 'Release 二进制', cmd: '# https://github.com/projectdiscovery/subfinder/releases 下载 subfinder_<版本>_windows_amd64.zip' },
    },
    verify: 'subfinder -version',
    note: '多源聚合需要各家 API key，配置在 ~/.config/subfinder/provider-config.yaml。',
  },
  {
    id: 'ksubdomain', label: 'ksubdomain', names: ['ksubdomain.exe', 'ksubdomain'], dir: 'ksubdomain',
    version: 'v0.7', runtime: [], kind: 'binary',
    repo: 'knownsec/ksubdomain', page: 'https://github.com/knownsec/ksubdomain/releases',
    get: {
      linux: { shell: 'Release 二进制', cmd: 'V=0.7\ncurl -fsSL -o /tmp/ksubdomain.zip "https://github.com/knownsec/ksubdomain/releases/download/v${V}/ksubdomain_${V}_linux_amd64.zip"\nunzip -o /tmp/ksubdomain.zip -d "$TOOLKIT/ksubdomain" && chmod +x "$TOOLKIT/ksubdomain/ksubdomain"' },
      darwin: { shell: 'Release 二进制', cmd: '# https://github.com/knownsec/ksubdomain/releases 选 darwin 资产' },
      windows: { shell: 'Release 二进制', cmd: '# https://github.com/knownsec/ksubdomain/releases 下载 windows_amd64 资产' },
    },
    verify: 'ksubdomain --help',
    note: '无状态爆破，Linux 下需 root 或 setcap（发包用原始套接字）。',
  },
  {
    id: 'oneforall', label: 'OneForAll', names: ['oneforall.py', 'OneForAll'], dir: 'oneforall',
    version: 'v0.4.5', runtime: ['python3', 'git'], kind: 'source',
    repo: 'shmilylty/OneForAll', page: 'https://github.com/shmilylty/OneForAll',
    get: {
      linux: { shell: '源码 + venv', cmd: 'git clone --depth 1 https://github.com/shmilylty/OneForAll "$TOOLKIT/oneforall"\ncd "$TOOLKIT/oneforall" && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt' },
      darwin: { shell: '源码 + venv', cmd: 'git clone --depth 1 https://github.com/shmilylty/OneForAll "$TOOLKIT/oneforall"\ncd "$TOOLKIT/oneforall" && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt' },
      windows: { shell: '源码 + venv', cmd: 'git clone --depth 1 https://github.com/shmilylty/OneForAll "%TOOLKIT%\\oneforall"\ncd /d "%TOOLKIT%\\oneforall" && python -m venv .venv && .venv\\Scripts\\pip install -r requirements.txt' },
    },
    verify: 'cd "$TOOLKIT/oneforall" && .venv/bin/python oneforall.py --help',
    note: '仓库无 Release 资产，只能源码安装。字典较大，跑起来慢。',
  },
  {
    id: 'fscan', label: 'fscan', names: ['fscan.exe', 'fscan'], dir: 'fscan',
    version: 'v2.2.2', runtime: [], kind: 'binary',
    repo: 'shadow1ng/fscan', page: 'https://github.com/shadow1ng/fscan/releases',
    get: {
      linux: { shell: 'Release 二进制', cmd: 'V=2.2.2\ncurl -fsSL -o "$TOOLKIT/fscan/fscan" "https://github.com/shadow1ng/fscan/releases/download/v${V}/fscan-nolocal_${V#v}_linux_x64"\nchmod +x "$TOOLKIT/fscan/fscan"' },
      darwin: { shell: 'Release 二进制', cmd: '# https://github.com/shadow1ng/fscan/releases 选 darwin 资产（若有）' },
      windows: { shell: 'Release 二进制', cmd: '# https://github.com/shadow1ng/fscan/releases 下载 fscan_<版本>_windows_x64.exe' },
    },
    verify: 'fscan -h',
    note: '资产名带 nolocal（不含本地提权模块）与 web 变体，按需选。ARM 需自己找构建。',
  },
  {
    id: 'gogo', label: 'gogo', names: ['gogo.exe', 'gogo'], dir: 'gogo',
    version: 'v2.15.0', runtime: [], kind: 'binary',
    repo: 'chainreactors/gogo', page: 'https://github.com/chainreactors/gogo/releases',
    get: {
      linux: { shell: 'Release 二进制', cmd: 'V=2.15.0\ncurl -fsSL -o "$TOOLKIT/gogo/gogo" "https://github.com/chainreactors/gogo/releases/download/v${V}/gogo_linux_amd64"\nchmod +x "$TOOLKIT/gogo/gogo"' },
      darwin: { shell: 'Release 二进制', cmd: '# https://github.com/chainreactors/gogo/releases 选 darwin 资产' },
      windows: { shell: 'Release 二进制', cmd: '# https://github.com/chainreactors/gogo/releases 下载 gogo_windows_amd64.exe' },
    },
    verify: './gogo -h',
    note: '单静态二进制，指纹规则内置，零依赖。大网段先用 --ping 过滤，别直接 -p -。',
  },
  {
    id: 'ffuf', label: 'ffuf', names: ['ffuf.exe', 'ffuf'], dir: 'ffuf',
    version: 'v2.3.0', runtime: [], kind: 'binary',
    repo: 'ffuf/ffuf', page: 'https://github.com/ffuf/ffuf/releases',
    get: {
      linux: { shell: 'Release 二进制', cmd: 'V=2.3.0\ncurl -fsSL -o /tmp/ffuf.tgz "https://github.com/ffuf/ffuf/releases/download/v${V}/ffuf_${V}_linux_amd64.tar.gz"\ntar -xzf /tmp/ffuf.tgz -C "$TOOLKIT/ffuf" && chmod +x "$TOOLKIT/ffuf/ffuf"' },
      darwin: { shell: 'Homebrew', cmd: 'brew install ffuf' },
      windows: { shell: 'Release 二进制', cmd: '# https://github.com/ffuf/ffuf/releases 下载 ffuf_<版本>_windows_amd64.zip' },
    },
    verify: 'ffuf -V',
  },
  {
    id: 'dirsearch', label: 'dirsearch', names: ['dirsearch', 'dirsearch.py'], dir: 'dirsearch',
    version: 'v0.5.0', runtime: ['python3', 'git'], kind: 'source',
    repo: 'maurosoria/dirsearch', page: 'https://github.com/maurosoria/dirsearch',
    get: {
      linux: { shell: '源码（官方不给二进制）', cmd: 'git clone --depth 1 https://github.com/maurosoria/dirsearch "$TOOLKIT/dirsearch"\nchmod +x "$TOOLKIT/dirsearch/dirsearch.py"' },
      darwin: { shell: '源码', cmd: 'git clone --depth 1 https://github.com/maurosoria/dirsearch "$TOOLKIT/dirsearch"' },
      windows: { shell: '源码', cmd: 'git clone --depth 1 https://github.com/maurosoria/dirsearch "%TOOLKIT%\\dirsearch"\npython "%TOOLKIT%\\dirsearch\\dirsearch.py" --help' },
    },
    verify: 'python3 "$TOOLKIT/dirsearch/dirsearch.py" --version',
    note: 'Python 脚本，无需 venv（依赖见 requirements.txt）。`清单.md` 是说明文件，缺了不代表没装。',
  },
  {
    id: 'katana', label: 'katana', names: ['katana.exe', 'katana'], dir: 'katana',
    version: 'v1.8.0', runtime: [], kind: 'binary', optional: true,
    repo: 'projectdiscovery/katana', page: 'https://github.com/projectdiscovery/katana/releases',
    get: {
      linux: { shell: 'Release 二进制', cmd: 'V=1.8.0\ncurl -fsSL -o /tmp/katana.zip "https://github.com/projectdiscovery/katana/releases/download/v${V}/katana_${V}_linux_amd64.zip"\nunzip -o /tmp/katana.zip -d "$TOOLKIT/katana" && chmod +x "$TOOLKIT/katana/katana"' },
      darwin: { shell: 'Homebrew', cmd: 'brew install katana' },
      windows: { shell: 'Release 二进制', cmd: '# https://github.com/projectdiscovery/katana/releases 下载 katana_<版本>_windows_amd64.zip' },
    },
    verify: 'katana -version',
    note: '需要浏览器渲染时用 -headless，依赖本机 Chrome/Chromium。',
  },

  /* ---------------- 隧道 / 内网 ---------------- */
  {
    id: 'suo5', label: 'suo5', names: ['suo5.exe', 'suo5-windows-amd64.exe', 'suo5-linux-amd64', 'suo5'], dir: 'suo5',
    version: 'v2.2.0', runtime: [], kind: 'binary',
    repo: 'zema1/suo5', page: 'https://github.com/zema1/suo5/releases',
    get: {
      linux: { shell: 'Release 二进制', cmd: 'V=2.2.0\ncurl -fsSL -o "$TOOLKIT/suo5/suo5-linux-amd64" "https://github.com/zema1/suo5/releases/download/v${V}/suo5-linux-amd64"\nchmod +x "$TOOLKIT/suo5/suo5-linux-amd64"' },
      darwin: { shell: 'Release 二进制', cmd: '# https://github.com/zema1/suo5/releases 选 darwin 资产' },
      windows: { shell: 'Release 二进制', cmd: '# https://github.com/zema1/suo5/releases 下载 suo5-windows-amd64.exe' },
    },
    verify: './suo5-linux-amd64 --help',
    note: '静态 Go，无依赖。文件名带平台后缀，属正常现象（与清单 names 已对齐）。',
  },
  {
    id: 'chisel', label: 'chisel', names: ['chisel.exe', 'chisel'], dir: 'chisel',
    version: 'v1.12.0', runtime: [], kind: 'binary',
    repo: 'jpillora/chisel', page: 'https://github.com/jpillora/chisel/releases',
    get: {
      linux: { shell: 'Release 二进制', cmd: 'V=1.12.0\ncurl -fsSL -o /tmp/chisel.tgz "https://github.com/jpillora/chisel/releases/download/v${V}/chisel_${V#v}_linux_amd64.tar.gz"\ntar -xzf /tmp/chisel.tgz -C "$TOOLKIT/chisel" && chmod +x "$TOOLKIT/chisel/chisel"' },
      darwin: { shell: 'Homebrew', cmd: 'brew install chisel' },
      windows: { shell: 'Release 二进制', cmd: '# https://github.com/jpillora/chisel/releases 下载 chisel_<版本>_windows_amd64.zip' },
    },
    verify: './chisel --version',
    note: '服务端与客户端是同一个二进制，靠 `chisel server` / `chisel client` 区分子命令。',
  },
  {
    id: 'frpc', label: 'frp 客户端', names: ['frpc.exe', 'frpc'], dir: 'frp',
    version: 'v0.71.0', runtime: [], kind: 'binary',
    repo: 'fatedier/frp', page: 'https://github.com/fatedier/frp/releases',
    get: {
      linux: { shell: 'Release 压缩包', cmd: 'V=0.71.0\ncurl -fsSL -o /tmp/frp.tgz "https://github.com/fatedier/frp/releases/download/v${V}/frp_${V#v}_linux_amd64.tar.gz"\nmkdir -p "$TOOLKIT/frp" && tar -xzf /tmp/frp.tgz -C /tmp && cp /tmp/frp_${V#v}_linux_amd64/frpc /tmp/frp_${V#v}_linux_amd64/frps "$TOOLKIT/frp/" && chmod +x "$TOOLKIT/frp/"frp*' },
      darwin: { shell: 'Homebrew', cmd: 'brew install frpc\nbrew install frps' },
      windows: { shell: 'Release 压缩包', cmd: '# https://github.com/fatedier/frp/releases 下载 frp_<版本>_windows_amd64.zip\n# 解压后把 frpc.exe 与 frps.exe 放进 %TOOLKIT%\\frp\\' },
    },
    verify: './frpc --version',
    note: 'frpc 放目标机、frps 放 VPS，两者同目录。服务端见下一个条目。',
  },
  {
    id: 'frps', label: 'frp 服务端', names: ['frps.exe', 'frps'], dir: 'frp',
    version: 'v0.71.0', runtime: [], kind: 'binary',
    repo: 'fatedier/frp', page: 'https://github.com/fatedier/frp/releases',
    get: {
      linux: { shell: 'Release 压缩包（与 frpc 同一个包）', cmd: 'V=0.71.0\ncurl -fsSL -o /tmp/frp.tgz "https://github.com/fatedier/frp/releases/download/v${V}/frp_${V#v}_linux_amd64.tar.gz"\nmkdir -p "$TOOLKIT/frp" && tar -xzf /tmp/frp.tgz -C /tmp && cp /tmp/frp_${V#v}_linux_amd64/frpc /tmp/frp_${V#v}_linux_amd64/frps "$TOOLKIT/frp/" && chmod +x "$TOOLKIT/frp/"frp*' },
      darwin: { shell: 'Homebrew', cmd: 'brew install frps' },
      windows: { shell: 'Release 压缩包', cmd: '# 与 frpc 同一个 zip，解压后 frps.exe 放进 %TOOLKIT%\\frp\\' },
    },
    verify: './frps --version',
    note: '与 frpc 同目录、同版本，通常在 VPS 上启动。',
  },
  {
    id: 'impacket', label: 'impacket', names: ['impacket-secretsdump', 'impacket-secretsdump.exe', 'secretsdump.py', 'impacket'],
    dir: 'impacket', runtime: ['python3'], kind: 'source',
    adapt: [/^impacket-secretsdump$/, /^secretsdump\.py$/],
    version: '0.13.1',
    repo: 'fortra/impacket', page: 'https://github.com/fortra/impacket/releases',
    get: {
      linux: { shell: 'pipx（推荐，隔离依赖）', cmd: 'sudo apt install -y pipx && pipx install impacket\n# 或包管理器：sudo apt install -y python3-impacket' },
      darwin: { shell: 'pipx', cmd: 'brew install pipx && pipx install impacket' },
      windows: { shell: 'pip', cmd: 'python -m pip install impacket\n# 脚本会装到 Python 的 Scripts 目录，把该目录填进 binDirs' },
    },
    verify: 'impacket-secretsdump -h',
    note: 'Python 包，入口是一堆脚本（secretsdump.py / psexec.py / wmiexec.py …）。'
      + '配置时填**目录**或任一入口脚本路径即可。',
  },

  /* ---------------- Web 落地 / 后渗透 ---------------- */
  {
    id: 'behinder', label: 'Behinder（冰蝎）', names: ['Behinder.jar', 'behinder.jar'], dir: 'Behinder',
    version: 'v4.1', runtime: ['java'], kind: 'jar',
    repo: 'rebeyond/Behinder', page: 'https://github.com/rebeyond/Behinder/releases',
    get: {
      linux: { shell: 'Release 下载', cmd: '# 到 https://github.com/rebeyond/Behinder/releases 下载 Behinder_v4.1.zip\n# 解压后把 Behinder.jar 放进 "$TOOLKIT/Behinder/"' },
      darwin: { shell: 'Release 下载', cmd: '# 同上，Behinder.jar 放进 "$TOOLKIT/Behinder/"' },
      windows: { shell: 'Release 下载', cmd: '# 解压后把 Behinder.jar 放进 %TOOLKIT%\\Behinder\\' },
    },
    verify: 'java -jar "$TOOLKIT/Behinder/Behinder.jar"',
    note: '需要 Java。**带图形界面**，WSL / 无桌面环境跑不起来（要 X11 转发）。',
  },
  {
    id: 'godzilla', label: 'Godzilla（哥斯拉）', names: ['godzilla.jar', 'Godzilla.jar'], dir: 'Godzilla',
    version: 'v4.0.1', runtime: ['java'], kind: 'jar',
    repo: 'BeichenDream/Godzilla', page: 'https://github.com/BeichenDream/Godzilla/releases',
    get: {
      linux: { shell: 'Release 下载', cmd: '# 到 https://github.com/BeichenDream/Godzilla/releases 下载 Godzilla-v4.0.1.jar\n# 放进 "$TOOLKIT/Godzilla/godzilla.jar"' },
      darwin: { shell: 'Release 下载', cmd: '# 同上，放进 "$TOOLKIT/Godzilla/godzilla.jar"' },
      windows: { shell: 'Release 下载', cmd: '# 放进 %TOOLKIT%\\Godzilla\\godzilla.jar' },
    },
    verify: 'java -jar "$TOOLKIT/Godzilla/godzilla.jar"',
    note: '需要 Java。**带图形界面**，需要桌面环境。',
  },
  {
    id: 'antsword', label: 'AntSword（中国蚁剑）', names: ['AntSword', 'AntSword.exe'], dir: 'AntSword',
    version: 'v4.0.3', runtime: [], kind: 'binary', optional: true,
    repo: 'AntSwordProject/AntSword-Loader', page: 'https://github.com/AntSwordProject/AntSword-Loader/releases',
    get: {
      linux: { shell: 'Loader + 源码', cmd: '# 到 https://github.com/AntSwordProject/AntSword-Loader/releases 下载 linux-x64 Loader\n# 解压到 "$TOOLKIT/AntSword/"；再下 https://github.com/AntSwordProject/antSword 源码\n# 首次启动时选择 antSword 源码目录' },
      darwin: { shell: 'Loader + 源码', cmd: '# 同上，选 mac 版 Loader' },
      windows: { shell: 'Loader + 源码', cmd: '# 下载 windows Loader，解压到 %TOOLKIT%\\AntSword\\，首次启动选 antSword 源码目录' },
    },
    verify: '运行 Loader 后能进入蚁剑界面',
    note: '自带 Electron，不需要 Java。首次启动必须手动选源码目录，否则起不来。',
  },
]

/** 旧名兼容：TOOL_CATALOG 现在由 TOOLKIT_CATALOG 派生。 */
export const TOOL_CATALOG = TOOLKIT_CATALOG.map((t) => ({
  id: t.id,
  label: t.label,
  names: t.names,
  rejectPython: !!t.rejectPython,
  adapt: t.adapt,
}))

/** id → 清单条目。 */
export const TOOL_BY_ID = new Map(TOOLKIT_CATALOG.map((t) => [t.id, t]))

/** id → 运行时定义。 */
export const RUNTIME_BY_ID = new Map(RUNTIME_CATALOG.map((r) => [r.id, r]))

/** 工具的存放目录名（相对 toolkitDir）。 */
export function toolDirName(id) {
  const t = TOOL_BY_ID.get(id)
  return (t && t.dir) || (TOOL_DIRS[id] || id)
}

/** 该工具的运行环境说明，用于面板与 preflight 展示。 */
export function runtimeNeedOf(id) {
  const t = TOOL_BY_ID.get(id)
  if (!t) return []
  return (t.runtime || []).map((rid) => {
    const r = RUNTIME_BY_ID.get(rid)
    return { id: rid, label: r ? r.label : rid, optional: !!(r && r.optional) }
  })
}

export default {
  TOOLKIT_CATALOG,
  TOOL_CATALOG,
  RUNTIME_CATALOG,
  TOOL_DIRS,
  TOOL_BY_ID,
  RUNTIME_BY_ID,
  toolDirName,
  runtimeNeedOf,
}
