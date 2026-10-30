/**
 * 内容门禁：校验内置分类/卡片是否符合 PRD §6 字段规则，且图片齐备。
 *
 * 用法：npm run validate:content
 * 失败时以非 0 退出码结束，可接入 CI。
 */

import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cnNumberToValue } from './lib/numerals.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CARDS_FILE = path.join(ROOT, 'src/data/seed/cards.ts');
const CATEGORIES_FILE = path.join(ROOT, 'src/data/seed/categories.ts');
const GROUPS_FILE = path.join(ROOT, 'src/data/seed/characterGroups.ts');
const STORY_FILE = path.join(ROOT, 'src/data/seed/stories.ts');
const STORY_GROUPS_FILE = path.join(ROOT, 'src/data/seed/storyGroups.ts');
const IDIOM_DIR = path.join(ROOT, 'src/data/seed/idioms');
/** 成语按主题拆五个文件；新增文件要同步 idioms/index.ts 与 prepare-images.mjs */
const IDIOM_FILES = ['fable', 'study', 'moral', 'nature', 'life'];
const COLOR_TOKENS_FILE = path.join(ROOT, 'src/domain/entities/category.ts');
const TOKENS_CSS_FILE = path.join(ROOT, 'src/styles/tokens.css');
const IMAGE_SCRIPT = path.join(ROOT, 'scripts/prepare-images.mjs');
const PUBLIC_DIR = path.join(ROOT, 'public');

const PINYIN_TONE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹ]/;
// v0.5 口语与常用组的「的/了」是合法轻声（本就没有声调符），按字白名单豁免；其余字漏标声调仍判红
const NEUTRAL_TONE_ZH = new Set(['的', '了']);
const EN_MAX_WORDS = 3;
const STROKES_MIN = 1;
const STROKES_MAX = 30;
const ZH_MAX = 8;
const ZH_MAX_POEM = 20;
const POEM_LINE_MAX = 14;
const POEM_LINES_MIN = 2;
const POEM_LINES_MAX = 8;
const AUTHOR_MAX = 12;
const DYNASTY_MAX = 6;
const TRANSLATION_MAX = 90;
// v0.2 故事绘本
const STORY_TITLE_MAX = 20;
const STORY_COUNT = 50;
const STORY_PAGES_EXPECTED = 6;
const STORY_PAGES_MIN = 4;
const STORY_PAGES_MAX = 8;
const STORY_PAGE_TEXT_MAX = 60;
const STORY_MORAL_MAX = 60;
// v0.6 成语词典（口径见 FR/v0.6/PRD-成语词典.md §3.2）
const IDIOM_COUNT = 150;
const IDIOM_GROUP_COUNT = 5;
const IDIOM_LEN = 4;
// 下限定为 6：PRD §5 的 150 条词表释义实测 6–34 字（越短越适合 4–6 岁照读），
// 与 §2.1「20–90 字」的口径偏差已回写到 PRD；此处只挡住空串与半截话
const IDIOM_MEANING_MIN = 6;
const IDIOM_MEANING_MAX = 90;
const IDIOM_EXAMPLES_MIN = 2;
const IDIOM_EXAMPLES_MAX = 3;
const IDIOM_EXAMPLE_MIN = 8;
const IDIOM_EXAMPLE_MAX = 50;
const IDIOM_RELATED_MIN = 1;
const IDIOM_RELATED_MAX = 3;
const IDIOM_CITATION_MAX = 40;
// v0.4 英文自带音频（口径见 FR/v0.4/PRD.md §4.1）
const AUDIO_DIR = path.join(PUBLIC_DIR, 'assets/audio');
const AUDIO_MANIFEST_FILE = path.join(AUDIO_DIR, 'manifest.json');
const AUDIO_MIN_BYTES = 1024;
const AUDIO_MAX_BYTES = 12 * 1024;
// v0.5 内容门禁 V1~V5（口径见 NFR/v0.5/技术方案.md §5）
/** 不走实体画师的分类：由 cardSvg 用色块/几何/数字直接画，V1 要跳过 */
const SPECIAL_ART_CATEGORIES = new Set(['colors', 'shapes', 'numbers']);
const NUMBER_MAX = 100;
/** 同一意境场景最多几首诗共用：再多这一批诗看上去就是“同一张图” */
const POEM_SCENE_MAX = 4;

const errors = [];
const fail = (message) => errors.push(message);

/** 拼音声调门禁：带声调，或属于轻声白名单的单字卡才放行（口径对外导出给 scripts/validate-tone.test.mjs 锁死范围） */
export function pinyinToneOk(card) {
  if (PINYIN_TONE.test(card.pinyin)) return true;
  return card.kind === 'character' && NEUTRAL_TONE_ZH.has(card.zh);
}

function parseRows(body) {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('['))
    .map((line) => ({
      strings: [...line.matchAll(/'([^']*)'/g)].map((item) => item[1]),
      numbers: [...line.matchAll(/(?<![\w.])(\d+)(?![\w.])/g)].map((item) => Number(item[1])),
    }));
}

