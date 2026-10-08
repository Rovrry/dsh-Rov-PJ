#!/usr/bin/env bash
# ============================================================
#  dsh-purge 红队工具箱安装脚本（Linux x86_64）
#
#  · 工具统一装到 ${TOOLKIT}（默认 $DSH_HOME/redteam/toolkit），一个工具一个子目录
#  · 下载走 api.github.com —— 本机 github.com 主域不通，这条路可绕开
#  · 匿名 API 限额仅 60 次/小时，装 12 个工具会触顶。脚本会自动尝试
#    使用 gh auth token（限额 5000/小时）；也可自己传 GH_TOKEN
#  · 自动挑选版本：先按平台+架构过滤资产，再按工具专属文件名精确匹配
#  · 装完写 paths.json，可在插件「环境适配」页导入
#  · 只装 CLI 工具。Java 图形界面程序（冰蝎/哥斯拉）与需登录的工具
#    （AntSword）请按 docs/TOOLKIT.md 手动装
#
#  用法：
#    bash install-toolkit.sh                  # 装全部
#    bash install-toolkit.sh nuclei gogo      # 只装指定的
#    TOOLKIT=/opt/tools bash install-toolkit.sh
# ============================================================
set -u

TOOLKIT="${TOOLKIT:-${DSH_HOME:-$HOME/.dsh}/redteam/toolkit}"
ONLY=("$@")
PY="$(command -v python3 || command -v python)"
[ -z "$PY" ] && { echo "❌ 需要 python3"; exit 1; }

echo "工具箱目录: $TOOLKIT"
mkdir -p "$TOOLKIT"
echo

export TOOLKIT
"$PY" - "${ONLY[@]:-}" <<'PY_EOF'
import json, os, sys, tarfile, urllib.request, zipfile, io, stat, re

TOOLKIT = os.environ['TOOLKIT']
ONLY = [a for a in sys.argv[1:] if a]

# 平台+架构过滤：资产名里必须同时出现这些才算本机可用
ARCH_KEYS = ['linux_amd64', 'linux-amd64', 'linux_64', 'linux_x64', 'linux64',
             'linux_x86_64', 'amd64_linux']
# 明确排除的（其他架构/平台，防止错配）
BAD_KEYS = ['arm64', 'aarch64', 'armv', '386', 'i386', 'mips', 'ppc', 's390',
            'freebsd', 'openbsd', 'netbsd', 'darwin', 'macos', 'osx', 'windows',
            'win32', 'win64', '.exe', 'android', 'apk', 'deb', 'rpm', '_mac', '_win']

# id -> (repo, 首选文件名(精确/优先), 兜底关键字, 需要保留的所有可执行名)
TOOLS = [
  ('nuclei',    'projectdiscovery/nuclei',    ['nuclei_%(v)s_linux_amd64.zip'],  ['nuclei'],    ['nuclei']),
  ('httpx',     'projectdiscovery/httpx',     ['httpx_%(v)s_linux_amd64.zip'],   ['httpx'],     ['httpx']),
  ('dnsx',      'projectdiscovery/dnsx',      ['dnsx_%(v)s_linux_amd64.zip'],    ['dnsx'],      ['dnsx']),
  ('subfinder', 'projectdiscovery/subfinder', ['subfinder_%(v)s_linux_amd64.zip'],['subfinder'],['subfinder']),
  ('naabu',     'projectdiscovery/naabu',     ['naabu_%(v)s_linux_amd64.zip'],   ['naabu'],     ['naabu']),
  ('katana',    'projectdiscovery/katana',    ['katana_%(v)s_linux_amd64.zip'],  ['katana'],    ['katana']),
  ('ffuf',      'ffuf/ffuf',                  ['ffuf_%(v)s_linux_amd64.tar.gz'], ['ffuf'],      ['ffuf']),
  ('gogo',      'chainreactors/gogo',         ['gogo_linux_amd64'],              ['gogo_linux'],['gogo']),
  ('suo5',      'zema1/suo5',                 ['suo5-linux-amd64'],              ['suo5-linux'],['suo5']),
  ('chisel',    'jpillora/chisel',            ['chisel_%(v)s_linux_amd64.gz'],   ['linux_amd64.gz'], ['chisel']),
  ('fscan',     'shadow1ng/fscan',            ['fscan_%(v)s_linux_x64'],         ['linux_x64'], ['fscan']),
  ('frp',       'fatedier/frp',               ['frp_%(v)s_linux_amd64.tar.gz'],  ['linux_amd64.tar.gz'], ['frpc', 'frps']),
  ('ksubdomain', 'knownsec/ksubdomain',        ['ksubdomain_linux.zip'],           ['ksubdomain_linux'],   ['ksubdomain']),
]

