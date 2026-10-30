/** 听音选图出题领域服务单测（rng 全部注入，确定性重放）。对应 NFR/v0.4/技术方案.md §2.2 */

import { describe, expect, it } from 'vitest';
import { QUIZ_OPTIONS, QUIZ_QUESTIONS } from '../constants';
import type { Card, Difficulty } from '../entities/card';
import { EMPTY_PROGRESS, type ProgressDocument } from '../entities/progress';
import { buildDeck, buildQuestion, pickLangOptions } from './quiz';

function makeCard(id: string, categoryId = 'animals'): Card {
  return {
    id,
    kind: 'object',
    categoryId,
    zh: id,
    pinyin: '',
    en: id,
    image: `assets/images/${categoryId}/${id}.webp`,
    tags: [],
    difficulty: 1 as Difficulty,
    sortOrder: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

function doc(overrides: Partial<ProgressDocument> = {}): ProgressDocument {
  return { ...EMPTY_PROGRESS, ...overrides };
}

/** 固定序列的伪随机源 */
function seededRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

const catalog = [
  makeCard('cat'),
  makeCard('dog'),
  makeCard('pig'),
  makeCard('cow'),
  makeCard('bird'),
  makeCard('apple', 'fruit'),
];

describe('buildDeck', () => {
  it('should_prefer_browsed_cards_when_history_is_enough', () => {
    const history = doc({
      recent: [{ cardId: 'cat', at: '2026-10-30T00:00:00.000Z' }],
      favorites: ['dog'],
      marks: { pig: { status: 'known', at: '2026-10-30T00:00:00.000Z' } },
    });
    const deck = buildDeck(catalog, history, 3, seededRng([0.5]));
    expect(deck.map((card) => card.id).sort()).toEqual(['cat', 'dog', 'pig']);
  });

  it('should_fill_from_whole_catalog_when_history_below_size', () => {
    const history = doc({
      recent: [{ cardId: 'cat', at: '2026-10-30T00:00:00.000Z' }],
    });
    const deck = buildDeck(catalog, history, 4, seededRng([0.5]));
    expect(deck).toHaveLength(4);
    expect(deck.some((card) => card.id === 'cat')).toBe(true);
  });

  it('should_not_repeat_cards_within_one_deck', () => {
    const history = doc({
      recent: [
        { cardId: 'cat', at: '2026-10-30T00:00:00.000Z' },
        { cardId: 'cat', at: '2026-10-29T00:00:00.000Z' },
      ],
      favorites: ['cat'],
    });
    const deck = buildDeck(catalog, history, QUIZ_QUESTIONS, seededRng([0.5]));
    const ids = deck.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should_ignore_progress_ids_absent_from_catalog', () => {
    const history = doc({ favorites: ['ghost'] });
    const deck = buildDeck(catalog, history, 3, seededRng([0.5]));
    expect(deck.every((card) => card.id !== 'ghost')).toBe(true);
    expect(deck).toHaveLength(3);
  });

  it('should_cap_deck_at_catalog_size_when_smaller_than_size', () => {
    const small = [makeCard('cat'), makeCard('dog')];
    const deck = buildDeck(small, doc(), 10, seededRng([0.5]));
    expect(deck).toHaveLength(2);
  });

  it('should_return_empty_deck_when_catalog_empty', () => {
    expect(buildDeck([], doc(), QUIZ_QUESTIONS, seededRng([0.5]))).toEqual([]);
  });

  it('should_use_quiz_questions_as_default_size', () => {
    const deck = buildDeck(catalog, doc(), undefined, seededRng([0.5]));
    expect(deck).toHaveLength(Math.min(QUIZ_QUESTIONS, catalog.length));
  });
});

describe('buildQuestion', () => {
  it('should_build_options_with_one_answer_and_priority_to_same_category', () => {
    const answer = makeCard('cat');
    const question = buildQuestion(answer, catalog, seededRng([0.5]));
    expect(question.options).toHaveLength(QUIZ_OPTIONS);
    expect(question.options.filter((card) => card.id === 'cat')).toHaveLength(1);
    const distractors = question.options.filter((card) => card.id !== 'cat');
    expect(distractors.every((card) => card.categoryId === 'animals')).toBe(true);
  });

  it('should_fill_distractors_from_whole_catalog_when_category_short', () => {
    const answer = makeCard('cat');
    // animals 里只有 cat 一张，其余从全库补
    const question = buildQuestion(answer, [answer, makeCard('apple', 'fruit')], seededRng([0.5]));
    expect(question.options).toHaveLength(2);
    expect(question.options.map((card) => card.id).sort()).toEqual(['apple', 'cat']);
  });

  it('should_never_duplicate_option_ids_when_pool_reuses_answer', () => {
    const answer = makeCard('cat');
    const pool = [answer, makeCard('cat', 'fruit')]; // 同 id 出现两次（异常装配也不出双选项）
    const question = buildQuestion(answer, pool, seededRng([0.5]));
    const ids = question.options.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should_be_deterministic_when_seeded_rng_replayed', () => {
    const answer = makeCard('cat');
    const first = buildQuestion(answer, catalog, seededRng([0.9, 0.2, 0.7, 0.4]));
    const second = buildQuestion(answer, catalog, seededRng([0.9, 0.2, 0.7, 0.4]));
    expect(first.options.map((card) => card.id)).toEqual(second.options.map((card) => card.id));
  });

  it('should_expose_answer_reference_in_options', () => {
    const answer = makeCard('cow');
    const question = buildQuestion(answer, catalog, seededRng([0.5]));
    expect(question.options.some((card) => card.id === question.answer.id)).toBe(true);
  });
});

describe('pickLangOptions', () => {
  it('should_map_zh_mode_to_chinese_lang', () => {
    expect(pickLangOptions('zh')).toBe('zh-CN');
  });

  it('should_map_en_mode_to_english_lang', () => {
    expect(pickLangOptions('en')).toBe('en-US');
  });
});
