#!/usr/bin/env node
/**
 * 生成汉字笔顺数据（v0.9 NFR §2.2）。
 *
 * 数据源：hanzi-writer-data（devDependency，Arphic Public License，整包 32.3 MB / 9000+ 字）。
 * 产物：src/data/strokes/group-<key>.ts × 8 + src/data/strokes/manifest.json。
 *
 * 为什么在构建期抽而不运行时引：运行时只用到 321 字；按八个主题组切块后，
 * 首屏只需要 manifest（约 4 kB）判断「有没有笔顺按钮」，数据等点开才加载。
 *
 * 许可：产物是 Arphic 字体数据的衍生物（许可 §0 把「转换格式」也算作 Font），
 * 每个生成文件都带修改声明（§2a），许可证全文在 licenses/ARPHICPL.TXT，
 * 归纳见 THIRD-PARTY-NOTICES.md §2.3。
 *
 * 幂等：同一份 hanzi-writer-data 重复运行产物逐字节一致；数据没变时保留上次的
 * updatedAt 与文件头日期，避免每天跑一次就产生噪声 diff。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(import.meta.dirname, '..');
const DATA_DIR = resolve(ROOT, 'node_modules/hanzi-writer-data');
const OUT_DIR = resolve(ROOT, 'src/data/strokes');
const GROUPS_SRC = resolve(ROOT, 'src/data/seed/characterGroups.ts');
const CARDS_SRC = resolve(ROOT, 'src/data/seed/cards.ts');

/** 组常量名 → 输出文件名用的组 key，顺序与 characterGroups.ts 一致 */
const GROUPS = [
  ['NUMBERS', 'numbers'],
  ['BODY', 'body'],
  ['NATURE', 'nature'],
  ['ANIMALS', 'animals'],
  ['SPACE', 'space'],
  ['ACTION', 'action'],
  ['DAILY', 'daily'],
  ['SPEECH', 'speech'],
];

/** 汉字卡总数（v0.5 起）：脚本层自守，防止解析退化后「少抽一半也全绿」 */
const EXPECT_CHARS = 321;
/** 单字笔画上限：与 LIMITS.STROKES_MAX 对齐，超出即认为是解析错位 */
const MAX_STROKES = 30;
/** 只要求「有笔顺数据」的库包版本，写在产物里供人工核对 */
const DATA_PKG = 'hanzi-writer-data@2.0.1';

/** 取 `const X = [ ... ];` 的数组体（不含中括号），找不到即抛错 */
function sliceBlock(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`未在源文件里找到 ${marker}`);
  // 行首的 `]` 两种结尾都算：`];` 与 `] as const;`
  const end = source.indexOf('\n]', start);
  if (end < 0) throw new Error(`${marker} 之后找不到数组结尾`);
  return source.slice(start + marker.length, end);
}

/** 从组常量里取汉字（只认单字字符串，注释与组名不受影响） */
function parseGroupChars(source, constName) {
  const block = sliceBlock(source, `const ${constName} = [`);
  return [...block.matchAll(/'([\u3400-\u9fff])'/g)].map((match) => match[1]);
}

/**
 * 从 CHARACTERS 表里取「字 → 卡片上写的笔画数」，用于生成期交叉核对：
 * 笔顺数据的笔画数与卡片字段不一致时在这里就报出来，不等门禁 V8。
 */
function parseCardStrokes(source) {
  const block = sliceBlock(source, 'const CHARACTERS: readonly CharRow[] = [');
  const map = new Map();
  for (const match of block.matchAll(/^\s*\['[^']+', '(.)', '[^']*', '[^']*', (\d+),/gm)) {
    map.set(match[1], Number(match[2]));
  }
  return map;
}

/** 读单字数据，缺字或结构不对返回 null 并把原因交给调用方记录 */
function loadChar(zh) {
  const file = resolve(DATA_DIR, `${zh}.json`);
  if (!existsSync(file)) return { data: null, reason: '数据包内无此字' };
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(raw.strokes) || !Array.isArray(raw.medians)) {
    return { data: null, reason: '缺少 strokes 或 medians 字段' };
  }
  if (raw.strokes.length === 0 || raw.strokes.length > MAX_STROKES) {
    return { data: null, reason: `笔画数异常（${raw.strokes.length}）` };
  }
  if (raw.strokes.length !== raw.medians.length) {
    return { data: null, reason: `strokes ${raw.strokes.length} 笔、medians ${raw.medians.length} 笔，二者不一致` };
  }
  return { data: { strokes: raw.strokes, medians: raw.medians }, reason: '' };
}

function renderGroupModule(key, entries, updatedAt) {
  const body = entries
    .map(
      ([zh, data]) =>
        `  '${zh}': {\n    strokes: [${data.strokes.map((path) => `'${path}'`).join(', ')}],\n` +
        `    medians: ${JSON.stringify(data.medians)},\n  },`,
    )
    .join('\n');
  return `/**
 * 汉字笔顺数据 · ${key} 组（${entries.length} 字）。
 *
 * 由 scripts/build-stroke-data.mjs 生成，请勿手改；重跑 npm run prepare:strokes 即可。
 * 数据来源：${DATA_PKG}（Make Me a Hanzi / 文鼎 AR PL 字体系列）
 * 许可：Arphic Public License，全文见 licenses/ARPHICPL.TXT；
 *       本文件作为该许可定义的 Font 衍生物，按同一许可分发。
 * 修改声明（许可 §2a）：${updatedAt} 由 TrueType 字形数据转为「SVG path + 笔画中线」，
 *       仅保留 ${key} 组 ${entries.length} 字的 strokes 与 medians，其余字段已删除。
 */
import type { StrokeGroupData } from './types';

export const DATA: StrokeGroupData = {
${body}
};
`;
}