async function parseCategories() {
  const source = await readFile(CATEGORIES_FILE, 'utf8');
  return [
    ...source.matchAll(
      /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)'[^}]*color:\s*'([^']+)'[^}]*cover:\s*`([^`]+)`/g,
    ),
  ].map((item) => ({
    id: item[1],
    name: item[2],
    color: item[3],
    // 种子源码里 cover 用了 IMAGE_ROOT 常量模板，这里展开为实际相对路径
    cover: item[4].replace('${IMAGE_ROOT}', 'assets/images/covers'),
  }));
}

/** 卡片解析口径对外导出：scripts/prepare-audio.mjs 复用，避免两处真相 */
export async function parseCards() {
  const source = await readFile(CARDS_FILE, 'utf8');
  const cards = [];

  const groupRe = /const (\w+): readonly Row\[\] = \[([\s\S]*?)\n\];/g;
  let match;
  const bindings = new Map(
    [...source.matchAll(/buildObjects\('([^']+)',\s*(\w+)\)/g)].map((item) => [item[2], item[1]]),
  );

  while ((match = groupRe.exec(source))) {
    const categoryId = bindings.get(match[1]);
    if (!categoryId) continue;
    for (const row of parseRows(match[2])) {
      const [slug, zh, pinyin, en] = row.strings;
      if (!slug || !zh || !pinyin || !en) {
        fail(`卡片行解析失败：${match[1]} → ${JSON.stringify(row)}`);
        continue;
      }
      cards.push({
        id: `${categoryId}-${slug}`,
        kind: 'object',
        categoryId,
        slug,
        zh,
        pinyin,
        en,
        image: `assets/images/${categoryId}/${slug}.webp`,
      });
    }
  }

  const charBody = /const CHARACTERS: readonly CharRow\[\] = \[([\s\S]*?)\n\];/.exec(source);
  if (charBody) {
    for (const row of parseRows(charBody[1])) {
      const [slug, zh, pinyin, en] = row.strings;
      const strokes = row.numbers[0];
      if (!slug || !zh || !pinyin || !en) {
        fail(`汉字卡行解析失败：${JSON.stringify(row)}`);
        continue;
      }
      cards.push({
        id: `characters-${slug}`,
        kind: 'character',
        categoryId: 'characters',
        slug,
        zh,
        pinyin,
        en,
        strokes,
        words: row.strings.slice(4),
        image: `assets/images/characters/${slug}.webp`,
      });
    }
  }

  const poemBody = /const POEMS: readonly PoemRow\[\] = \[([\s\S]*?)\n\];/.exec(source);
  if (poemBody) {
    for (const block of poemBody[1].split(/\n(?=\s*\{ slug:)/)) {
      if (!block.includes("slug:")) continue;
      const field = (key) => new RegExp(`${key}: '([^']*)'`).exec(block)?.[1];
      const slug = field('slug');
      const zh = field('zh');
      const pinyin = field('pinyin');
      const en = field('en');
      const author = field('author');
      const dynasty = field('dynasty');
      const translation = field('translation') ?? '';
      const difficulty = Number(/difficulty:\s*(\d)/.exec(block)?.[1] ?? 0);
      const linesRaw = /lines: \[([\s\S]*?)\]/.exec(block)?.[1] ?? '';
      const lines = [...linesRaw.matchAll(/'([^']*)'/g)].map((item) => item[1]);
      if (!slug || !zh || !pinyin || !en) {
        fail(`诗词行解析失败：${JSON.stringify({ slug, zh, pinyin, en })}`);
        continue;
      }
      cards.push({
        id: `poems-${slug}`,
        kind: 'poem',
        categoryId: 'poems',
        slug,
        zh,
        pinyin,
        en,
        author,
        dynasty,
        lines,
        translation,
        difficulty,
        image: `assets/images/poems/${slug}.webp`,
      });
    }
  }

  return cards;
}

async function parseCharacterGroups() {
  const source = await readFile(GROUPS_FILE, 'utf8');
  const names = new Map(
    [...source.matchAll(/\{ key: '([a-z]+)', name: '([^']+)' \}/g)].map((item) => [
      item[1],
      item[2],
    ]),
  );
  const blocks = new Map(
    [...source.matchAll(/const (\w+) = \[([\s\S]*?)\] as const;/g)].map((item) => [
      item[1],
      [...item[2].matchAll(/'([^']*)'/g)].map((chars) => chars[1]),
    ]),
  );
  return [...source.matchAll(/\['([a-z]+)', (\w+)\]/g)]
    .filter((item) => blocks.has(item[2]))
    .map((item) => ({
      key: item[1],
      name: names.get(item[1]) ?? item[1],
      chars: blocks.get(item[2]),
    }));
}

/** 故事绘本：从 stories.ts 解析每本的 slug / 标题 / 每页文字与插图 */
export async function parseStories() {
  const source = await readFile(STORY_FILE, 'utf8');
  const stories = [];
  const blockRe = /\{\s*slug: '([^']+)',\s*zh: '([^']+)',\s*pinyin: '([^']+)',\s*en: '([^']+)',[\s\S]*?difficulty: (\d),\s*moral: '([^']+)',[\s\S]*?pages: \[([\s\S]*?)\n    \],/g;
  let match;
  while ((match = blockRe.exec(source))) {
    const [, slug, zh, pinyin, en, difficulty, moral, body] = match;
    const pages = [...body.matchAll(/\{ text: '([^']*)', scene: '([^']+)', subject: '([^']+)' \}/g)].map(
      (item) => ({
        text: item[1],
        scene: item[2],
        subject: item[3],
      }),
    );
    stories.push({
      id: `stories-${slug}`,
      kind: 'story',
      categoryId: 'stories',
      slug,
      zh,
      pinyin,
      en,
      difficulty: Number(difficulty),
      moral,
      pages,
      image: `assets/images/stories/${slug}/cover.webp`,
    });
  }
  return stories;
}

