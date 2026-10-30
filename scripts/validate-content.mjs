/**
 * 内容门禁：校验内置分类/卡片是否符合 PRD §6 字段规则，且图片齐备。
 *
 * 用法：npm run validate:content
 * 失败时以非 0 退出码结束，可接入 CI。
 */

import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CARDS_FILE = path.join(ROOT, 'src/data/seed/cards.ts');
const CATEGORIES_FILE = path.join(ROOT, 'src/data/seed/categories.ts');
const GROUPS_FILE = path.join(ROOT, 'src/data/seed/characterGroups.ts');
const STORY_FILE = path.join(ROOT, 'src/data/seed/stories.ts');
const STORY_GROUPS_FILE = path.join(ROOT, 'src/data/seed/storyGroups.ts');
const IMAGE_SCRIPT = path.join(ROOT, 'scripts/prepare-images.mjs');
const PUBLIC_DIR = path.join(ROOT, 'public');

const PINYIN_TONE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹ]/;
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

const errors = [];
const fail = (message) => errors.push(message);

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
  return [...source.matchAll(/\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)'[^}]*cover:\s*`([^`]+)`/g)].map(
    (item) => ({
      id: item[1],
      name: item[2],
      // 种子源码里 cover 用了 IMAGE_ROOT 常量模板，这里展开为实际相对路径
      cover: item[3].replace('${IMAGE_ROOT}', 'assets/images/covers'),
    }),
  );
}

async function parseCards() {
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
async function parseStories() {
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

/** 出图脚本里的场景与主体 key：页里写了不存在的 key 会静默画成占位块 */
async function parseImageKeys() {
  const source = await readFile(IMAGE_SCRIPT, 'utf8');
  const castBody = /const CAST_SPECS = \{([\s\S]*?)\n\};/.exec(source)?.[1] ?? '';
  const subjects = new Set([...castBody.matchAll(/^  ([a-zA-Z]+): \{ art:/gm)].map((item) => item[1]));
  const sceneBody = /const STORY_SCENES = \{([\s\S]*?)\n\};/.exec(source)?.[1] ?? '';
  const scenes = new Set([...sceneBody.matchAll(/^  ([a-z]+): \(\) =>/gm)].map((item) => item[1]));
  return { subjects, scenes };
}

async function main() {
  const [categories, baseCards, groups, stories, storyGroups, imageKeys] = await Promise.all([
    parseCategories(),
    parseCards(),
    parseCharacterGroups(),
    parseStories(),
    parseStoryGroups(),
    parseImageKeys(),
  ]);
  const cards = [...baseCards, ...stories];

  if (categories.length === 0) fail('未解析到任何分类');
  if (cards.length === 0) fail('未解析到任何卡片');
  if (stories.length !== STORY_COUNT) {
    fail(`故事应为 ${STORY_COUNT} 本（实际 ${stories.length} 本，口径见 FR/v0.2 §4）`);
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
    else if (!PINYIN_TONE.test(card.pinyin)) fail(`卡片 ${card.id} 拼音缺少声调：${card.pinyin}`);

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

  console.log('内容统计：');
  for (const category of categories) {
    console.log(`  ${category.name.padEnd(6, ' ')} ${String(perCategory.get(category.id) ?? 0).padStart(3, ' ')} 张`);
  }
  console.log(`  ${'合计'.padEnd(6, ' ')} ${String(cards.length).padStart(3, ' ')} 张 / ${categories.length} 个分类`);

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

  if (errors.length > 0) {
    console.error(`\n内容校验失败（${errors.length} 项）：`);
    for (const message of errors) console.error(`  ✗ ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log('\n内容校验通过 ✓');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
