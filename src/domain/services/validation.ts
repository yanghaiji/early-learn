/**
 * 校验服务：Zod 负责结构，规则函数负责跨字段不变量。
 * 对应 NFR/v0.1/技术方案.md §3.3、§6.1
 */

import { z } from 'zod';
import { LIMITS, PINYIN_TONE_REGEX } from '../constants';
import type { Card, CardInput, ExportBundle } from '../entities/card';
import { COLOR_TOKENS, type Category, type CategoryInput } from '../entities/category';
import { DISPLAY_MODES, type Settings } from '../entities/settings';
import { MARK_STATUSES, type ProgressDocument } from '../entities/progress';
import { SPEECH_RATES } from '../constants';

const nonEmpty = z.string().trim().min(1);

export const categorySchema = z.object({
  id: nonEmpty,
  name: z.string().trim().min(1).max(LIMITS.CATEGORY_NAME_MAX),
  nameEn: z.string().trim().max(LIMITS.CATEGORY_NAME_EN_MAX).optional(),
  color: z.enum(COLOR_TOKENS),
  cover: z.string().optional(),
  sortOrder: z.number().int(),
  description: z.string().max(200).optional(),
  createdAt: nonEmpty,
  updatedAt: nonEmpty,
});

export const imageSourceSchema = z.object({
  provider: nonEmpty,
  author: z.string().optional(),
  url: z.string().optional(),
  license: nonEmpty,
});

export const storyPageSchema = z.object({
  text: z.string().trim().min(1).max(LIMITS.STORY_PAGE_TEXT_MAX),
  image: nonEmpty.optional(),
});

export const cardSchema = z.object({
  id: nonEmpty,
  kind: z.enum(['object', 'character', 'poem', 'story']),
  categoryId: nonEmpty,
  zh: z.string().trim().min(LIMITS.ZH_MIN).max(LIMITS.ZH_MAX_POEM),
  pinyin: z.string().trim().min(1).max(LIMITS.PINYIN_MAX),
  en: nonEmpty,
  phonetic: z.string().trim().optional(),
  image: nonEmpty,
  tags: z.array(z.string().trim().min(1).max(LIMITS.TAG_LEN)).max(LIMITS.TAG_MAX),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  sortOrder: z.number().int(),
  strokes: z.number().int().min(LIMITS.STROKES_MIN).max(LIMITS.STROKES_MAX).optional(),
  words: z.array(z.string().trim().min(1).max(LIMITS.WORD_LEN)).max(LIMITS.WORDS_MAX).optional(),
  radical: z.string().trim().max(2).optional(),
  author: z.string().trim().max(LIMITS.AUTHOR_MAX).optional(),
  dynasty: z.string().trim().max(LIMITS.DYNASTY_MAX).optional(),
  lines: z
    .array(z.string().trim().min(1).max(LIMITS.POEM_LINE_MAX))
    .max(LIMITS.POEM_LINES_MAX)
    .optional(),
  translation: z.string().trim().max(LIMITS.TRANSLATION_MAX).optional(),
  pages: z.array(storyPageSchema).max(LIMITS.STORY_PAGES_MAX).optional(),
  moral: z.string().trim().max(LIMITS.STORY_MORAL_MAX).optional(),
  source: imageSourceSchema.optional(),
  createdAt: nonEmpty,
  updatedAt: nonEmpty,
});

export const catalogDocumentSchema = z.object({
  schemaVersion: z.number().int().min(0),
  categories: z.array(categorySchema),
  cards: z.array(cardSchema),
  savedAt: nonEmpty,
});

export const exportBundleSchema = catalogDocumentSchema.extend({
  app: z.literal('early-learn'),
  appVersion: nonEmpty,
  exportedAt: nonEmpty,
});

export const settingsSchema = z.object({
  displayMode: z.enum(DISPLAY_MODES as unknown as [string, ...string[]]),
  speechEnabled: z.boolean(),
  speechRate: z.union(SPEECH_RATES.map((rate) => z.literal(rate)) as [
    z.ZodLiteral<0.6>,
    z.ZodLiteral<0.8>,
    z.ZodLiteral<1>,
    z.ZodLiteral<1.2>,
  ]),
  speakOnEnter: z.boolean(),
  reduceMotion: z.boolean(),
});

export interface FieldError {
  field: string;
  message: string;
}

