/** 学习进度领域服务单测（纯函数，无 mock）。对应 NFR/v0.4/技术方案.md §2.2 */

import { describe, expect, it } from 'vitest';
import { RECENT_MAX, REVIEW_ROUND_MAX } from '../constants';
import type { Card, Difficulty } from '../entities/card';
import type { ProgressDocument } from '../entities/progress';
import { EMPTY_PROGRESS } from '../entities/progress';
import {
  buildReviewQueue,
  isFavorite,
  knownCount,
  markOf,
  prune,
  setMark,
  toggleFavorite,
  touchRecent,
  unknownCount,
} from './progress';

function doc(overrides: Partial<ProgressDocument> = {}): ProgressDocument {
  return { ...EMPTY_PROGRESS, ...overrides };
}

function makeCard(id: string, difficulty: Difficulty = 1): Card {
  return {
    id,
    kind: 'object',
    categoryId: 'animals',
    zh: id,
    pinyin: '',
    en: id,
    image: `assets/images/animals/${id}.webp`,
    tags: [],
    difficulty,
    sortOrder: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

/** 固定序列的伪随机源：保证「同级随机」可确定性重放 */
function seededRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

describe('toggleFavorite', () => {
  it('should_add_to_head_when_not_favorited', () => {
    const next = toggleFavorite(doc(), 'cat');
    expect(next.favorites).toEqual(['cat']);
  });

  it('should_prepend_newest_when_already_has_others', () => {
    const base = doc({ favorites: ['dog'] });
    const next = toggleFavorite(base, 'cat');
    expect(next.favorites).toEqual(['cat', 'dog']);
  });

  it('should_remove_when_already_favorited', () => {
    const base = doc({ favorites: ['cat', 'dog'] });
    const next = toggleFavorite(base, 'cat');
    expect(next.favorites).toEqual(['dog']);
  });

  it('should_not_mutate_input_or_shared_arrays', () => {
    const base = doc({ favorites: ['cat'] });
    toggleFavorite(base, 'dog');
    expect(base.favorites).toEqual(['cat']);
  });
});

describe('touchRecent', () => {
  it('should_add_new_card_to_head', () => {
    const next = touchRecent(doc(), 'cat', '2026-10-30T00:00:00.000Z');
    expect(next.recent).toEqual([{ cardId: 'cat', at: '2026-10-30T00:00:00.000Z' }]);
  });

  it('should_dedupe_and_move_revisited_card_to_head', () => {
    const base = doc({
      recent: [
        { cardId: 'cat', at: '2026-10-30T00:00:00.000Z' },
        { cardId: 'dog', at: '2026-10-29T00:00:00.000Z' },
      ],
    });
    const next = touchRecent(base, 'dog', '2026-10-30T01:00:00.000Z');
    expect(next.recent.map((entry) => entry.cardId)).toEqual(['dog', 'cat']);
  });

  it(`should_truncate_to_${RECENT_MAX}_when_exceeding_limit`, () => {
    const base = doc({
      recent: Array.from({ length: RECENT_MAX }, (_, i) => ({
        cardId: `c${i}`,
        at: '2026-10-30T00:00:00.000Z',
      })),
    });
    const next = touchRecent(base, 'fresh', '2026-10-30T02:00:00.000Z');
    expect(next.recent).toHaveLength(RECENT_MAX);
    expect(next.recent[0]?.cardId).toBe('fresh');
    expect(next.recent.some((entry) => entry.cardId === `c${RECENT_MAX - 1}`)).toBe(false);
  });

  it('should_ignore_empty_card_id', () => {
    const next = touchRecent(doc(), '', '2026-10-30T00:00:00.000Z');
    expect(next.recent).toEqual([]);
  });
});

describe('setMark', () => {
  it('should_record_status_when_marked', () => {
    const next = setMark(doc(), 'cat', 'known', '2026-10-30T00:00:00.000Z');
    expect(next.marks.cat).toEqual({ status: 'known', at: '2026-10-30T00:00:00.000Z' });
  });

  it('should_delete_key_when_status_null', () => {
    const base = doc({ marks: { cat: { status: 'known', at: '2026-10-30T00:00:00.000Z' } } });
    const next = setMark(base, 'cat', null, '2026-10-30T01:00:00.000Z');
    expect(next.marks.cat).toBeUndefined();
  });

  it('should_overwrite_previous_status', () => {
    const base = doc({ marks: { cat: { status: 'known', at: '2026-10-30T00:00:00.000Z' } } });
    const next = setMark(base, 'cat', 'unknown', '2026-10-30T01:00:00.000Z');
    expect(next.marks.cat?.status).toBe('unknown');
  });
});

describe('isFavorite / markOf', () => {
  it('should_report_membership_and_mark', () => {
    const base = doc({
      favorites: ['cat'],
      marks: { dog: { status: 'unknown', at: '2026-10-30T00:00:00.000Z' } },
    });
    expect(isFavorite(base, 'cat')).toBe(true);
    expect(isFavorite(base, 'dog')).toBe(false);
    expect(markOf(base, 'dog')).toBe('unknown');
    expect(markOf(base, 'cat')).toBeUndefined();
  });
});

describe('prune', () => {
  it('should_drop_ids_not_in_existing_set_from_all_collections', () => {
    const base = doc({
      favorites: ['cat', 'ghost'],
      recent: [
        { cardId: 'dog', at: '2026-10-30T00:00:00.000Z' },
        { cardId: 'ghost', at: '2026-10-30T00:00:00.000Z' },
      ],
      marks: { ghost: { status: 'known', at: '2026-10-30T00:00:00.000Z' } },
    });
    const next = prune(base, new Set(['cat', 'dog']));
    expect(next.favorites).toEqual(['cat']);
    expect(next.recent.map((entry) => entry.cardId)).toEqual(['dog']);
    expect(next.marks).toEqual({});
  });

  it('should_keep_untouched_document_when_all_ids_exist', () => {
    const base = doc({ favorites: ['cat'] });
    expect(prune(base, new Set(['cat']))).toEqual(base);
  });
});

describe('knownCount / unknownCount', () => {
  it('should_count_only_existing_cards', () => {
    const base = doc({
      marks: {
        cat: { status: 'known', at: '2026-10-30T00:00:00.000Z' },
        dog: { status: 'unknown', at: '2026-10-30T00:00:00.000Z' },
        pig: { status: 'unknown', at: '2026-10-30T00:00:00.000Z' },
      },
    });
    const existing = new Set(['cat', 'dog']);
    expect(knownCount(base, existing)).toBe(1);
    expect(unknownCount(base, existing)).toBe(1);
  });

  it('should_count_all_marks_when_existing_ids_omitted', () => {
    const base = doc({
      marks: {
        cat: { status: 'known', at: '2026-10-30T00:00:00.000Z' },
        dog: { status: 'known', at: '2026-10-30T00:00:00.000Z' },
      },
    });
    expect(knownCount(base)).toBe(2);
  });
});

describe('buildReviewQueue', () => {
  const cards = [makeCard('a'), makeCard('b'), makeCard('c'), makeCard('d')];

  it('should_only_include_unknown_marked_cards', () => {
    const base = doc({
      marks: {
        a: { status: 'known', at: '2026-10-30T00:00:00.000Z' },
        b: { status: 'unknown', at: '2026-10-30T00:00:00.000Z' },
        c: { status: 'unknown', at: '2026-10-30T00:00:00.000Z' },
      },
    });
    expect(buildReviewQueue(base, cards, 10, seededRng([0.5])).map((card) => card.id)).toEqual([
      'b',
      'c',
    ]);
  });

  it('should_ignore_marked_ids_absent_from_cards', () => {
    const base = doc({
      marks: {
        b: { status: 'unknown', at: '2026-10-30T00:00:00.000Z' },
        ghost: { status: 'unknown', at: '2026-10-30T00:00:00.000Z' },
      },
    });
    expect(buildReviewQueue(base, cards, 10, seededRng([0.5])).map((card) => card.id)).toEqual(['b']);
  });

  it('should_order_by_difficulty_asc_when_levels_differ', () => {
    const mixed = [makeCard('hard', 3), makeCard('mid', 2), makeCard('easy', 1)];
    const base = doc({
      marks: {
        hard: { status: 'unknown', at: '2026-10-30T00:00:00.000Z' },
        mid: { status: 'unknown', at: '2026-10-30T00:00:00.000Z' },
        easy: { status: 'unknown', at: '2026-10-30T00:00:00.000Z' },
      },
    });
    expect(buildReviewQueue(base, mixed, 10, seededRng([0.5])).map((card) => card.id)).toEqual([
      'easy',
      'mid',
      'hard',
    ]);
  });

  it('should_truncate_to_review_round_max_by_default', () => {
    const many = Array.from({ length: REVIEW_ROUND_MAX + 2 }, (_, i) => makeCard(`c${i}`));
    const base = doc({
      marks: Object.fromEntries(
        many.map((card) => [card.id, { status: 'unknown' as const, at: '2026-10-30T00:00:00.000Z' }]),
      ),
    });
    expect(buildReviewQueue(base, many, undefined, seededRng([0.5]))).toHaveLength(REVIEW_ROUND_MAX);
  });

  it('should_be_deterministic_when_seeded_rng_replayed', () => {
    const base = doc({
      marks: {
        a: { status: 'unknown', at: '2026-10-30T00:00:00.000Z' },
        b: { status: 'unknown', at: '2026-10-30T00:00:00.000Z' },
        c: { status: 'unknown', at: '2026-10-30T00:00:00.000Z' },
        d: { status: 'unknown', at: '2026-10-30T00:00:00.000Z' },
      },
    });
    const first = buildReviewQueue(base, cards, 10, seededRng([0.9, 0.1, 0.7, 0.3]));
    const second = buildReviewQueue(base, cards, 10, seededRng([0.9, 0.1, 0.7, 0.3]));
    expect(first.map((card) => card.id)).toEqual(second.map((card) => card.id));
    expect(first).toHaveLength(4);
  });

  it('should_return_empty_queue_when_nothing_marked_unknown', () => {
    expect(buildReviewQueue(doc(), cards, 10, seededRng([0.5]))).toEqual([]);
  });
});
