/**
 * 英文发音资源生成（v0.4 · A 组发音根治，口径见 FR/v0.4/PRD.md §4.1、NFR/v0.4/技术方案.md §4.1）。
 *
 * 用法：
 *   npm run prepare:audio              全量生成 501 条（已存在的跳过）
 *   npm run prepare:audio -- --force   全部重生成
 *   npm run prepare:audio -- --limit 5 只生成前 5 条（管线体检用）
 *
 * 管线：种子解析（复用 validate-content.mjs 的口径）→ 本机 SAPI5 英文音色出 WAV → ffmpeg 转 mp3
 *       → public/assets/audio/{cardId}.mp3 + public/assets/audio/manifest.json
 * 中间 WAV 只落 .tmp/audio/，结束清空（规约第 1 条）。
 */

import { execFile } from 'node:child_process';
import { access, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { parseCards, parseStories } from './validate-content.mjs';

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP_DIR = path.join(ROOT, '.tmp/audio');
const OUT_DIR = path.join(ROOT, 'public/assets/audio');
const MANIFEST_FILE = path.join(OUT_DIR, 'manifest.json');
const PS_SCRIPT = path.join(TMP_DIR, 'synthesize.ps1');
const INPUT_FILE = path.join(TMP_DIR, 'utterances.json');

/** 与 src/domain/constants.ts 的 AUDIO_* 保持一致（脚本无法 import TS，此处为唯一口径镜像） */
const AUDIO_ROOT = 'assets/audio';
const MP3_BITRATE = '32k';
const MP3_SAMPLE_RATE = 22050;
const MP3_MAX_BYTES = 12 * 1024;
const SPEAK_RATE = -1;
const EXPECTED_VOICE = 'Microsoft Zira Desktop';
/** 时长口径：短到听不清或长到像念了整句，都说明文本有问题 */
const DURATION_MIN_S = 0.4;
const DURATION_MAX_S = 3.0;

const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const limitIndex = argv.indexOf('--limit');
const LIMIT = limitIndex >= 0 ? Number(argv[limitIndex + 1]) : Number.POSITIVE_INFINITY;

/** 只剩字母、数字与空格：SAPI 读不了中文标点串，也避免造出静音文件 */
function normalizeText(en) {
  return en.replace(/[^A-Za-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function requireTool(command, args, hint) {
  try {
    await execFileAsync(command, args);
  } catch {
    throw new Error(`缺少 ${command}：${hint}`);
  }
}

/** 本机必须有一个离线英文音色，否则整条链路没有意义（宁可中止也不产半套资源） */
async function assertVoice() {
  const script = `Add-Type -AssemblyName System.Speech -ErrorAction Stop; ` +
    `(New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | ` +
    `Where-Object { $_.VoiceInfo.Culture.Name -like 'en*' } | ForEach-Object { $_.VoiceInfo.Name }`;
  const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script]);
  const voices = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!voices.includes(EXPECTED_VOICE)) {
    throw new Error(
      `本机没有离线英文音色「${EXPECTED_VOICE}」（探测到：${voices.join(' / ') || '无'}）。` +
        '请在 Windows「设置 → 时间和语言 → 语音」中添加英语语音后重试。',
    );
  }
}

const PS_BODY = `param([string]$InputFile, [string]$OutDir, [string]$Voice, [int]$Rate)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$rows = Get-Content -LiteralPath $InputFile -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($row in $rows) {
  $wav = Join-Path $OutDir ($row.id + '.wav')
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.SelectVoice($Voice)
  $synth.Rate = $Rate
  $synth.SetOutputToWaveFile($wav)
  $synth.Speak($row.text)
  $synth.Dispose()
}
`;

async function synthesizeWavs(rows) {
  await writeFile(INPUT_FILE, JSON.stringify(rows), 'utf8');
  await writeFile(PS_SCRIPT, PS_BODY, 'utf8');
  await execFileAsync(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', PS_SCRIPT,
      '-InputFile', INPUT_FILE, '-OutDir', TMP_DIR, '-Voice', EXPECTED_VOICE, '-Rate', String(SPEAK_RATE)],
    { maxBuffer: 8 * 1024 * 1024 },
  );
}

