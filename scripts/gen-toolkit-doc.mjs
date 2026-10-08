/**
 * 从 lib/redteam/toolkit-catalog.js 生成 docs/TOOLKIT.md 的表格部分。
 *
 * 用法：node scripts/gen-toolkit-doc.mjs           # 打印到 stdout
 *       node scripts/gen-toolkit-doc.mjs --write   # 写回 docs/TOOLKIT.md 的标记之间
 *
 * 为什么生成而不是手写：工具版本会变、清单会加条目，手写表格必然与代码脱节。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TOOLKIT_CATALOG, RUNTIME_CATALOG } from '../lib/redteam/toolkit-catalog.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const RUNTIME_LABEL = new Map(RUNTIME_CATALOG.map((r) => [r.id, r.label]))

const runtimeText = (t) => {
  const ids = t.runtime || []
  if (ids.length === 0) return '零依赖'
  return ids.map((id) => RUNTIME_LABEL.get(id) || id).join(' + ')
}

const kindText = (t) => {
  if (t.kind === 'source') return '源码目录'
  if (t.kind === 'jar') return 'Java 图形界面'
  return '单文件二进制'
}

const table = () => [
  '| 工具 | 存放目录 | 核对版本 | 形态 | 运行环境 |',
  '| --- | --- | --- | --- | --- |',
  ...TOOLKIT_CATALOG.map((t) => '| ' + [
    t.label, '`${TOOLKIT}/' + t.dir + '/`', t.version, kindText(t), runtimeText(t),
  ].join(' | ') + ' |'),
].join('\n')

const runtimeTable = () => [
  '| 运行时 | 必需性 | 谁需要它 | Linux 安装命令 |',
  '| --- | --- | --- | --- |',
  ...RUNTIME_CATALOG.map((r) => '| ' + [
    r.label,
    r.optional ? '可选' : '**必需**',
    r.need || '',
    '`' + (r.install.linux || '') + '`',
  ].join(' | ') + ' |'),
].join('\n')

const BEGIN = '<!-- TOOLKIT_TABLE_BEGIN -->'
const END = '<!-- TOOLKIT_TABLE_END -->'
const RBEGIN = '<!-- RUNTIME_TABLE_BEGIN -->'
const REND = '<!-- RUNTIME_TABLE_END -->'

if (!process.argv.includes('--write')) {
  console.log(table())
  console.log()
  console.log(runtimeTable())
} else {
  const p = join(root, 'docs', 'TOOLKIT.md')
  let text = readFileSync(p, 'utf8')
  for (const [b, e, body] of [[BEGIN, END, table()], [RBEGIN, REND, runtimeTable()]]) {
    const bi = text.indexOf(b)
    const ei = text.indexOf(e)
    if (bi < 0 || ei < 0) throw new Error('docs/TOOLKIT.md 缺少标记 ' + b)
    text = text.slice(0, bi + b.length) + '\n' + body + '\n' + text.slice(ei)
  }
  writeFileSync(p, text)
  console.log('已更新 docs/TOOLKIT.md（' + TOOLKIT_CATALOG.length + ' 个工具，' + RUNTIME_CATALOG.length + ' 项运行时）')
}
