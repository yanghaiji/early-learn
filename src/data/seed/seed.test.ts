/**
 * 种子结构基线（v0.5 §6）：内容大扩容之前，先把「不会静默出错」的口径钉住。
 *
 * 本版没有新交互，风险全在数据与映射上：朝代漏组会让孩子翻不到诗，
 * 色板漏一处会让分类静默串成墨色底。断言只锁结构，不锁将要扩容的张数。
 */

import { describe, expect, it } from 'vitest';
import { SEED_CARDS } from './cards';
import { SEED_CATEGORIES } from './categories';
import { POEM_GROUPS, POEM_GROUP_BY_DYNASTY } from './characterGroups';
import { COLOR_TOKENS } from '../../domain/entities/category';

const poemCards = SEED_CARDS.filter((card) => card.kind === 'poem');
const groupKeys = POEM_GROUPS.map((group) => group.key);

describe('诗词朝代分组映射（v0.5 §4.2）', () => {
  it('should_split_poems_into_three_groups_when_listing_poem_groups', () => {
    expect(groupKeys).toEqual(['tang', 'song', 'other']);
    expect(POEM_GROUPS.map((group) => group.name)).toEqual(['唐诗', '宋词', '汉魏与明清']);
  });

  it('should_map_every_seed_poem_dynasty_to_existing_group_when_grouping_poems', () => {
    for (const card of poemCards) {
      const dynasty = card.dynasty ?? '';
      const key = POEM_GROUP_BY_DYNASTY[dynasty];
      expect(key, `诗《${card.zh}》的朝代「${dynasty}」没有对应分组`).toBeDefined();
      expect(groupKeys, `朝代「${dynasty}」映射到了不存在的分组`).toContain(key as string);
    }
  });

  it('should_map_other_dynasties_to_third_group_when_dynasty_is_not_tang_or_song', () => {
    expect(POEM_GROUP_BY_DYNASTY['唐']).toBe('tang');
    expect(POEM_GROUP_BY_DYNASTY['宋']).toBe('song');
    // 五代归宋词是本版既定口径（ADR-T2），写死防回退
    expect(POEM_GROUP_BY_DYNASTY['五代']).toBe('song');
    for (const dynasty of ['汉乐府', '南北朝', '唐前', '明', '清']) {
      expect(POEM_GROUP_BY_DYNASTY[dynasty], dynasty).toBe('other');
    }
  });
});

describe('分类色板 token（v0.5 §4.4 四处同步之一）', () => {
  it('should_contain_v05_color_tokens_when_listing_color_tokens', () => {
    for (const token of ['wave', 'moss', 'denim', 'linen']) {
      expect(COLOR_TOKENS, token).toContain(token);
    }
  });

  it('should_have_21_unique_color_tokens_when_listing_color_tokens', () => {
    expect(COLOR_TOKENS).toHaveLength(21);
    expect(new Set(COLOR_TOKENS).size).toBe(COLOR_TOKENS.length);
  });
});

describe('种子结构不变量', () => {
  it('should_have_unique_card_ids_when_seeding', () => {
    const ids = SEED_CARDS.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should_have_no_dangling_category_when_seeding', () => {
    const categoryIds = new Set(SEED_CATEGORIES.map((category) => category.id));
    for (const card of SEED_CARDS) {
      expect(categoryIds, `卡片 ${card.id} 指向不存在的分类`).toContain(card.categoryId);
    }
  });

  it('should_have_at_least_eight_cards_per_category_when_seeding', () => {
    // 听音选图四选一需要同分类干扰，单类少于 8 张会退化成跨类出题
    for (const category of SEED_CATEGORIES) {
      const count = SEED_CARDS.filter((card) => card.categoryId === category.id).length;
      expect(count, `分类 ${category.id} 只有 ${count} 张`).toBeGreaterThanOrEqual(8);
    }
  });
});
