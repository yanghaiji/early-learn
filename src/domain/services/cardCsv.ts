/**
 * CSV 行映射与校验。对应 NFR/v0.9 §4.2~§4.4。
 *
 * 口径：**整表拒绝** —— 只要有一行不合法就返回 errors，不产出任何 CardInput，
 * 与 JSON 导入「一张不合法整体拒绝」保持一致（ADR-X3）。
 * 重复只跳过、不阻断（同分类内 `zh` 相同即视为重复）。
 */

import { LIMITS } from '../constants';
import type { Card, CardInput, CardKind, Difficulty } from '../entities/card';
import type { Category } from '../entities/category';
import { parseCsv } from './csv';
import { validateCardRules } from './validation';

/** 模板列顺序（表头可换序、可少列，但四列必填） */
export const CARD_CSV_COLUMNS = [
  'category',
  'kind',
  'zh',
  'pinyin',
  'en',
  'difficulty',
  'tags',
  'strokes',
  'words',
  'image',
] as const;

/** 必填列：其余列留空按默认值补 */
export const CARD_CSV_REQUIRED = ['category', 'zh', 'pinyin', 'en'] as const;

/** `image` 留空时落这张占位图（由 `prepare:images` 生成，T-X7 接） */
export const CSV_PLACEHOLDER_IMAGE = 'assets/images/placeholder.webp';

const CSV_KINDS: readonly CardKind[] = ['object', 'character'];
const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3];

export interface CardCsvError {
  /** 文件行号（表头算第 1 行） */
  line: number;
  field: string;
  message: string;
}

export interface CardCsvDuplicate {
  line: number;
  zh: string;
}

export interface CardCsvPlan {
  /** 待写入的卡片（不含 id / sortOrder，由仓储补齐） */
  cards: CardInput[];
  /** 同分类同名的行：跳过、单列给家长看 */
  duplicates: CardCsvDuplicate[];
  /** 未填 image 的行数（导入后走占位图） */
  missingImage: number;
  /** 预览用的分类分布 */
  byCategory: { categoryId: string; name: string; count: number }[];
}

export type CardCsvResult = { ok: true; data: CardCsvPlan } | { ok: false; errors: CardCsvError[] };

export interface CardCsvContext {
  categories: readonly Category[];
  /** 现有卡片，用于同分类同名判重 */
  cards: readonly Card[];
}

