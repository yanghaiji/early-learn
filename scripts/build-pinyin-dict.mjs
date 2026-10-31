#!/usr/bin/env node
/**
 * 生成拼音候选字典（v0.8 NFR §4.2）。
 *
 * 数据源：pinyin-pro（MIT，只作 devDependency）。
 * 产物：src/data/pinyin/dict.ts —— GB2312 一级字 3755 的全部读音，运行时零依赖。
 *
 * 为什么在构建期生成而不运行时引库：pinyin 的 ESM 体积 307 kB（gzip 134 kB），
 * 只为管理区一个输入框引进来不划算；与 prepare:images / prepare:audio 同一套「脚本出产物」模式。
 *
 * 幂等：同一份 pinyin-pro 版本重复运行，产物逐字节一致。
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { pinyin } from 'pinyin-pro';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'src/data/pinyin/dict.ts');
/** 一级字共 3755；留 55 字余量给编码区间的空位 */
const MIN_CHARS = 3700;
/** 拼音串只允许拉丁字母 + 带声调拉丁扩展，挡掉 pinyin-pro 的兜底文本 */
const PINYIN_RE = /^[A-Za-z\u00c0-\u00ff\u0100-\u01ff]+$/;

const decoder = new TextDecoder('gbk');

/** GB2312 一级汉字：区 16–55（0xB0–0xD7），位 1–94（0xA1–0xFE），按拼音排序 */
function levelOneChars() {
  const chars = [];
  for (let high = 0xb0; high <= 0xd7; high += 1) {
    for (let low = 0xa1; low <= 0xfe; low += 1) {
      const ch = decoder.decode(Uint8Array.from([high, low]));
      if (ch.length === 1 && ch !== '\uFFFD') chars.push(ch);
    }
  }
  return chars;
}

/** 一个字在字典里的全部读音，第一个为最常用读音 */
function readingsOf(ch) {
  const list = pinyin(ch, { multiple: true, type: 'array', toneType: 'symbol' });
  const seen = new Set();
  for (const raw of list) {
    const reading = raw.trim();
    if (!reading || !PINYIN_RE.test(reading)) continue;
    seen.add(reading);
  }
  return [...seen];
}

const chars = levelOneChars();
const missing = [];
const entries = [];
for (const ch of chars) {
  const readings = readingsOf(ch);
  if (readings.length === 0) {
    missing.push(ch);
    continue;
  }
  entries.push([ch, readings]);
}

if (entries.length < MIN_CHARS) {
  throw new Error(`字典只覆盖 ${entries.length} 字，低于下限 ${MIN_CHARS}；请检查 GB2312 解码与 pinyin-pro 版本`);
}

const body = entries
  .map(([ch, readings]) => `  '${ch}': [${readings.map((r) => `'${r}'`).join(', ')}],`)
  .join('\n');

const content = `/** 由 scripts/build-pinyin-dict.mjs 生成，请勿手改。数据源：pinyin-pro（MIT） */
export const PINYIN_DICT: Readonly<Record<string, readonly string[]>> = {
${body}
};
`;

const previous = (() => {
  try {
    return readFileSync(OUT, 'utf8');
  } catch {
    return null;
  }
})();

if (previous === content) {
  console.log(`未变化：${relative(ROOT, OUT).replace(/\\/g, '/')}`);
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, content, 'utf8');
  console.log(`已写入：${relative(ROOT, OUT).replace(/\\/g, '/')}`);
}

const bytes = Buffer.byteLength(content);
const gzipBytes = gzipSync(content).length;
const multi = entries.filter(([, readings]) => readings.length > 1).length;
console.log(
  `字数 ${entries.length}（多音字 ${multi}，跳过 ${missing.length}）· ${(bytes / 1024).toFixed(1)} kB · gzip ${(gzipBytes / 1024).toFixed(1)} kB`,
);
