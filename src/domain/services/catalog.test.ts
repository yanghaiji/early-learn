/** 目录领域服务单测（纯函数，无 mock） */

import { describe, expect, it } from 'vitest';
import {
  buildCardSequence,
  cardsOfCategory,
  countCardsByCategory,
  firstChar,
  nextSortOrder,
  searchCards,
  sortCards,
  sortCategories,
  stripTones,
} from './catalog';
import type { Card } from '../entities/card';
import type { Category } from '../entities/category';

function makeCategory(overrides: Partial<Category> & Pick<Category, 'id' | 'name'>): Category {
  return {
    color: 'mint',
    sortOrder: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeCard(overrides: Partial<Card> & Pick<Card, 'id' | 'zh'>): Card {
  return {
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

describe('sortCategories', () => {
  it('should_order_by_sort_order_when_values_differ', () => {
    const result = sortCategories([
      makeCategory({ id: 'b', name: '水果', sortOrder: 2 }),
      makeCategory({ id: 'a', name: '动物', sortOrder: 1 }),
    ]);
    expect(result.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('should_fall_back_to_created_at_then_id_when_sort_order_equal', () => {
    const result = sortCategories([
      makeCategory({ id: 'z', name: 'Z', sortOrder: 1, createdAt: '2026-10-02T00:00:00.000Z' }),
      makeCategory({ id: 'y', name: 'Y', sortOrder: 1, createdAt: '2026-10-01T00:00:00.000Z' }),
    ]);
    expect(result.map((item) => item.id)).toEqual(['y', 'z']);
  });

  it('should_not_mutate_input_when_sorting', () => {
    const input = [
      makeCategory({ id: 'b', name: '水果', sortOrder: 2 }),
      makeCategory({ id: 'a', name: '动物', sortOrder: 1 }),
    ];
    sortCategories(input);
    expect(input.map((item) => item.id)).toEqual(['b', 'a']);
  });
});

describe('sortCards', () => {
  it('should_order_cards_by_sort_order', () => {
    const result = sortCards([
      makeCard({ id: 'dog', zh: '狗', sortOrder: 2 }),
      makeCard({ id: 'cat', zh: '猫', sortOrder: 1 }),
    ]);
    expect(result.map((item) => item.id)).toEqual(['cat', 'dog']);
  });
});

describe('cardsOfCategory', () => {
  it('should_only_return_cards_of_target_category_when_mixed', () => {
    const cards = [
      makeCard({ id: 'cat', zh: '猫' }),
      makeCard({ id: 'apple', zh: '苹果', categoryId: 'fruit' }),
    ];
    expect(cardsOfCategory(cards, 'animals').map((item) => item.id)).toEqual(['cat']);
  });

  it('should_return_empty_array_when_category_has_no_card', () => {
    expect(cardsOfCategory([], 'animals')).toEqual([]);
  });
});

describe('countCardsByCategory', () => {
  it('should_count_cards_per_category', () => {
    const cards = [
      makeCard({ id: 'a1', zh: '猫' }),
      makeCard({ id: 'a2', zh: '狗' }),
      makeCard({ id: 'f1', zh: '苹果', categoryId: 'fruit' }),
    ];
    expect(countCardsByCategory(cards)).toEqual({ animals: 2, fruit: 1 });
  });
});

describe('searchCards', () => {
  const cards = [
    makeCard({ id: 'apple', zh: '苹果', pinyin: 'píng guǒ', en: 'apple', tags: ['红色'] }),
    makeCard({ id: 'cat', zh: '猫', pinyin: 'māo', en: 'cat', tags: ['宠物'] }),
  ];

  it('should_match_chinese_keyword', () => {
    expect(searchCards(cards, '苹').map((item) => item.id)).toEqual(['apple']);
  });

  it('should_match_english_case_insensitively', () => {
    expect(searchCards(cards, 'CAT').map((item) => item.id)).toEqual(['cat']);
  });

  it('should_match_pinyin_without_tones', () => {
    expect(searchCards(cards, 'pingguo').map((item) => item.id)).toEqual(['apple']);
    expect(searchCards(cards, 'mao').map((item) => item.id)).toEqual(['cat']);
  });

  it('should_match_tags', () => {
    expect(searchCards(cards, '宠物').map((item) => item.id)).toEqual(['cat']);
  });

  it('should_return_all_cards_when_keyword_blank', () => {
    expect(searchCards(cards, '   ')).toHaveLength(2);
  });

  it('should_return_empty_array_when_nothing_matches', () => {
    expect(searchCards(cards, '飞机')).toEqual([]);
  });
});

describe('buildCardSequence', () => {
  const cards = [
    makeCard({ id: 'cat', zh: '猫', sortOrder: 1 }),
    makeCard({ id: 'dog', zh: '狗', sortOrder: 2 }),
    makeCard({ id: 'pig', zh: '猪', sortOrder: 3 }),
  ];

  it('should_expose_prev_and_next_when_in_middle', () => {
    const sequence = buildCardSequence(cards, 'dog', 'animals');
    expect(sequence.index).toBe(1);
    expect(sequence.hasPrev).toBe(true);
    expect(sequence.hasNext).toBe(true);
  });

  it('should_disable_prev_at_first_card', () => {
    const sequence = buildCardSequence(cards, 'cat', 'animals');
    expect(sequence.hasPrev).toBe(false);
    expect(sequence.hasNext).toBe(true);
  });

  it('should_disable_next_at_last_card', () => {
    const sequence = buildCardSequence(cards, 'pig', 'animals');
    expect(sequence.hasPrev).toBe(true);
    expect(sequence.hasNext).toBe(false);
  });

  it('should_report_missing_card_when_id_not_found', () => {
    const sequence = buildCardSequence(cards, 'missing', 'animals');
    expect(sequence.card).toBeUndefined();
    expect(sequence.index).toBe(-1);
    expect(sequence.hasPrev).toBe(false);
    expect(sequence.hasNext).toBe(false);
  });
});

describe('nextSortOrder', () => {
  it('should_return_one_when_list_empty', () => {
    expect(nextSortOrder([])).toBe(1);
  });

  it('should_return_max_plus_one', () => {
    expect(nextSortOrder([{ sortOrder: 3 }, { sortOrder: 7 }, { sortOrder: 5 }])).toBe(8);
  });
});

describe('stripTones / firstChar', () => {
  it('should_remove_pinyin_tones_and_spaces', () => {
    expect(stripTones('Píng Guǒ')).toBe('pingguo');
  });

  it('should_take_first_grapheme', () => {
    expect(firstChar('苹果')).toBe('苹');
  });

  it('should_fallback_to_question_mark_when_blank', () => {
    expect(firstChar('   ')).toBe('?');
  });
});