/** 原型污染防护：导入前递归检查危险键 */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function hasUnsafeKeys(value: unknown, depth = 0): boolean {
  if (depth > 12 || value === null || typeof value !== 'object') return false;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (UNSAFE_KEYS.has(key)) return true;
    if (hasUnsafeKeys((value as Record<string, unknown>)[key], depth + 1)) return true;
  }
  return false;
}

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** 卡片跨字段不变量（PRD §6.1 / §6.3） */
export function validateCardRules(card: Card | CardInput): FieldError[] {
  const errors: FieldError[] = [];

  if (card.kind === 'character' && card.zh.trim().length !== 1) {
    errors.push({ field: 'zh', message: '汉字卡的中文名必须是 1 个汉字' });
  }
  if (card.kind === 'character') {
    if (typeof card.strokes !== 'number') {
      errors.push({ field: 'strokes', message: '汉字卡必须填写笔画数' });
    }
  }
  if (card.kind !== 'poem' && card.kind !== 'story' && card.zh.trim().length > LIMITS.ZH_MAX) {
    errors.push({ field: 'zh', message: `中文名最多 ${LIMITS.ZH_MAX} 个字` });
  }
  if (card.kind === 'story') {
    const titleLength = [...card.zh.trim()].length;
    if (titleLength > LIMITS.STORY_TITLE_MAX) {
      errors.push({ field: 'zh', message: `故事标题最多 ${LIMITS.STORY_TITLE_MAX} 个字` });
    }
    const pages = card.pages ?? [];
    if (pages.length < LIMITS.STORY_PAGES_MIN) {
      errors.push({ field: 'pages', message: `故事至少 ${LIMITS.STORY_PAGES_MIN} 段` });
    }
    if (pages.length > LIMITS.STORY_PAGES_MAX) {
      errors.push({ field: 'pages', message: `故事最多 ${LIMITS.STORY_PAGES_MAX} 段` });
    }
    if (pages.some((page) => !page.text.trim())) {
      errors.push({ field: 'pages', message: '每一段都要写一句话' });
    }
  }
  if (card.kind === 'poem') {
    if (!card.author?.trim()) errors.push({ field: 'author', message: '诗词卡必须填写作者' });
    if (!card.dynasty?.trim()) errors.push({ field: 'dynasty', message: '诗词卡必须填写朝代' });
    const lines = card.lines ?? [];
    if (lines.length < LIMITS.POEM_LINES_MIN) {
      errors.push({ field: 'lines', message: `正文至少 ${LIMITS.POEM_LINES_MIN} 行` });
    }
    if (!card.translation?.trim()) {
      errors.push({ field: 'translation', message: '诗词卡必须填写白话译文' });
    }
  }
  if (countWords(card.en) > LIMITS.EN_MAX_WORDS) {
    errors.push({ field: 'en', message: `英文最多 ${LIMITS.EN_MAX_WORDS} 个单词` });
  }
  if (!PINYIN_TONE_REGEX.test(card.pinyin)) {
    errors.push({ field: 'pinyin', message: '拼音需带声调，例如 píng guǒ' });
  }
  const tags = card.tags ?? [];
  if (new Set(tags).size !== tags.length) {
    errors.push({ field: 'tags', message: '标签不能重复' });
  }
  if (card.words && card.words.length > LIMITS.WORDS_MAX) {
    errors.push({ field: 'words', message: `组词最多 ${LIMITS.WORDS_MAX} 个` });
  }
  return errors;
}

/** 分类重名校验（归一化后比较，PRD §6.2） */
export function validateCategoryRules(
  existing: readonly Category[],
  input: Pick<CategoryInput, 'name'>,
  excludeId?: string,
): FieldError[] {
  const target = input.name.trim().toLowerCase();
  const duplicated = existing.some(
    (item) => item.id !== excludeId && item.name.trim().toLowerCase() === target,
  );
  return duplicated ? [{ field: 'name', message: '分类名已存在' }] : [];
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; message: string; path?: string };

function describeIssue(error: z.ZodError): { message: string; path?: string } {
  const issue = error.issues[0];
  if (!issue) return { message: '数据格式不正确' };
  const path = issue.path.filter((p) => typeof p === 'string' || typeof p === 'number').join('.');
  return { message: issue.message, path: path || undefined };
}

export interface ParsedCatalog {
  schemaVersion: number;
  categories: Category[];
  cards: Card[];
  savedAt: string;
}

export function parseCatalogDocument(raw: unknown): ParseResult<ParsedCatalog> {
  const result = catalogDocumentSchema.safeParse(raw);
  if (!result.success) return { ok: false, ...describeIssue(result.error) };
  return { ok: true, data: result.data as unknown as ParsedCatalog };
}

/** 导入校验：结构 + 业务上限 + 原型污染（PRD §10.3） */
export function parseImportBundle(raw: unknown): ParseResult<ExportBundle> {
  if (hasUnsafeKeys(raw)) {
    return { ok: false, message: '文件包含非法字段（疑似原型污染），已拒绝导入' };
  }
  const result = exportBundleSchema.safeParse(raw);
  if (!result.success) {
    const described = describeIssue(result.error);
    return {
      ok: false,
      message: `导入文件格式不正确：${described.message}`,
      ...(described.path ? { path: described.path } : {}),
    };
  }
  const bundle = result.data as unknown as ExportBundle;
  if (bundle.cards.length > LIMITS.IMPORT_MAX_CARDS) {
    return { ok: false, message: `卡片数量超过上限（${LIMITS.IMPORT_MAX_CARDS} 张）` };
  }
  const ruleErrors = bundle.cards.flatMap((card) =>
    validateCardRules(card).map((err) => `${card.zh}: ${err.message}`),
  );
  if (ruleErrors.length > 0) {
    return { ok: false, message: ruleErrors.slice(0, 3).join('；') };
  }
  const categoryIds = new Set(bundle.categories.map((c) => c.id));
  const dangling = bundle.cards.filter((c) => !categoryIds.has(c.categoryId));
  if (dangling.length > 0) {
    return {
      ok: false,
      message: `有 ${dangling.length} 张卡片指向不存在的分类（如「${dangling[0]?.zh ?? ''}」）`,
    };
  }
  return { ok: true, data: bundle };
}

export function parseSettings(raw: unknown): Settings | undefined {
  const result = settingsSchema.safeParse(raw);
  if (!result.success) return undefined;
  return result.data as unknown as Settings;
}

/** 学习进度（v0.4 B 组）：结构容错，非法即返回 undefined，由仓储回退空文档 */
export const progressDocumentSchema = z.object({
  schemaVersion: z.number().int(),
  favorites: z.array(nonEmpty),
  recent: z.array(z.object({ cardId: nonEmpty, at: nonEmpty })),
  marks: z.record(z.string(), z.object({ status: z.enum(MARK_STATUSES as [string, ...string[]]), at: nonEmpty })),
});

export function parseProgress(raw: unknown): ProgressDocument | undefined {
  if (hasUnsafeKeys(raw)) return undefined;
  const result = progressDocumentSchema.safeParse(raw);
  if (!result.success) return undefined;
  return result.data as unknown as ProgressDocument;
}