/** 故事分组：数组名 → 组 key，组名取自 storyGroups.ts */
async function parseStoryGroups() {
  const source = await readFile(STORY_FILE, 'utf8');
  const arrays = new Map(
    [...source.matchAll(/const (\w+): readonly StoryRow\[\] = \[([\s\S]*?)\n\];/g)].map((item) => [
      item[1],
      [...item[2].matchAll(/slug: '([^']+)'/g)].map((row) => row[1]),
    ]),
  );
  const groupSource =
    /const STORY_GROUP_SOURCES[^=]*= \[([\s\S]*?)\n\];/.exec(source)?.[1] ?? '';
  const namesSource = await readFile(STORY_GROUPS_FILE, 'utf8');
  const names = new Map(
    [...namesSource.matchAll(/\{ key: '([a-z-]+)', name: '([^']+)' \}/g)].map((item) => [
      item[1],
      item[2],
    ]),
  );
  return [...groupSource.matchAll(/\['([a-z-]+)', (\w+)\]/g)].map((item) => ({
    key: item[1],
    name: names.get(item[1]) ?? item[1],
    slugs: arrays.get(item[2]) ?? [],
  }));
}

/**
 * 成语：五个主题文件 → 卡片 + 组（组表读 idioms/index.ts 的 IDIOM_SOURCES）。
 * 例子里不能出现单引号，否则切块会错位——内容规范见 PRD §5.6。
 */
async function parseIdioms() {
  const indexSource = await readFile(path.join(IDIOM_DIR, 'index.ts'), 'utf8');
  const groupSource = /const IDIOM_SOURCES[^=]*= \[([\s\S]*?)\n\];/.exec(indexSource)?.[1] ?? '';
  const nameSource = /export const IDIOM_GROUPS[^=]*= \[([\s\S]*?)\n\];/.exec(indexSource)?.[1] ?? '';
  const groupNames = new Map(
    [...nameSource.matchAll(/\{ key: '(idiom-[a-z]+)', name: '([^']+)' \}/g)].map((item) => [
      item[1],
      item[2],
    ]),
  );
  const sources = [...groupSource.matchAll(/\['(idiom-[a-z]+)', (\w+)\]/g)].map((item) => ({
    key: item[1],
    arrayName: item[2],
  }));

  const cards = [];
  const groups = [];
  for (const { key, arrayName } of sources) {
    const file = IDIOM_FILES.find((name) => `${name.toUpperCase()}_IDIOMS` === arrayName);
    if (!file) {
      fail(`成语分组 ${key} 指向未知数组 ${arrayName}（请同步 IDIOM_FILES）`);
      continue;
    }
    const source = await readFile(path.join(IDIOM_DIR, `${file}.ts`), 'utf8');
    const body =
      new RegExp(`export const ${arrayName}: readonly IdiomRow\\[\\] = \\[([\\s\\S]*?)\\n\\];`).exec(
        source,
      )?.[1] ?? '';
    const blocks = body.split(/\n(?=\s*\{\n\s*slug:)/).filter((block) => block.includes('slug:'));
    if (blocks.length === 0) fail(`成语文件 ${file}.ts 未解析出任何条目`);

    const slugs = [];
    for (const block of blocks) {
      const field = (name) => new RegExp(`${name}: '([^']*)'`).exec(block)?.[1];
      const list = (name) => {
        const raw = new RegExp(`${name}: \\[([^\\]]*)\\]`).exec(block)?.[1] ?? '';
        return [...raw.matchAll(/'([^']*)'/g)].map((item) => item[1]);
      };
      const slug = field('slug');
      const zh = field('zh');
      const pinyin = field('pinyin');
      if (!slug || !zh || !pinyin) {
        fail(`成语条目解析失败（${file}.ts）：${block.trim().slice(0, 40)}`);
        continue;
      }
      slugs.push(slug);
      cards.push({
        id: `idioms-${slug}`,
        kind: 'idiom',
        categoryId: 'idioms',
        slug,
        zh,
        pinyin,
        en: '',
        difficulty: Number(/difficulty:\s*(\d)/.exec(block)?.[1] ?? 0),
        meaning: field('meaning') ?? '',
        examples: list('examples'),
        synonyms: list('synonyms'),
        antonyms: list('antonyms'),
        citation: field('citation') ?? '',
        group: key,
        image: `assets/images/idioms/${slug}.webp`,
      });
    }
    groups.push({ key, name: groupNames.get(key) ?? key, slugs });
  }
  return { cards, groups };
}

/**
 * 出图脚本里的场景与主体 key：页里写了不存在的 key 会静默画成占位块。
 * v0.5 起补充卡片侧主体（V1）、诗景（V3）、主题色（V5）三张表。
 */
