/**
 * 种子结构基线（v0.5 §6）：内容大扩容之前，先把「不会静默出错」的口径钉住。
 *
 * 本版没有新交互，风险全在数据与映射上：朝代漏组会让孩子翻不到诗，
 * 色板漏一处会让分类静默串成墨色底。断言只锁结构，不锁将要扩容的张数。
 */

import { describe, expect, it } from 'vitest';
import { SEED_CARDS } from './cards';
import { SEED_CATEGORIES } from './categories';
import { POEM_GROUPS, POEM_GROUP_BY_DYNASTY, CHARACTER_GROUPS, CHARACTER_GROUP_BY_ZH } from './characterGroups';
import { IDIOM_GROUPS, IDIOM_GROUP_BY_ID } from './idioms';
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

  it('should_keep_21_color_tokens_when_idioms_reuse_denim', () => {
    // v0.6 不新增颜色：成语复用 v0.5 已注册的 denim（PRD §3.1 分类色）
    expect(COLOR_TOKENS).toHaveLength(21);
    expect(new Set(COLOR_TOKENS).size).toBe(COLOR_TOKENS.length);
  });
});

describe('内容规模（v0.5 §2 总表 / v0.6 §2）', () => {
  const byCategory = (categoryId: string) => SEED_CARDS.filter((card) => card.categoryId === categoryId);

  it('should_have_809_cards_in_22_categories_when_seeded', () => {
    expect(SEED_CARDS).toHaveLength(809);
    expect(SEED_CATEGORIES).toHaveLength(22);
  });

  it('should_have_28_numbers_in_canonical_order_when_seeded', () => {
    const nums = [...byCategory('numbers')].sort((a, b) => a.sortOrder - b.sortOrder);
    expect(nums).toHaveLength(28);
    // 钉死数字卡的中文序列（十一~二十 / 三十~九十 / 一百），不再依赖「排列位置算数字」
    expect(nums.map((card) => card.zh)).toEqual([
      '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
      '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
      '三十', '四十', '五十', '六十', '七十', '八十', '九十', '一百',
    ]);
  });

  it('should_have_321_characters_grouped_into_eight_themes_when_seeded', () => {
    expect(byCategory('characters')).toHaveLength(321);
    expect(CHARACTER_GROUPS.map((g) => g.key)).toContain('speech');
    const counts: Record<string, number> = {};
    for (const card of byCategory('characters')) {
      const key = CHARACTER_GROUP_BY_ZH.get(card.zh);
      expect(key, `汉字「${card.zh}」没有分组`).toBeDefined();
      counts[key as string] = (counts[key as string] ?? 0) + 1;
    }
    expect(Object.keys(counts)).toHaveLength(8);
    expect(counts.speech).toBe(16);
  });

  it('should_have_50_poems_split_30_15_5_when_grouped_by_dynasty', () => {
    const poems = byCategory('poems');
    expect(poems).toHaveLength(50);
    const tally: Record<string, number> = { tang: 0, song: 0, other: 0 };
    for (const card of poems) {
      const key = POEM_GROUP_BY_DYNASTY[card.dynasty ?? ''];
      expect(key, `诗《${card.zh}》朝代「${card.dynasty}」无组`).toBeDefined();
      tally[key as string] = (tally[key as string] ?? 0) + 1;
    }
    expect(tally).toEqual({ tang: 30, song: 15, other: 5 });
  });

  it('should_have_at_least_10_cards_per_new_category_when_seeded', () => {
    for (const categoryId of ['sea', 'insects', 'jobs', 'clothes']) {
      expect(byCategory(categoryId).length, categoryId).toBeGreaterThanOrEqual(10);
    }
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

/** v0.6 成语词典：字段全部为可选扩展，内容边界的唯一眼就在这张表里 */
describe('成语词典（v0.6 §3.2 / §5）', () => {
  const idioms = SEED_CARDS.filter((card) => card.kind === 'idiom');

  it('should_have_150_idioms_split_30_each_when_grouped_by_theme', () => {
    expect(idioms).toHaveLength(150);
    expect(IDIOM_GROUPS).toHaveLength(5);
    const tally: Record<string, number> = {};
    for (const card of idioms) {
      const key = IDIOM_GROUP_BY_ID.get(card.id);
      expect(key, `成语「${card.zh}」没有分组`).toBeDefined();
      tally[key as string] = (tally[key as string] ?? 0) + 1;
    }
    // 组名与「ID ↔ 组」表双向覆盖：表里多出 stale 项也会在下面被捉住
    expect(Object.keys(tally).sort()).toEqual(IDIOM_GROUPS.map((group) => group.key).sort());
    for (const group of IDIOM_GROUPS) {
      expect(tally[group.key], group.name).toBe(30);
    }
    expect(IDIOM_GROUP_BY_ID.size).toBe(idioms.length);
  });

  it('should_have_four_char_zh_with_toned_pinyin_when_seeding_idioms', () => {
    for (const card of idioms) {
      expect([...card.zh].length, card.zh).toBe(4);
      expect(card.pinyin, card.zh).toMatch(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/);
    }
  });

  it('should_have_meaning_examples_related_and_citation_when_seeding_idioms', () => {
    for (const card of idioms) {
      expect(card.meaning?.trim().length ?? 0, `${card.zh} 缺少释义`).toBeGreaterThanOrEqual(6);
      expect(card.examples?.length ?? 0, `${card.zh} 例句条数`).toBeGreaterThanOrEqual(2);
      for (const example of card.examples ?? []) {
        expect(example.trim(), card.zh).not.toBe('');
        expect([...example].length, `${card.zh} 例句过长`).toBeLessThanOrEqual(50);
      }
      expect(card.synonyms?.length ?? 0, `${card.zh} 近义`).toBeGreaterThanOrEqual(1);
      for (const word of [...(card.synonyms ?? []), ...(card.antonyms ?? [])]) {
        expect([...word].length, `${card.zh} 的近反义「${word}」`).toBe(4);
      }
      expect(card.citation?.trim(), `${card.zh} 缺少出处`).toBeTruthy();
    }
  });

  it('should_keep_en_empty_and_sort_order_unique_when_seeding_idioms', () => {
    // 成语无英文：点读走中文 TTS，音频门禁也按 en 非空才要求 mp3
    expect(idioms.every((card) => card.en === '')).toBe(true);
    const orders = idioms.map((card) => card.sortOrder);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('should_point_image_to_idioms_folder_when_seeding_idioms', () => {
    for (const card of idioms) {
      const slug = card.id.replace(/^idioms-/, '');
      expect(card.image, card.zh).toBe(`assets/images/idioms/${slug}.webp`);
      expect(card.categoryId).toBe('idioms');
    }
  });
});