// ---- 1. 读分组表与卡片笔画数 ----
const groupsSource = readFileSync(GROUPS_SRC, 'utf8');
const cardsSource = readFileSync(CARDS_SRC, 'utf8');
const cardStrokes = parseCardStrokes(cardsSource);

const groupChars = GROUPS.map(([constName, key]) => [key, parseGroupChars(groupsSource, constName)]);
const total = groupChars.reduce((sum, [, chars]) => sum + chars.length, 0);
if (total !== EXPECT_CHARS) {
  throw new Error(`分组表解出 ${total} 字，期望 ${EXPECT_CHARS}；请检查 characterGroups.ts 结构是否变化`);
}

// ---- 2. 逐字取数据 ----
const collected = new Map();
const missing = [];
const mismatched = [];
for (const [key, chars] of groupChars) {
  for (const zh of chars) {
    const { data, reason } = loadChar(zh);
    if (!data) {
      missing.push({ zh, key, reason });
      continue;
    }
    const expected = cardStrokes.get(zh);
    if (expected === undefined) {
      mismatched.push({ zh, key, expected: '卡片中未找到', actual: data.strokes.length });
      continue;
    }
    if (expected !== data.strokes.length) {
      mismatched.push({ zh, key, expected, actual: data.strokes.length });
    }
    collected.set(zh, { key, data });
  }
}

// ---- 3. 幂等：数据没变就沿用上次的日期 ----
let previousManifest = null;
try {
  previousManifest = JSON.parse(readFileSync(resolve(OUT_DIR, 'manifest.json'), 'utf8'));
} catch {
  previousManifest = null;
}

const buildManifest = (updatedAt) => {
  const groups = {};
  const strokes = {};
  for (const [key, chars] of groupChars) {
    const available = [...chars]
      .filter((zh) => collected.has(zh))
      .sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
    groups[key] = available;
    for (const zh of available) strokes[zh] = collected.get(zh).data.strokes.length;
  }
  return {
    updatedAt,
    source: DATA_PKG,
    license: 'Arphic Public License',
    licenseFile: 'licenses/ARPHICPL.TXT',
    notice: `由 scripts/build-stroke-data.mjs 生成：从 ${DATA_PKG} 抽取 ${Object.keys(strokes).length} 字的 strokes 与 medians（转换格式），属 Arphic Public License 定义的 Font 衍生物，按同一许可分发，全文见 licenseFile。修改日期 ${updatedAt}。`,
    groups,
    strokes,
    missing: missing.map((item) => item.zh),
  };
};

const samePayload = (() => {
  if (!previousManifest) return false;
  try {
    const a = buildManifest(previousManifest.updatedAt ?? '');
    const pick = (m) => JSON.stringify({ groups: m.groups, strokes: m.strokes, missing: m.missing });
    return pick(a) === pick(previousManifest);
  } catch {
    return false;
  }
})();

const updatedAt = samePayload ? previousManifest.updatedAt : new Date().toISOString().slice(0, 10);
const manifest = buildManifest(updatedAt);

// ---- 4. 落盘（内容没变就不写，保持 mtime 与 diff 干净） ----
const writeIfChanged = (path, content) => {
  const previous = (() => {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      return null;
    }
  })();
  if (previous === content) return { path, changed: false, bytes: Buffer.byteLength(content) };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return { path, changed: true, bytes: Buffer.byteLength(content) };
};

const written = [];
for (const [key, chars] of groupChars) {
  const entries = [...chars]
    .filter((zh) => collected.has(zh))
    .sort((a, b) => a.codePointAt(0) - b.codePointAt(0))
    .map((zh) => [zh, collected.get(zh).data]);
  written.push(writeIfChanged(resolve(OUT_DIR, `group-${key}.ts`), renderGroupModule(key, entries, updatedAt)));
}
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
written.push(writeIfChanged(resolve(OUT_DIR, 'manifest.json'), manifestText));

// ---- 5. 汇报 ----
const label = (path) => relative(ROOT, path).replace(/\\/g, '/');
let totalBytes = 0;
let totalGzip = 0;
for (const item of written) {
  const content = readFileSync(item.path, 'utf8');
  const gzip = gzipSync(content).length;
  totalBytes += item.bytes;
  totalGzip += gzip;
  console.log(
    `${item.changed ? '已写入' : '未变化'}：${label(item.path)} · ${(item.bytes / 1024).toFixed(1)} kB · gzip ${(gzip / 1024).toFixed(1)} kB`,
  );
}
console.log(
  `共 ${collected.size} 字 / ${GROUPS.length} 组 · ${(totalBytes / 1024).toFixed(1)} kB · gzip ${(totalGzip / 1024).toFixed(1)} kB · 更新日期 ${updatedAt}`,
);

if (missing.length > 0) {
  console.error(`\n缺少笔顺数据 ${missing.length} 字（需要人工确认：换字、补数据或从分组表移除）：`);
  for (const item of missing) console.error(`  ${item.zh}（${item.key}）：${item.reason}`);
}
if (mismatched.length > 0) {
  console.error(`\n笔画数与卡片不一致 ${mismatched.length} 字（孩子会看到错误的笔数，必须修）：`);
  for (const item of mismatched) {
    console.error(`  ${item.zh}（${item.key}）：卡片 ${item.expected} 笔，字形数据 ${item.actual} 笔`);
  }
}
if (missing.length > 0 || mismatched.length > 0) process.exitCode = 1;