async function parseImageKeys() {
  const source = await readFile(IMAGE_SCRIPT, 'utf8');
  const castBody = /const CAST_SPECS = \{([\s\S]*?)\n\};/.exec(source)?.[1] ?? '';
  const subjects = new Set([...castBody.matchAll(/^  ([a-zA-Z]+): \{ art:/gm)].map((item) => item[1]));
  const sceneBody = /const STORY_SCENES = \{([\s\S]*?)\n\};/.exec(source)?.[1] ?? '';
  const scenes = new Set([...sceneBody.matchAll(/^  ([a-z]+): \(\) =>/gm)].map((item) => item[1]));

  // 卡片侧实体：别名 / 卡专属 / 故事侧三张表取齐（键可能带引号，如 'fire-truck'）
  const cardSlugs = new Set();
  for (const name of ['CARD_ALIAS', 'CARD_SPECS', 'CAST_SPECS']) {
    const body = new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`).exec(source)?.[1] ?? '';
    for (const item of body.matchAll(/^  '?(\w[\w-]*)'?:(?!\s*\[)/gm)) cardSlugs.add(item[1]);
  }

  // slug → 意境场景（带引号的值），V3 要查登记与共用数
  const poemSceneBody = /const POEM_SCENES = \{([\s\S]*?)\n\};/.exec(source)?.[1] ?? '';
  const poemScenes = new Map(
    [...poemSceneBody.matchAll(/^  '?(\w[\w-]*)'?: '([a-z]+)'/gm)].map((item) => [item[1], item[2]]),
  );

  const themeBody = /^const THEME = \{([\s\S]*?)\n\};/m.exec(source)?.[1] ?? '';
  const themes = new Map(
    [...themeBody.matchAll(/^  (\w[\w-]*): \{ bg: '([^']+)'[^}]*\}/gm)].map((item) => [item[1], item[2]]),
  );

  // v0.6.1 成语：slug → 意象件（1–2 件），以及 IDIOM_MOTIFS 里已实现的意象件名
  const idiomPropBody = /const IDIOM_PROPS = \{([\s\S]*?)\n\};/.exec(source)?.[1] ?? '';
  const idiomProps = new Map(
    [...idiomPropBody.matchAll(/^  '([\w-]+)':\s*\[([^\]]*)\]/gm)].map((item) => [
      item[1],
      [...item[2].matchAll(/'([\w-]+)'/g)].map((motif) => motif[1]),
    ]),
  );
  const idiomMotifBody = /const IDIOM_MOTIFS = \{([\s\S]*?)\n\};/.exec(source)?.[1] ?? '';
  const idiomMotifs = new Set(
    [...idiomMotifBody.matchAll(/^ {2}'?([\w-]+)'?:\s/gm)].map((item) => item[1]),
  );

  return { subjects, scenes, cardSlugs, poemScenes, themes, idiomProps, idiomMotifs };
}

/** V4/V5 要的两张前端表：朝代→诗组映射、色板 token 与 tokens.css 变量 */
async function parseStyleTables() {
  const [groupsSource, tokensSource, cssSource] = await Promise.all([
    readFile(GROUPS_FILE, 'utf8'),
    readFile(COLOR_TOKENS_FILE, 'utf8'),
    readFile(TOKENS_CSS_FILE, 'utf8'),
  ]);

  const poemGroupBody = /const POEM_GROUPS[^[\[]*\[([\s\S]*?)\n\];/.exec(groupsSource)?.[1] ?? '';
  const poemGroupKeys = new Set(
    [...poemGroupBody.matchAll(/\{ key: '([a-z]+)', name: '([^']+)' \}/g)].map((item) => item[1]),
  );
  const dynastyBody = /const POEM_GROUP_BY_DYNASTY[^=]*= \{([\s\S]*?)\n\};/.exec(groupsSource)?.[1] ?? '';
  const dynastyToGroup = new Map(
    [...dynastyBody.matchAll(/^\s*'?([^':]+)'?: '([a-z]+)'/gm)].map((item) => [item[1], item[2]]),
  );

  const tokenBody = /export const COLOR_TOKENS = \[([\s\S]*?)\] as const;/.exec(tokensSource)?.[1] ?? '';
  const colorTokens = new Set([...tokenBody.matchAll(/'([a-z]+)'/g)].map((item) => item[1]));
  const cssVars = new Set([...cssSource.matchAll(/^(\s*)--c-([a-z]+):/gm)].map((item) => item[2]));

  return { poemGroupKeys, dynastyToGroup, colorTokens, cssVars };
}

/**
 * 英文音频门禁：每张内置卡都要有一条同名 mp3，清单与磁盘一一对应。
 * 背景：设备没有本地英文音色时 TTS 会静默失败（NFR/v0.1 §9.4），自带音频是唯一保证。
 */
async function checkAudio(cards) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(AUDIO_MANIFEST_FILE, 'utf8'));
  } catch {
    fail('音频清单缺失：public/assets/audio/manifest.json（运行 npm run prepare:audio）');
    return null;
  }
  if (typeof manifest !== 'object' || manifest === null) {
    fail('音频清单格式非法：应为 { cardId: 路径 } 映射');
    return null;
  }

  const cardIds = new Set(cards.map((card) => card.id));
  // v0.6：成语卡没有英文，不要求音频（PRD §6.2）
  const narrated = cards.filter((card) => card.en.trim());
  let bytes = 0;
  for (const card of narrated) {
    const entry = manifest[card.id];
    const expected = `assets/audio/${card.id}.mp3`;
    if (entry !== expected) {
      fail(`卡片 ${card.id} 的音频清单条目应为 ${expected}（实际 ${String(entry)}）`);
      continue;
    }
    try {
      const info = await stat(path.join(PUBLIC_DIR, expected));
      bytes += info.size;
      if (info.size < AUDIO_MIN_BYTES) fail(`音频 ${card.id} 只有 ${info.size} B，可能是静音文件`);
      else if (info.size > AUDIO_MAX_BYTES) fail(`音频 ${card.id} 体积 ${info.size} B 超过 ${AUDIO_MAX_BYTES} B`);
    } catch {
      fail(`音频缺失：public/${expected}（运行 npm run prepare:audio）`);
    }
  }

  // 清单里指向不存在的卡（删卡或改 slug 后未重生清单）会造成死引用
  for (const cardId of Object.keys(manifest)) {
    if (!cardIds.has(cardId)) fail(`音频清单多余条目：${cardId}（该卡已不存在，请重跑 prepare:audio）`);
  }

  return { count: Object.keys(manifest).length, bytes };
}

/**
 * V1 实物卡主体登记：cardSubject 已从「静默空串」改为抛错，门禁要提前报出同一个 slug，
 * 不能等到出图跑到一半才中断。
 */
function checkImagePipelines(cards, imageKeys) {
  for (const card of cards) {
    if (card.kind !== 'object' || SPECIAL_ART_CATEGORIES.has(card.categoryId)) continue;
    if (!imageKeys.cardSlugs.has(card.slug)) {
      fail(`卡片 ${card.id} 的主体未登记，出图会只有背景（请在 CARD_SPECS 增加 ${card.slug}）`);
    }
  }
}

/** V2 数字卡：中文必须能解析、不重复、按书写顺序严格递增（下标不再等于数值，见 NFR/v0.5 §4.1） */
function checkNumberCards(cards) {
  const numberCards = cards.filter((card) => card.categoryId === 'numbers');
  if (numberCards.length === 0) {
    fail('数字分类没有任何卡片');
    return;
  }
  const idByValue = new Map();
  let previous = 0;
  for (const card of numberCards) {
    const value = cnNumberToValue(card.zh);
    if (value === null || value < 1 || value > NUMBER_MAX) {
      fail(`数字卡 ${card.id} 的中文数字无法解析为 1–${NUMBER_MAX}：${card.zh}`);
      continue;
    }
    const duplicated = idByValue.get(value);
    if (duplicated) fail(`数字卡 ${card.id} 的数值 ${value} 与 ${duplicated} 重复`);
    else idByValue.set(value, card.id);
    if (value <= previous) fail(`数字卡 ${card.id} 的数值 ${value} 没有比前一张（${previous}）递增`);
    previous = Math.max(previous, value);
  }
}

/** V3 诗景：不再允许落到默认 mountain，同一场景最多 POEM_SCENE_MAX 首 */
function checkPoemScenes(cards, imageKeys) {
  const usage = new Map();
  for (const card of cards) {
    if (card.kind !== 'poem') continue;
    const scene = imageKeys.poemScenes.get(card.slug);
    if (!scene) {
      fail(`诗 ${card.id} 未登记场景（请在 prepare-images.mjs 的 POEM_SCENES 增加 ${card.slug}）`);
      continue;
    }
    const count = (usage.get(scene) ?? 0) + 1;
    usage.set(scene, count);
    if (count > POEM_SCENE_MAX) fail(`场景 ${scene} 被 ${count} 首共用，超过 ${POEM_SCENE_MAX} 首`);
  }
}

/** V4 朝代有组：二元判断会让明清诗静默混进宋词，必须查映射表 */
function checkPoemDynasties(cards, styleTables) {
  for (const card of cards) {
    if (card.kind !== 'poem') continue;
    const dynasty = card.dynasty ?? '';
    const key = styleTables.dynastyToGroup.get(dynasty);
    if (!key) {
      fail(`诗 ${card.id} 的朝代「${dynasty}」没有对应分组（请同步 src/data/seed/characterGroups.ts）`);
    } else if (!styleTables.poemGroupKeys.has(key)) {
      fail(`朝代「${dynasty}」映射到不存在的分组 ${key}`);
    }
  }
}

/** V5 分类四处齐色：categories.ts 的 color 必须在三处都有下落，缺一处就会静默串色 */
function checkCategoryColors(categories, imageKeys, styleTables) {
  for (const category of categories) {
    const missing = [];
    if (!styleTables.colorTokens.has(category.color)) missing.push('COLOR_TOKENS');
    if (!styleTables.cssVars.has(category.color)) missing.push('tokens.css');
    if (!imageKeys.themes.has(category.id)) missing.push('prepare-images THEME');
    if (missing.length > 0) {
      fail(`分类 ${category.id} 缺少色值：${missing.join(' / ')}（与 categories.ts 四处需齐备）`);
    }
  }
}

/** V6 成语四字卡：意象件未登记或超过 2 件都会中止出图，必须在这里先拦下 */
function checkIdiomScenes(cards, imageKeys) {
  for (const card of cards) {
    if (card.kind !== 'idiom') continue;
    const props = imageKeys.idiomProps.get(card.slug) ?? [];
    if (props.length === 0) {
      fail(`成语 ${card.id} 未登记意象件（请在 prepare-images.mjs 的 IDIOM_PROPS 增加 ${card.slug}）`);
      continue;
    }
    if (props.length > 2) fail(`成语 ${card.id} 登记了 ${props.length} 件意象，最多 2 件`);
    for (const motif of props) {
      if (!imageKeys.idiomMotifs.has(motif)) {
        fail(`成语 ${card.id} 的意象件 ${motif} 未在 IDIOM_MOTIFS 中实现`);
      }
    }
  }
}

/** V7 成语分组：5 组 × 30 条，组表与卡片双向覆盖（与汉字 / 故事分组同口径） */
function checkIdiomGroups(idiomCards, idiomGroups) {
  const expected = IDIOM_COUNT / IDIOM_GROUP_COUNT;
  const groupOfSlug = new Map();
  for (const group of idiomGroups) {
    if (group.slugs.length === 0) fail(`成语分组 ${group.key} 里没有任何成语`);
    if (group.slugs.length !== expected) {
      fail(`成语分组 ${group.name} 应为 ${expected} 条（实际 ${group.slugs.length} 条）`);
    }
    for (const slug of group.slugs) {
      if (groupOfSlug.has(slug)) {
        fail(`成语「${slug}」同时出现在分组 ${groupOfSlug.get(slug)} 与 ${group.key}`);
      }
      groupOfSlug.set(slug, group.key);
    }
  }
  const slugs = new Set(idiomCards.map((card) => card.slug));
  for (const card of idiomCards) {
    if (!groupOfSlug.has(card.slug)) {
      fail(`成语「${card.slug}」（${card.id}）未归入任何主题组，请同步 src/data/seed/idioms/index.ts`);
    }
  }
  for (const slug of groupOfSlug.keys()) {
    if (!slugs.has(slug)) fail(`分组里的成语「${slug}」没有对应卡片（可能已删除或改 slug）`);
  }
}

async function main() {
  const [categories, baseCards, groups, stories, storyGroups, idiomData, imageKeys, styleTables] =
    await Promise.all([
      parseCategories(),
      parseCards(),
      parseCharacterGroups(),
      parseStories(),
      parseStoryGroups(),
      parseIdioms(),
      parseImageKeys(),
      parseStyleTables(),
    ]);
  const idiomCards = idiomData.cards;
  const idiomGroups = idiomData.groups;
  const cards = [...baseCards, ...stories, ...idiomCards];

  if (categories.length === 0) fail('未解析到任何分类');
  if (cards.length === 0) fail('未解析到任何卡片');
  // 镜像校验自守：V1~V5 靠正则读源码，表头一改写法就会解出空集，宁可不通过也不能默许“全通过”
  if (imageKeys.cardSlugs.size === 0) fail('未解析到 CARD_SPECS / CAST_SPECS / CARD_ALIAS，V1 形同虚设');
  if (imageKeys.poemScenes.size === 0) fail('未解析到 POEM_SCENES，V3 形同虚设');
  if (imageKeys.themes.size === 0) fail('未解析到出图脚本的 THEME，V5 形同虚设');
  if (styleTables.dynastyToGroup.size === 0) fail('未解析到 POEM_GROUP_BY_DYNASTY，V4 形同虚设');
  if (styleTables.poemGroupKeys.size === 0) fail('未解析到 POEM_GROUPS，V4 形同虚设');
  if (styleTables.colorTokens.size === 0) fail('未解析到 COLOR_TOKENS，V5 形同虚设');
  if (styleTables.cssVars.size === 0) fail('未解析到 tokens.css 的分类色变量，V5 形同虚设');
  if (imageKeys.idiomProps.size === 0) fail('未解析到 IDIOM_PROPS，V6 形同虚设');
  if (imageKeys.idiomMotifs.size === 0) fail('未解析到 IDIOM_MOTIFS，V6 形同虚设');
  if (stories.length !== STORY_COUNT) {
    fail(`故事应为 ${STORY_COUNT} 本（实际 ${stories.length} 本，口径见 FR/v0.2 §4）`);
  }
  if (idiomCards.length !== IDIOM_COUNT) {
    fail(`成语应为 ${IDIOM_COUNT} 条（实际 ${idiomCards.length} 条，口径见 FR/v0.6 §2.1）`);
  }
  if (idiomGroups.length !== IDIOM_GROUP_COUNT) {
    fail(`成语应有 ${IDIOM_GROUP_COUNT} 个主题组（实际 ${idiomGroups.length} 个）`);
  }

  const categoryIds = new Set();
  const names = new Set();
  for (const category of categories) {
    if (categoryIds.has(category.id)) fail(`分类 id 重复：${category.id}`);
    categoryIds.add(category.id);
    if (names.has(category.name)) fail(`分类名重复：${category.name}`);
    names.add(category.name);
  }

  const cardIds = new Set();
  const perCategory = new Map();

  for (const card of cards) {
    if (cardIds.has(card.id)) fail(`卡片 id 重复：${card.id}`);
    cardIds.add(card.id);

    if (!categoryIds.has(card.categoryId)) {
      fail(`卡片 ${card.id} 指向不存在的分类 ${card.categoryId}`);
    }
    if (!card.pinyin.trim()) fail(`卡片 ${card.id} 缺少拼音`);
    else if (!pinyinToneOk(card)) fail(`卡片 ${card.id} 拼音缺少声调：${card.pinyin}`);

    const words = card.en.trim().split(/\s+/).filter(Boolean).length;
    if (words > EN_MAX_WORDS) fail(`卡片 ${card.id} 英文超过 ${EN_MAX_WORDS} 个单词：${card.en}`);

    if (card.kind === 'character') {
      if ([...card.zh].length !== 1) fail(`汉字卡 ${card.id} 的中文必须是 1 个字：${card.zh}`);
      if (typeof card.strokes !== 'number') fail(`汉字卡 ${card.id} 缺少笔画数`);
      else if (card.strokes < STROKES_MIN || card.strokes > STROKES_MAX) {
        fail(`汉字卡 ${card.id} 笔画数超出范围：${card.strokes}`);
      }
    }

    if (card.kind === 'poem') {
      if ([...card.zh].length > ZH_MAX_POEM) {
        fail(`诗词 ${card.id} 标题超过 ${ZH_MAX_POEM} 字：${card.zh}`);
      }
      if (!card.author?.trim()) fail(`诗词 ${card.id} 缺少作者`);
      else if ([...card.author].length > AUTHOR_MAX) fail(`诗词 ${card.id} 作者过长：${card.author}`);
      if (!card.dynasty?.trim()) fail(`诗词 ${card.id} 缺少朝代`);
      else if ([...card.dynasty].length > DYNASTY_MAX) fail(`诗词 ${card.id} 朝代过长：${card.dynasty}`);
      if (card.lines.length < POEM_LINES_MIN) {
        fail(`诗词 ${card.id} 正文不足 ${POEM_LINES_MIN} 行`);
      }
      if (card.lines.length > POEM_LINES_MAX) {
        fail(`诗词 ${card.id} 正文超过 ${POEM_LINES_MAX} 行（${card.lines.length}）`);
      }
      for (const line of card.lines) {
        if ([...line].length === 0) fail(`诗词 ${card.id} 存在空行`);
        else if ([...line].length > POEM_LINE_MAX) {
          fail(`诗词 ${card.id} 单行超过 ${POEM_LINE_MAX} 字：${line}`);
        }
      }
      if (!card.translation?.trim()) fail(`诗词 ${card.id} 缺少译文`);
      else if ([...card.translation].length > TRANSLATION_MAX) {
        fail(`诗词 ${card.id} 译文超过 ${TRANSLATION_MAX} 字`);
      }
      if (![1, 2, 3].includes(card.difficulty)) fail(`诗词 ${card.id} 难度非法：${card.difficulty}`);
    } else if (card.kind === 'story') {
      if ([...card.zh].length > STORY_TITLE_MAX) {
        fail(`故事 ${card.id} 标题超过 ${STORY_TITLE_MAX} 字：${card.zh}`);
      }
      if (!card.moral?.trim()) fail(`故事 ${card.id} 缺少寓意`);
      else if ([...card.moral].length > STORY_MORAL_MAX) {
        fail(`故事 ${card.id} 寓意超过 ${STORY_MORAL_MAX} 字`);
      }
      const pages = card.pages ?? [];
      if (pages.length !== STORY_PAGES_EXPECTED) {
        fail(`故事 ${card.id} 应为 ${STORY_PAGES_EXPECTED} 段（实际 ${pages.length} 段，口径见 FR/v0.2 §4）`);
      }
      if (pages.length < STORY_PAGES_MIN || pages.length > STORY_PAGES_MAX) {
        fail(`故事 ${card.id} 段数 ${pages.length} 超出 ${STORY_PAGES_MIN}–${STORY_PAGES_MAX}`);
      }
      for (const [pageIndex, page] of pages.entries()) {
        if (!page.text.trim()) fail(`故事 ${card.id} 第 ${pageIndex + 1} 段没有文字`);
        else if ([...page.text].length > STORY_PAGE_TEXT_MAX) {
          fail(`故事 ${card.id} 第 ${pageIndex + 1} 段文字超过 ${STORY_PAGE_TEXT_MAX} 字`);
        }
        if (!page.scene || !page.subject) {
          fail(`故事 ${card.id} 第 ${pageIndex + 1} 段缺少 scene / subject（分镜信息，用于合成综合图）`);
        } else if (!imageKeys.scenes.has(page.scene) || !imageKeys.subjects.has(page.subject)) {
          fail(
            `故事 ${card.id} 第 ${pageIndex + 1} 段的 ${page.scene} / ${page.subject} 未在 scripts/prepare-images.mjs 注册`,
          );
        }
      }
      if (![1, 2, 3].includes(card.difficulty)) fail(`故事 ${card.id} 难度非法：${card.difficulty}`);
    } else if (card.kind === 'idiom') {
      const length = [...card.zh].length;
      if (length !== IDIOM_LEN) fail(`成语 ${card.id} 必须是 ${IDIOM_LEN} 个字（实际 ${length} 个字）`);
      if (!card.meaning.trim()) fail(`成语 ${card.id} 缺少释义`);
      else if ([...card.meaning].length < IDIOM_MEANING_MIN || [...card.meaning].length > IDIOM_MEANING_MAX) {
        fail(
          `成语 ${card.id} 释义 ${[...card.meaning].length} 字，应为 ${IDIOM_MEANING_MIN}–${IDIOM_MEANING_MAX} 字`,
        );
      }
      if (card.examples.length < IDIOM_EXAMPLES_MIN || card.examples.length > IDIOM_EXAMPLES_MAX) {
        fail(
          `成语 ${card.id} 例句 ${card.examples.length} 条，应为 ${IDIOM_EXAMPLES_MIN}–${IDIOM_EXAMPLES_MAX} 条`,
        );
      }
      for (const example of card.examples) {
        const exampleLength = [...example].length;
        if (exampleLength < IDIOM_EXAMPLE_MIN || exampleLength > IDIOM_EXAMPLE_MAX) {
          fail(
            `成语 ${card.id} 例句 ${exampleLength} 字，应为 ${IDIOM_EXAMPLE_MIN}–${IDIOM_EXAMPLE_MAX} 字：${example}`,
          );
        }
      }
      if (card.synonyms.length < IDIOM_RELATED_MIN || card.synonyms.length > IDIOM_RELATED_MAX) {
        fail(
          `成语 ${card.id} 近义 ${card.synonyms.length} 个，应为 ${IDIOM_RELATED_MIN}–${IDIOM_RELATED_MAX} 个`,
        );
      }
      if (card.antonyms.length > IDIOM_RELATED_MAX) {
        fail(`成语 ${card.id} 反义 ${card.antonyms.length} 个，最多 ${IDIOM_RELATED_MAX} 个`);
      }
      for (const word of [...card.synonyms, ...card.antonyms]) {
        if ([...word].length !== IDIOM_LEN) {
          fail(`成语 ${card.id} 的近反义「${word}」不是 ${IDIOM_LEN} 字成语`);
        }
      }
      if (!card.citation.trim()) fail(`成语 ${card.id} 缺少出处`);
      else if ([...card.citation].length > IDIOM_CITATION_MAX) {
        fail(`成语 ${card.id} 出处超过 ${IDIOM_CITATION_MAX} 字：${card.citation}`);
      }
      if (![1, 2, 3].includes(card.difficulty)) fail(`成语 ${card.id} 难度非法：${card.difficulty}`);
    } else if ([...card.zh].length > ZH_MAX) {
      fail(`卡片 ${card.id} 中文超过 ${ZH_MAX} 字：${card.zh}`);
    }

    try {
      await access(path.join(PUBLIC_DIR, card.image));
    } catch {
      fail(`卡片 ${card.id} 图片缺失：public/${card.image}（运行 npm run prepare:images）`);
    }

    perCategory.set(card.categoryId, (perCategory.get(card.categoryId) ?? 0) + 1);
  }

  for (const category of categories) {
    try {
      await access(path.join(PUBLIC_DIR, category.cover));
    } catch {
      fail(`分类 ${category.id} 封面缺失：public/${category.cover}（运行 npm run prepare:images）`);
    }
    if (!perCategory.get(category.id)) fail(`分类 ${category.id}（${category.name}）没有任何卡片`);
  }

  // 汉字主题分组：新增字必须同步 characterGroups.ts，否则分类页筛选会漏字
  const groupOfZh = new Map();
  for (const group of groups) {
    if (group.chars.length === 0) fail(`分组 ${group.key} 里没有任何汉字`);
    for (const zh of group.chars) {
      if (groupOfZh.has(zh)) {
        fail(`汉字「${zh}」同时出现在分组 ${groupOfZh.get(zh)} 与 ${group.key}`);
      }
      groupOfZh.set(zh, group.key);
    }
  }
  const charCards = cards.filter((card) => card.kind === 'character');
  const charZhs = new Set(charCards.map((card) => card.zh));
  for (const card of charCards) {
    if (!groupOfZh.has(card.zh)) {
      fail(`汉字「${card.zh}」（${card.id}）未归入任何主题组，请同步 src/data/seed/characterGroups.ts`);
    }
  }
  for (const zh of groupOfZh.keys()) {
    if (!charZhs.has(zh)) fail(`分组里的「${zh}」没有对应汉字卡（可能已删除或改字）`);
  }

  // 故事主题分组：每个故事必须归组，分组里的故事也必须存在（同汉字分组口径）
  const storyOfGroup = new Map();
  for (const group of storyGroups) {
    if (group.slugs.length === 0) fail(`故事分组 ${group.key} 里没有任何故事`);
    for (const slug of group.slugs) {
      if (storyOfGroup.has(slug)) {
        fail(`故事「${slug}」同时出现在分组 ${storyOfGroup.get(slug)} 与 ${group.key}`);
      }
      storyOfGroup.set(slug, group.key);
    }
  }
  const storySlugs = new Set(stories.map((story) => story.slug));
  for (const story of stories) {
    if (!storyOfGroup.has(story.slug)) {
      fail(`故事「${story.slug}」（${story.id}）未归入任何主题组，请同步 src/data/seed/storyGroups.ts`);
    }
  }
  for (const slug of storyOfGroup.keys()) {
    if (!storySlugs.has(slug)) fail(`分组里的故事「${slug}」没有对应卡片（可能已删除或改 slug）`);
  }

  const audio = await checkAudio(cards);

  checkImagePipelines(baseCards, imageKeys, styleTables);
  checkNumberCards(baseCards);
  checkPoemScenes(baseCards, imageKeys);
  checkPoemDynasties(baseCards, styleTables);
  checkCategoryColors(categories, imageKeys, styleTables);
  checkIdiomScenes(cards, imageKeys);
  checkIdiomGroups(idiomCards, idiomGroups);

  console.log('内容统计：');
  for (const category of categories) {
    console.log(`  ${category.name.padEnd(6, ' ')} ${String(perCategory.get(category.id) ?? 0).padStart(3, ' ')} 张`);
  }
  console.log(`  ${'合计'.padEnd(6, ' ')} ${String(cards.length).padStart(3, ' ')} 张 / ${categories.length} 个分类`);
  if (audio) {
    console.log(`  ${'音频'.padEnd(6, ' ')} ${String(audio.count).padStart(3, ' ')} 条 / ${(audio.bytes / 1024 / 1024).toFixed(2)} MB`);
  }

  if (groups.length > 0) {
    console.log('汉字分组（分类页筛选）：');
    for (const group of groups) {
      console.log(`  ${group.name.padEnd(6, '　')} ${String(group.chars.length).padStart(3, ' ')} 字`);
    }
  }

  if (storyGroups.length > 0) {
    console.log('故事分组（分类页筛选）：');
    for (const group of storyGroups) {
      console.log(`  ${group.name.padEnd(6, '　')} ${String(group.slugs.length).padStart(3, ' ')} 本`);
    }
  }

  if (idiomGroups.length > 0) {
    console.log('成语分组（分类页筛选）：');
    for (const group of idiomGroups) {
      console.log(`  ${group.name.padEnd(6, '　')} ${String(group.slugs.length).padStart(3, ' ')} 条`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n内容校验失败（${errors.length} 项）：`);
    for (const message of errors) console.error(`  ✗ ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log('\n内容校验通过 ✓');
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