def resolve_token():
    """优先环境变量 GH_TOKEN / GITHUB_TOKEN，其次 gh auth token。"""
    for k in ('GH_TOKEN', 'GITHUB_TOKEN'):
        v = os.environ.get(k, '').strip()
        if v:
            return v
    try:
        import subprocess
        r = subprocess.run(['gh', 'auth', 'token'], capture_output=True, text=True, timeout=20)
        if r.returncode == 0:
            t = (r.stdout or '').strip()
            if t:
                return t
    except Exception:
        pass
    return ''

TOKEN = resolve_token()

def _open(url, accept, timeout, tries=4):
    """带退避重试；遇到 403 限流时提示。"""
    import time
    last = None
    for i in range(tries):
        req = urllib.request.Request(url, headers={
            'Accept': accept,
            'User-Agent': 'dsh-purge-toolkit',
        })
        if TOKEN:
            req.add_header('Authorization', 'Bearer ' + TOKEN)
        try:
            return urllib.request.urlopen(req, timeout=timeout)
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (403, 429) and i < tries - 1:
                wait = 3 * (i + 1)
                print(f'      限流，{wait}s 后重试…（第 {i+1} 次）')
                time.sleep(wait)
                continue
            if e.code == 403:
                raise RuntimeError(
                    'API 限流（匿名 60 次/小时）。设 GH_TOKEN 或先跑 gh auth login'
                ) from e
            raise
        except Exception as e:
            last = e
            if i < tries - 1:
                import time as _t
                _t.sleep(2 * (i + 1))
                continue
            raise
    raise last

def fetch(url, timeout=300):
    with _open(url, 'application/octet-stream', timeout) as r:
        return r.read()

def latest(repo):
    with _open(f'https://api.github.com/repos/{repo}/releases/latest',
               'application/vnd.github+json', 40) as r:
        return json.load(r)

def is_this_platform(name):
    n = name.lower()
    if any(b in n for b in BAD_KEYS):
        return False
    return any(a in n for a in ARCH_KEYS)

def pick(assets, prefer, fallback):
    """先按首选文件名（支持 %(v)s 版本占位）匹配，再退回「平台过滤 + 关键字」。"""
    names = {a['name']: a for a in assets}
    for p in prefer:
        if '%(v)s' not in p:
            if p in names:
                return names[p]
            continue
        pat = re.compile('^' + re.escape(p).replace(r'\%\(v\)s', r'[0-9][0-9A-Za-z.\-]*') + '$')
        for n, a in names.items():
            if pat.match(n):
                return a
    for k in fallback:
        for n, a in names.items():
            if k in n.lower() and is_this_platform(n):
                return a
    return None

def unpack(blob, name, dest):
    got = []
    if name.endswith('.zip'):
        with zipfile.ZipFile(io.BytesIO(blob)) as z:
            for m in z.namelist():
                if m.endswith('/') or '__MACOSX' in m:
                    continue
                base = os.path.basename(m)
                if not base:
                    continue
                out = os.path.join(dest, base)
                with open(out, 'wb') as f:
                    f.write(z.read(m))
                got.append(out)
    elif name.endswith(('.tar.gz', '.tgz')):
        with tarfile.open(fileobj=io.BytesIO(blob), mode='r:gz') as t:
            for m in t.getmembers():
                if not m.isfile():
                    continue
                base = os.path.basename(m.name)
                if not base:
                    continue
                out = os.path.join(dest, base)
                with open(out, 'wb') as f:
                    f.write(t.extractfile(m).read())
                got.append(out)
    elif name.endswith('.gz'):
        out = os.path.join(dest, os.path.basename(name)[:-3])
        with open(out, 'wb') as f:
            f.write(blob)
        got.append(out)
    else:
        out = os.path.join(dest, os.path.basename(name))
        with open(out, 'wb') as f:
            f.write(blob)
        got.append(out)
    return got

print(f'API 认证: {"已用 token（限额 5000/小时）" if TOKEN else "匿名（限额 60/小时，装多个工具会触顶）"}')
print()

ok, fail = [], []

