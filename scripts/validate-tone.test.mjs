/**
 * 拼音声调门禁（v0.5）：带声调放行，或属于轻声白名单的单字卡放行。
 *
 * 第八组「口语与常用」的 的(de)/了(le) 是普通话合法轻声、本就没有声调符，
 * 若沿用「一律必须带声调」会误杀；故按字白名单豁免。此测试锁死豁免范围：
 * 只认 的/了 两字，其它字漏标声调仍判红，防止白名单被随手扩大。
 */

import { describe, expect, it } from 'vitest';
import { pinyinToneOk } from './validate-content.mjs';

describe('pinyinToneOk', () => {
  it('should_pass_when_pinyin_carries_a_tone_mark', () => {
    expect(pinyinToneOk({ kind: 'character', zh: '在', pinyin: 'zài' })).toBe(true);
    expect(pinyinToneOk({ kind: 'object', zh: '猫', pinyin: 'māo' })).toBe(true);
  });

  it('should_pass_when_character_is_neutral_tone_whitelist', () => {
    expect(pinyinToneOk({ kind: 'character', zh: '的', pinyin: 'de' })).toBe(true);
    expect(pinyinToneOk({ kind: 'character', zh: '了', pinyin: 'le' })).toBe(true);
  });

  it('should_fail_when_character_is_toneless_but_not_whitelisted', () => {
    // 妈应为 mā：漏标声调必须报错，白名单不得被稀释
    expect(pinyinToneOk({ kind: 'character', zh: '妈', pinyin: 'ma' })).toBe(false);
  });

  it('should_fail_when_whitelisted_zh_is_not_a_single_character_card', () => {
    // 的/了 的豁免只对汉字单字卡生效，其它 kind 命中同名 zh 也不放行
    expect(pinyinToneOk({ kind: 'object', zh: '的', pinyin: 'de' })).toBe(false);
    expect(pinyinToneOk({ kind: 'poem', zh: '村居', pinyin: 'cun ju' })).toBe(false);
  });

  it('should_fail_when_pinyin_is_empty', () => {
    expect(pinyinToneOk({ kind: 'character', zh: '猫', pinyin: '' })).toBe(false);
  });
});