function splitList(value: string): string[] {
  return value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** 允许绝对路径、http(s) 与内联 data URL；其余视为写错 */
function isImagePath(value: string): boolean {
  return (
    value.startsWith('/') ||
    value.startsWith('https://') ||
    value.startsWith('http://') ||
    value.startsWith('data:image/')
  );
}

function findCategory(categories: readonly Category[], raw: string): Category | undefined {
  return categories.find((item) => item.id === raw) ?? categories.find((item) => item.name.trim() === raw);
}

export function parseCardCsv(raw: string, context: CardCsvContext): CardCsvResult {
  const parsed = parseCsv(raw);
  if (!parsed.ok) return { ok: false, errors: [{ line: 1, field: 'header', message: parsed.message }] };

  const { header, rows } = parsed.data;
  const columnAt = new Map<string, number>();
  header.forEach((name, at) => {
    const key = name.toLowerCase();
    if (key && !columnAt.has(key)) columnAt.set(key, at);
  });

  const missingColumns = CARD_CSV_REQUIRED.filter((name) => !columnAt.has(name));
  if (missingColumns.length > 0) {
    return {
      ok: false,
      errors: [
        {
          line: 1,
          field: 'header',
          message: `表头缺少 ${missingColumns.join(' / ')} 列，请下载模板`,
        },
      ],
    };
  }

  const cellOf = (cells: string[], name: string): string => {
    const at = columnAt.get(name);
    return at === undefined ? '' : (cells[at] ?? '').trim();
  };

  const errors: CardCsvError[] = [];
  const plan: CardCsvPlan = { cards: [], duplicates: [], missingImage: 0, byCategory: [] };
  const seen = new Set(context.cards.map((card) => `${card.categoryId}\u0000${card.zh}`));
  const tally = new Map<string, number>();

  for (const row of rows) {
    const { line, cells } = row;
    if (cells.every((cell) => cell.trim().length === 0)) continue;

    const push = (field: string, message: string) => errors.push({ line, field, message });
    const errorStart = errors.length;

    if (cells.length !== header.length) {
      push('columns', `这一行有 ${cells.length} 列，表头有 ${header.length} 列`);
      continue;
    }

    const rawCategory = cellOf(cells, 'category');
    const category = rawCategory ? findCategory(context.categories, rawCategory) : undefined;
    if (!rawCategory) push('category', '请填写分类（id 或名称）');
    else if (!category) push('category', `找不到分类「${rawCategory}」，请先在分类管理里新建`);

    const rawKind = cellOf(cells, 'kind').toLowerCase();
    const kind = rawKind === '' ? 'object' : rawKind;
    if (!(CSV_KINDS as readonly string[]).includes(kind)) {
      push('kind', '只支持 object / character（诗词 / 故事 / 成语请走 JSON 导入）');
    }

    const zh = cellOf(cells, 'zh');
    if (!zh) push('zh', '请填写中文名');

    const pinyin = cellOf(cells, 'pinyin');
    if (!pinyin) push('pinyin', '请填写带声调的拼音');

    const rawDifficulty = cellOf(cells, 'difficulty');
    const difficulty = rawDifficulty === '' ? 1 : Number(rawDifficulty);
    if (!(DIFFICULTIES as readonly number[]).includes(difficulty)) {
      push('difficulty', '难度只能是 1 / 2 / 3');
    }

    const rawStrokes = cellOf(cells, 'strokes');
    let strokes: number | undefined;
    if (rawStrokes !== '') {
      const value = Number(rawStrokes);
      if (!Number.isInteger(value) || value < LIMITS.STROKES_MIN || value > LIMITS.STROKES_MAX) {
        push('strokes', `笔画数只能是 ${LIMITS.STROKES_MIN}–${LIMITS.STROKES_MAX} 的整数`);
      } else {
        strokes = value;
      }
    }
    if (kind === 'character' && strokes === undefined && rawStrokes === '') {
      push('strokes', '汉字卡必须在 strokes 列填笔画数');
    }

    const tags = splitList(cellOf(cells, 'tags'));
    if (tags.length > LIMITS.TAG_MAX) push('tags', `标签最多 ${LIMITS.TAG_MAX} 个`);
    else if (tags.some((tag) => [...tag].length > LIMITS.TAG_LEN)) {
      push('tags', `每个标签最多 ${LIMITS.TAG_LEN} 个字`);
    }

    const words = splitList(cellOf(cells, 'words'));
    if (words.length > LIMITS.WORDS_MAX) push('words', `组词最多 ${LIMITS.WORDS_MAX} 个`);
    else if (words.some((word) => [...word].length > LIMITS.WORD_LEN)) {
      push('words', `每个组词最多 ${LIMITS.WORD_LEN} 个字`);
    }

    const rawImage = cellOf(cells, 'image');
    if (rawImage && !isImagePath(rawImage)) {
      push('image', '图片路径要以 / 开头，或用 https:// 或 data:image/');
    }

    // 结构层已经有错就不再跑跨字段规则，避免同一行报一长串派生错误
    if (errors.length > errorStart || !category) continue;

    const input: CardInput = {
      kind: kind as CardKind,
      categoryId: category.id,
      zh,
      pinyin,
      en: cellOf(cells, 'en'),
      image: rawImage || CSV_PLACEHOLDER_IMAGE,
      tags,
      difficulty: difficulty as Difficulty,
      ...(kind === 'character' && strokes !== undefined ? { strokes } : {}),
      ...(words.length > 0 ? { words } : {}),
    };

    const ruleErrors = validateCardRules(input);
    if (ruleErrors.length > 0) {
      for (const issue of ruleErrors) push(issue.field, issue.message);
      continue;
    }

    const key = `${category.id}\u0000${zh}`;
    if (seen.has(key)) {
      plan.duplicates.push({ line, zh });
      continue;
    }
    seen.add(key);
    plan.cards.push(input);
    if (!rawImage) plan.missingImage += 1;
    tally.set(category.id, (tally.get(category.id) ?? 0) + 1);
  }

  if (errors.length > 0) return { ok: false, errors };

  plan.byCategory = context.categories
    .filter((category) => tally.has(category.id))
    .map((category) => ({
      categoryId: category.id,
      name: category.name,
      count: tally.get(category.id) ?? 0,
    }));
  return { ok: true, data: plan };
}