for tid, repo, prefer, fallback, want_exes in TOOLS:
    if ONLY and tid not in ONLY:
        continue
    dest = os.path.join(TOOLKIT, tid)
    os.makedirs(dest, exist_ok=True)
    print(f'── {tid}')
    try:
        rel = latest(repo)
        tag = rel.get('tag_name') or ''
        ver = tag.lstrip('v')
        pref = [p.replace('%(v)s', ver) for p in prefer]
        a = pick(rel.get('assets', []), pref, fallback)
        if a is None:
            print(f'   ⚠️ {tag} 里找不到 linux/amd64 资产，跳过')
            fail.append((tid, 'no linux/amd64 asset'))
            continue
        blob = fetch(a['url'])
        files = unpack(blob, a['name'], dest)
        for p in files:
            os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        # 为每个需要的可执行名建符号链接（指向真实文件）
        linked = []
        for w in want_exes:
            real = os.path.join(dest, w)
            if os.path.isfile(real):
                linked.append(w)
                continue
            cand = [p for p in files if os.path.basename(p).startswith(w)]
            if not cand:
                # frpc/frps 这类：按精确 basename 找
                cand = [p for p in files if os.path.basename(p) == w]
            if cand:
                src = max(cand, key=lambda p: os.path.getsize(p))
                if os.path.basename(src) != w:
                    try:
                        os.symlink(os.path.basename(src), real)
                    except FileExistsError:
                        pass
                linked.append(w)
        total = sum(os.path.getsize(p) for p in files) / 1048576
        print(f'   ✅ {tag}  →  {a["name"]}  解出 {len(files)} 个文件 ({total:.1f} MB)')
        print(f'      可用入口: {", ".join(linked) if linked else "（无约定名，见上）"}')
        if linked:
            ok.append((tid, os.path.join(dest, linked[0])))
        else:
            fail.append((tid, 'no expected executable'))
    except Exception as e:
        print(f'   ❌ 失败: {str(e)[:90]}')
        fail.append((tid, str(e)[:90]))

paths = {tid: p for tid, p in ok}
with open(os.path.join(TOOLKIT, 'paths.json'), 'w') as f:
    json.dump(paths, f, indent=2, ensure_ascii=False)

print()
print(f'成功 {len(ok)} 个，失败 {len(fail)} 个')
for t, e in fail:
    print(f'  · {t}: {e}')
print(f'路径清单: {os.path.join(TOOLKIT, "paths.json")}')
PY_EOF

echo
echo "════════ 结果核对（只看文件在不在、能不能执行）════════"
for t in nuclei httpx dnsx subfinder naabu katana ffuf gogo suo5 chisel frp fscan ksubdomain; do
  d="$TOOLKIT/$t"; [ -d "$d" ] || continue
  names=""
  case "$t" in
    frp) names="frpc frps" ;;
    *)   names="$t" ;;
  esac
  for n in $names; do
    if [ -x "$d/$n" ]; then
      printf "  ✅ %-10s %s\n" "$t/$n" "$(readlink -f "$d/$n" | sed "s|$TOOLKIT/||")"
    else
      printf "  ⚠️  %-10s 未找到约定名（实际文件：%s）\n" "$t/$n" "$(ls "$d" 2>/dev/null | tr '\n' ' ')"
    fi
  done
done

echo
echo "════════ 还需手动处理 ════════"
if command -v java >/dev/null 2>&1; then
  echo "  ✅ Java 已装（冰蝎 / 哥斯拉可用）"
else
  echo "  ❌ Java 未装（冰蝎 Behinder / 哥斯拉 Godzilla 必需）"
  echo "       sudo apt install -y default-jre"
fi
cat <<EOF
  ⬜ nmap / masscan   sudo apt install -y nmap masscan
  ⬜ impacket         sudo apt install -y pipx && pipx install impacket
  ⬜ dirsearch        git clone --depth 1 https://github.com/maurosoria/dirsearch "$TOOLKIT/dirsearch"
  ⬜ OneForAll        git clone --depth 1 https://github.com/shmilylty/OneForAll "$TOOLKIT/oneforall"
                      cd "$TOOLKIT/oneforall" && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
  ⬜ 冰蝎 / 哥斯拉    GitHub Release 下 jar，放 "$TOOLKIT/Behinder/" 与 "$TOOLKIT/Godzilla/"
  ⬜ nuclei 模板      "$TOOLKIT/nuclei/nuclei" -update-templates
EOF
echo
echo "装完打开 dsh-purge →「环境适配」→ 刷新，应能看到工具被识别。"
