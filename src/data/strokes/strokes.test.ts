import { describe, expect, it } from 'vitest';
import manifest from './manifest.json';
import { getSeedCatalog } from '../seed';

/**
 * 笔顺数据产物自守（v0.9 NFR §2.2 / T-X1）。
 *
 * 这里只验「生成物与内容是否对得上」，不验渲染：脚本退出码发现不了
 * 「产物没被更新就提交」这类漏跑，测试可以。
 * 与门禁 V8 同一口径（覆盖双向 + 笔画数一致），两边都留一份。
 */
const characterCards = getSeedCatalog().cards.filter((card) => card.kind === 'character');
const manifestChars = Object.keys(manifest.strokes);

describe('笔顺数据（v0.9）', () => {
  it('should_cover_320_plus_cards_when_manifest_generated', () => {
    expect(characterCards).toHaveLength(321);
  });

  it('should_match_card_set_exactly_when_comparing_manifest', () => {
    const cardChars = characterCards.map((card) => card.zh).sort();
    expect(manifestChars.slice().sort()).toEqual(cardChars);
  });

  it('should_report_no_missing_char_when_manifest_generated', () => {
    expect(manifest.missing).toEqual([]);
  });

  it('should_match_card_stroke_count_when_reading_manifest', () => {
    const mismatched = characterCards
      .map((card) => ({
        zh: card.zh,
        card: card.strokes,
        data: manifest.strokes[card.zh as keyof typeof manifest.strokes],
      }))
      .filter((row) => row.card !== row.data);
    expect(mismatched).toEqual([]);
  });

  it('should_sum_to_321_when_counting_group_members', () => {
    const perGroup = Object.values(manifest.groups).map((chars) => chars.length);
    expect(perGroup).toEqual([25, 55, 44, 38, 38, 44, 61, 16]);
    expect(perGroup.reduce((sum, count) => sum + count, 0)).toBe(321);
  });
});