async function toMp3(id) {
  const wav = path.join(TMP_DIR, `${id}.wav`);
  const mp3 = path.join(OUT_DIR, `${id}.mp3`);
  await execFileAsync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', wav,
    '-codec:a', 'libmp3lame', '-b:a', MP3_BITRATE, '-ac', '1', '-ar', String(MP3_SAMPLE_RATE), mp3,
  ]);
  return mp3;
}

/** ffprobe 存在时才查时长；缺失不阻塞（体积与存在性校验交给 validate:content） */
async function probeDuration(file) {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
    ]);
    return Number(stdout.trim());
  } catch {
    return Number.NaN;
  }
}

async function main() {
  const startedAt = Date.now();
  await requireTool('ffmpeg', ['-version'], '请先安装 ffmpeg 并加入 PATH（出 mp3 依赖它）');
  await assertVoice();

  const cards = [...(await parseCards()), ...(await parseStories())];

  const targets = [];
  const skipped = [];
  for (const card of cards) {
    const text = normalizeText(card.en);
    if (!/[A-Za-z]/.test(text)) {
      skipped.push(`${card.id}（英文「${card.en}」没有可朗读的字母）`);
      continue;
    }
    targets.push({ id: card.id, text, zh: card.zh });
  }

  const pending = [];
  for (const [index, item] of targets.entries()) {
    if (index >= LIMIT) break;
    if (!FORCE && (await exists(path.join(OUT_DIR, `${item.id}.mp3`)))) continue;
    pending.push(item);
  }

  console.log(`待生成 ${pending.length} 条（内置卡共 ${targets.length} 条可朗读，跳过 ${skipped.length} 条）`);

  await mkdir(TMP_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const problems = [];
  const CHUNK = 25;
  for (let start = 0; start < pending.length; start += CHUNK) {
    const chunk = pending.slice(start, start + CHUNK);
    await synthesizeWavs(chunk);
    for (const item of chunk) {
      try {
        const mp3 = await toMp3(item.id);
        const size = (await stat(mp3)).size;
        if (size > MP3_MAX_BYTES) problems.push(`${item.id} 体积 ${size} B 超过 ${MP3_MAX_BYTES} B`);
        const seconds = await probeDuration(mp3);
        if (!Number.isNaN(seconds) && (seconds < DURATION_MIN_S || seconds > DURATION_MAX_S)) {
          problems.push(`${item.id} 时长 ${seconds.toFixed(2)}s 超出 ${DURATION_MIN_S}–${DURATION_MAX_S}s`);
        }
      } catch (error) {
        problems.push(`${item.id} 生成失败：${error.message}`);
      }
    }
    const done = Math.min(start + CHUNK, pending.length);
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(`  ${done}/${pending.length} 条 · 已用 ${elapsed}s · ${chunk[chunk.length - 1]?.zh ?? ''}`);
  }

  // manifest 以磁盘上实际存在的 mp3 为准，避免清单指向不存在的文件
  const files = (await readdir(OUT_DIR)).filter((name) => name.endsWith('.mp3')).sort();
  const manifest = Object.fromEntries(
    files.map((name) => [name.replace(/\.mp3$/, ''), `${AUDIO_ROOT}/${name}`]),
  );
  await writeFile(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const totalBytes = (
    await Promise.all(files.map(async (name) => (await stat(path.join(OUT_DIR, name))).size))
  ).reduce((sum, size) => sum + size, 0);

  await rm(TMP_DIR, { recursive: true, force: true });

  console.log(`清单 ${files.length} 条 · 合计 ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  if (skipped.length > 0) {
    console.log(`跳过 ${skipped.length} 条：\n  ${skipped.join('\n  ')}`);
  }
  if (problems.length > 0) {
    console.error(`\n生成问题（${problems.length} 项）：`);
    for (const message of problems) console.error(`  ✗ ${message}`);
    process.exitCode = 1;
    return;
  }
  const missing = targets.filter((item) => !(item.id in manifest));
  if (missing.length > 0) {
    console.error(`\n仍有 ${missing.length} 条卡没有音频：${missing.slice(0, 10).map((item) => item.id).join(' / ')} …`);
    process.exitCode = 1;
    return;
  }
  console.log('\n音频生成完成 ✓');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
