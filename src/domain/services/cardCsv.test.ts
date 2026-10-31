/** CSV 行映射与校验单测（NFR/v0.9 §4.2~§4.4） */

import { describe, expect, it } from 'vitest';
import type { Card } from '../entities/card';
import type { Category } from '../entities/category';
import {
  CARD_CSV_COLUMNS,
  CSV_PLACEHOLDER_IMAGE,
  parseCardCsv,
  type CardCsvError,
  type CardCsvResult,
} from './cardCsv';

const TIME = '2026-10-01T00:00:00.000Z';
const HEADER = CARD_CSV_COLUMNS.join(',');
const CONTEXT = {
  categories: [makeCategory('animals', '动物', 1), makeCategory('characters', '汉字', 2)],
  cards: [makeCard('猫')],
};

function makeCategory(id: string, name: string, sortOrder: number): Category {
  return { id, name, color: 'mint', sortOrder, createdAt: TIME, updatedAt: TIME };
}

function makeCard(zh: string): Card {
  return {
    id: `animals-${zh}`,
    kind: 'object',
    categoryId: 'animals',
    zh,
    pinyin: 'māo',
    en: 'cat',
    image: 'assets/images/animals/cat.webp',
    tags: [],
    difficulty: 1,
    sortOrder: 1,
    createdAt: TIME,
    updatedAt: TIME,
  };
}

/** 按模板列顺序拼一行，空列留空，避免手数逗号 */
function row(cells: Partial<Record<(typeof CARD_CSV_COLUMNS)[number], string>>): string {
  return CARD_CSV_COLUMNS.map((name) => cells[name] ?? '').join(',');
}

function csv(...lines: string[]): string {
  return `${[HEADER, ...lines].join('\n')}\n`;
}

function pass(result: CardCsvResult) {
  if (!result.ok) throw new Error(`期望通过，实际报错：${JSON.stringify(result.errors)}`);
  return result.data;
}

function errorsOf(result: CardCsvResult): CardCsvError[] {
  if (result.ok) throw new Error('期望整表拒绝，实际通过');
  return result.errors;
}

describe('parseCardCsv', () => {
  it('should_build_every_card_when_all_rows_are_valid', () => {
    const names = ['狗', '鹅', '马', '牛', '羊', '鸡', '鸭', '猪', '兔', '熊'];
    const text = csv(
      ...names.map((zh) => row({ category: '动物', kind: 'object', zh, pinyin: 'gǒu', en: 'dog', difficulty: '1' })),
    );
    const plan = pass(parseCardCsv(text, CONTEXT));

    expect(plan.cards).toHaveLength(10);
    expect(plan.duplicates).toEqual([]);
    expect(plan.missingImage).toBe(10);
    expect(plan.byCategory).toEqual([{ categoryId: 'animals', name: '动物', count: 10 }]);
    expect(plan.cards[0]).toMatchObject({
      categoryId: 'animals',
      kind: 'object',
      zh: '狗',
      image: CSV_PLACEHOLDER_IMAGE,
      tags: [],
      difficulty: 1,
    });
  });

  it('should_reject_whole_table_and_keep_line_number_when_one_pinyin_has_no_tone', () => {
    const text = csv(
      row({ category: '动物', zh: '狗', pinyin: 'gǒu', en: 'dog' }),
      row({ category: '动物', zh: '鹅', pinyin: 'e', en: 'goose' }),
    );
    const errors = errorsOf(parseCardCsv(text, CONTEXT));

    expect(errors).toEqual([{ line: 3, field: 'pinyin', message: '拼音需带声调，例如 píng guǒ' }]);
  });

  it('should_report_category_error_when_name_is_unknown', () => {
    const text = csv(row({ category: '水果', zh: '苹果', pinyin: 'píng guǒ', en: 'apple' }));
    const errors = errorsOf(parseCardCsv(text, CONTEXT));

    expect(errors).toEqual([
      { line: 2, field: 'category', message: '找不到分类「水果」，请先在分类管理里新建' },
    ]);
  });

  it('should_skip_duplicate_row_without_blocking_others_when_zh_exists_in_same_category', () => {
    const text = csv(
      row({ category: '动物', zh: '猫', pinyin: 'māo', en: 'cat' }),
      row({ category: '动物', zh: '狗', pinyin: 'gǒu', en: 'dog' }),
    );
    const plan = pass(parseCardCsv(text, CONTEXT));

    expect(plan.cards.map((card) => card.zh)).toEqual(['狗']);
    expect(plan.duplicates).toEqual([{ line: 2, zh: '猫' }]);
    expect(plan.missingImage).toBe(1);
  });

  it('should_require_strokes_when_kind_is_character', () => {
    const text = csv(
      row({ category: '汉字', kind: 'character', zh: '山', pinyin: 'shān', en: 'mountain' }),
    );
    const errors = errorsOf(parseCardCsv(text, CONTEXT));

    expect(errors).toEqual([{ line: 2, field: 'strokes', message: '汉字卡必须在 strokes 列填笔画数' }]);
  });

  it('should_keep_strokes_and_words_when_character_row_is_complete', () => {
    const text = csv(
      row({
        category: '汉字',
        kind: 'character',
        zh: '山',
        pinyin: 'shān',
        en: 'mountain',
        strokes: '3',
        words: '高山|山上',
      }),
    );
    const plan = pass(parseCardCsv(text, CONTEXT));

    expect(plan.cards[0]).toMatchObject({
      categoryId: 'characters',
      kind: 'character',
      strokes: 3,
      words: ['高山', '山上'],
    });
  });

  it('should_reject_poem_kind_when_row_is_not_object_or_character', () => {
    const text = csv(
      row({ category: '动物', kind: 'poem', zh: '静夜思', pinyin: 'jìng yè sī', en: 'quiet night' }),
    );
    const errors = errorsOf(parseCardCsv(text, CONTEXT));

    expect(errors).toEqual([
      {
        line: 2,
        field: 'kind',
        message: '只支持 object / character（诗词 / 故事 / 成语请走 JSON 导入）',
      },
    ]);
  });

  it('should_report_header_error_when_required_column_missing', () => {
    const errors = errorsOf(parseCardCsv('category,zh,pinyin\n动物,狗,gǒu\n', CONTEXT));

    expect(errors).toEqual([{ line: 1, field: 'header', message: '表头缺少 en 列，请下载模板' }]);
  });

  it('should_report_image_error_when_path_is_relative', () => {
    const text = csv(
      row({ category: '动物', zh: '狗', pinyin: 'gǒu', en: 'dog', image: 'images/dog.webp' }),
    );
    const errors = errorsOf(parseCardCsv(text, CONTEXT));

    expect(errors).toEqual([
      { line: 2, field: 'image', message: '图片路径要以 / 开头，或用 https:// 或 data:image/' },
    ]);
  });
});
