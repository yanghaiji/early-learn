/** 校验服务单测：结构（zod）+ 跨字段规则 + 导入防护 */

import { describe, expect, it } from 'vitest';
import {
  categorySchema,
  countWords,
  hasUnsafeKeys,
  parseCatalogDocument,
  parseImportBundle,
  parseSettings,
  validateCardRules,
  validateCategoryRules,
} from './validation';
import type { Card, StoryPage } from '../entities/card';
import type { Category } from '../entities/category';

function makeCard(overrides: Partial<Card> & Pick<Card, 'zh'>): Card {
  return {
    id: 'animals-cat',
    kind: 'object',
    categoryId: 'animals',
    pinyin: 'māo',
    en: 'cat',
    image: 'assets/images/animals/cat.webp',
    tags: [],
    difficulty: 1,
    sortOrder: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeCategory(id: string, name: string): Category {
  return {
    id,
    name,
    color: 'mint',
    sortOrder: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

describe('countWords', () => {
  it('should_count_words_ignoring_extra_spaces', () => {
    expect(countWords('  fire   truck ')).toBe(2);
  });
});

describe('validateCardRules', () => {
  it('should_pass_for_valid_object_card', () => {
    expect(validateCardRules(makeCard({ zh: '猫' }))).toEqual([]);
  });

  it('should_reject_multi_character_zh_when_kind_is_character', () => {
    const errors = validateCardRules(
      makeCard({ zh: '小猫', kind: 'character', strokes: 3, pinyin: 'xiǎo' }),
    );
    expect(errors.map((item) => item.field)).toContain('zh');
  });

  it('should_require_strokes_when_kind_is_character', () => {
    const errors = validateCardRules(makeCard({ zh: '人', kind: 'character', pinyin: 'rén' }));
    expect(errors.map((item) => item.field)).toContain('strokes');
  });

  it('should_reject_english_with_more_than_three_words', () => {
    const errors = validateCardRules(makeCard({ zh: '消防车', en: 'big red fire truck' }));
    expect(errors.map((item) => item.field)).toContain('en');
  });

  it('should_reject_pinyin_without_tone', () => {
    const errors = validateCardRules(makeCard({ zh: '猫', pinyin: 'mao' }));
    expect(errors.map((item) => item.field)).toContain('pinyin');
  });

  it('should_reject_duplicated_tags', () => {
    const errors = validateCardRules(makeCard({ zh: '猫', tags: ['宠物', '宠物'] }));
    expect(errors.map((item) => item.field)).toContain('tags');
  });

  it('should_reject_words_over_limit_for_character_card', () => {
    const errors = validateCardRules(
      makeCard({
        zh: '人',
        kind: 'character',
        pinyin: 'rén',
        strokes: 2,
        words: ['大人', '人们', '人民', '人生'],
      }),
    );
    expect(errors.map((item) => item.field)).toContain('words');
  });
});

/** 故事段落：默认 6 段，每段一句正文；配图由整篇共用一张综合图（ADR-S7） */
function makePages(count: number, text = '小猪盖了一座房子。'): StoryPage[] {
  return Array.from({ length: count }, () => ({ text }));
}

describe('validateCardRules · 故事绘本（v0.2）', () => {
  it('should_pass_for_valid_story_card', () => {
    const errors = validateCardRules(
      makeCard({ zh: '三只小猪', kind: 'story', pages: makePages(6), moral: '做事要认真。' }),
    );
    expect(errors).toEqual([]);
  });

  it('should_reject_story_with_too_few_pages', () => {
    const errors = validateCardRules(makeCard({ zh: '三只小猪', kind: 'story', pages: makePages(3) }));
    expect(errors.map((item) => item.field)).toContain('pages');
  });

  it('should_reject_story_paragraph_without_text', () => {
    const pages = makePages(6);
    pages[2] = { text: '   ' };
    const errors = validateCardRules(makeCard({ zh: '三只小猪', kind: 'story', pages }));
    expect(errors.map((item) => item.field)).toContain('pages');
  });

  it('should_accept_legacy_paragraph_with_image', () => {
    // 旧数据里每段都存了图，image 降为可选后仍能通过校验
    const pages = makePages(6).map((page, index) => ({
      ...page,
      image: `assets/images/stories/three-pigs/${index + 1}.webp`,
    }));
    const errors = validateCardRules(makeCard({ zh: '三只小猪', kind: 'story', pages }));
    expect(errors).toEqual([]);
  });

  it('should_reject_story_title_longer_than_limit', () => {
    const errors = validateCardRules(
      makeCard({ zh: '猪'.repeat(21), kind: 'story', pages: makePages(6) }),
    );
    expect(errors.map((item) => item.field)).toContain('zh');
  });
});

describe('validateCategoryRules', () => {
  const existing = [makeCategory('animals', '动物')];

  it('should_reject_duplicated_name_ignoring_case_and_space', () => {
    const errors = validateCategoryRules(existing, { name: ' 动物 ' });
    expect(errors[0]?.field).toBe('name');
  });

  it('should_allow_same_name_when_editing_self', () => {
    expect(validateCategoryRules(existing, { name: '动物' }, 'animals')).toEqual([]);
  });

  it('should_allow_new_name', () => {
    expect(validateCategoryRules(existing, { name: '水果' })).toEqual([]);
  });
});

/** 色板四处同步（v0.5 §4.4）：token 名不得带数字，apricot2 那类写法一律拒绝 */
describe('categorySchema · 分类色板 token', () => {
  it('should_accept_new_color_tokens_when_parsing_category', () => {
    for (const color of ['wave', 'moss', 'denim', 'linen']) {
      const result = categorySchema.safeParse({ ...makeCategory('c-new', '新分类'), color });
      expect(result.success, color).toBe(true);
    }
  });

  it('should_reject_unknown_color_token_when_parsing_category', () => {
    const result = categorySchema.safeParse({ ...makeCategory('c-new', '新分类'), color: 'apricot2' });
    expect(result.success).toBe(false);
  });
});

describe('hasUnsafeKeys', () => {
  it('should_detect_proto_pollution_payload', () => {
    const payload = JSON.parse('{"cards":[],"__proto__":{"polluted":true}}') as unknown;
    expect(hasUnsafeKeys(payload)).toBe(true);
  });

  it('should_pass_normal_object', () => {
    expect(hasUnsafeKeys({ cards: [{ zh: '猫' }] })).toBe(false);
  });
});

describe('parseCatalogDocument', () => {
  it('should_accept_valid_document', () => {
    const result = parseCatalogDocument({
      schemaVersion: 1,
      categories: [makeCategory('animals', '动物')],
      cards: [makeCard({ zh: '猫' })],
      savedAt: '2026-10-01T00:00:00.000Z',
    });
    expect(result.ok).toBe(true);
  });

  it('should_reject_document_with_missing_fields', () => {
    const result = parseCatalogDocument({ schemaVersion: 1, categories: [] });
    expect(result.ok).toBe(false);
  });
});

describe('parseImportBundle', () => {
  const bundle = {
    app: 'early-learn',
    appVersion: '0.1.0',
    exportedAt: '2026-10-01T00:00:00.000Z',
    schemaVersion: 1,
    savedAt: '2026-10-01T00:00:00.000Z',
    categories: [makeCategory('animals', '动物')],
    cards: [makeCard({ zh: '猫' })],
  };

  it('should_accept_valid_bundle', () => {
    const result = parseImportBundle(bundle);
    expect(result.ok).toBe(true);
  });

  it('should_reject_bundle_with_dangling_category', () => {
    const result = parseImportBundle({
      ...bundle,
      cards: [makeCard({ zh: '猫', categoryId: 'missing' })],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('不存在的分类');
  });

  it('should_reject_bundle_with_proto_pollution', () => {
    const raw = JSON.parse(JSON.stringify(bundle)) as Record<string, unknown>;
    Object.defineProperty(raw, '__proto__', { value: { hacked: true }, enumerable: true });
    const result = parseImportBundle(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('非法字段');
  });

  it('should_reject_bundle_with_invalid_card_rule', () => {
    const result = parseImportBundle({
      ...bundle,
      cards: [makeCard({ zh: '猫', pinyin: 'mao' })],
    });
    expect(result.ok).toBe(false);
  });
});

describe('parseSettings', () => {
  it('should_return_undefined_for_unknown_display_mode', () => {
    expect(
      parseSettings({ displayMode: 'fr', speechEnabled: true, speechRate: 0.8, speakOnEnter: false, reduceMotion: false }),
    ).toBeUndefined();
  });

  it('should_accept_valid_settings', () => {
    expect(
      parseSettings({ displayMode: 'both', speechEnabled: true, speechRate: 1, speakOnEnter: true, reduceMotion: false }),
    ).toEqual({ displayMode: 'both', speechEnabled: true, speechRate: 1, speakOnEnter: true, reduceMotion: false });
  });
});
