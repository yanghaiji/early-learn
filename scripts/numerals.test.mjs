/**
 * 中文数字解析（v0.5 §4.1）：出图脚本与内容门禁共用的唯一口径。
 *
 * 数字卡从 10 张扩到 28 张后「数组下标 + 1」不再等于卡片数值，
 * 一旦继续按下标出图，二十会画成 3、一百会画成 11 且无人报错。
 * 故本版把读法抽成纯函数并锁死：只认 一~一百 的规范写法，认不出就返回 null。
 */

import { describe, expect, it } from 'vitest';
import { cnNumberToValue } from './lib/numerals.mjs';

describe('cnNumberToValue', () => {
  it('should_return_digit_value_when_zh_is_one_to_nine', () => {
    const zh = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
    expect(zh.map((item) => cnNumberToValue(item))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('should_return_ten_when_zh_is_ten_without_head_or_tail', () => {
    expect(cnNumberToValue('十')).toBe(10);
  });

  it('should_return_teens_when_zh_starts_with_ten', () => {
    expect(cnNumberToValue('十一')).toBe(11);
    expect(cnNumberToValue('十七')).toBe(17);
    expect(cnNumberToValue('十九')).toBe(19);
  });

  it('should_return_round_tens_when_zh_is_twenty_to_ninety', () => {
    expect(cnNumberToValue('二十')).toBe(20);
    expect(cnNumberToValue('三十')).toBe(30);
    expect(cnNumberToValue('八十')).toBe(80);
    expect(cnNumberToValue('九十')).toBe(90);
  });

  it('should_return_composed_value_when_zh_has_ten_with_tail', () => {
    expect(cnNumberToValue('二十一')).toBe(21);
    expect(cnNumberToValue('五十六')).toBe(56);
    expect(cnNumberToValue('九十九')).toBe(99);
  });

  it('should_return_hundred_when_zh_is_one_hundred', () => {
    expect(cnNumberToValue('一百')).toBe(100);
  });

  it('should_ignore_surrounding_spaces_when_parsing_zh', () => {
    expect(cnNumberToValue(' 二十七 ')).toBe(27);
  });

  it('should_return_null_when_zh_is_not_a_valid_numeral', () => {
    const invalid = ['', '   ', '零', '百', '千', '十六十', '一百零一', '一百一', '十零', '猫', 'zero'];
    for (const zh of invalid) {
      expect(cnNumberToValue(zh), zh).toBeNull();
    }
  });

  it('should_return_null_when_zh_is_not_a_string', () => {
    for (const zh of [undefined, null, 12, {}]) {
      expect(cnNumberToValue(zh)).toBeNull();
    }
  });

  it('should_not_read_object_prototype_keys_when_zh_is_weird', () => {
    // DIGIT 用对象字面量存，直接取 key 会命中 constructor 等原型属性
    for (const zh of ['constructor', 'toString', '__proto__']) {
      expect(cnNumberToValue(zh)).toBeNull();
    }
  });
});
