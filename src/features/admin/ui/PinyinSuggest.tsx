/**
 * 拼音候选（v0.8 US-W5）：按字列出全部读音，点选后才写入拼音框。
 *
 * 守 AGENT.md §6 的底线：不监听中文变化自动生成——多音字猜错比缺拼音更糟，
 * 所以本组件只在家长点击候选时回调 onPick，绝不自己 setPinyin。
 */

import { useState } from 'react';
import { PINYIN_DICT } from '../../../data/pinyin/dict';

interface Props {
  /** 中文（实物名 / 汉字 / 成语 / 标题） */
  zh: string;
  /** 拼音框当前值：点选时按位沿用，避免把家长已确认的音改回首读音（v0.8 复审修） */
  value?: string;
  /** 父组件持有拼音框的值，这里只负责拼好一串交回去 */
  onPick: (next: string) => void;
}

interface Slot {
  ch: string;
  readings: readonly string[];
}

export function PinyinSuggest({ zh, value = '', onPick }: Props) {
  // 选音状态跟着中文走：中文一改就作废，避免上一个词的选音串到新词
  const [state, setState] = useState<{ zh: string; picked: (string | undefined)[] }>({
    zh: '',
    picked: [],
  });
  const picked = state.zh === zh ? state.picked : [];

  const slots: Slot[] = [];
  const missing: string[] = [];
  for (const ch of Array.from(zh.trim())) {
    const readings = PINYIN_DICT[ch];
    if (readings && readings.length > 0) slots.push({ ch, readings });
    else if (!missing.includes(ch)) missing.push(ch);
  }

  // 缺字没有槽位，父组件的音节就对不上位：宁可不沿用，也不把音节错配到别的字上
  const existing = missing.length === 0 && value.trim() ? value.trim().split(/\s+/) : [];
  // 上一个词选过音、中文又改了：拼音框里留下的是旧词的音，要明确提示（v0.8 复审修）
  const stale = state.zh !== '' && state.zh !== zh && state.picked.length > 0;

  if (slots.length === 0) {
    if (!zh.trim()) return null;
    return (
      <p className="text-xs muted" style={{ margin: '6px 0 0' }}>
        {missing.length > 0
          ? `「${missing.join('」「')}」不在字典里，请手输拼音`
          : '请手输拼音'}
      </p>
    );
  }

  const pick = (slotIndex: number, reading: string) => {
    // 已选位 > 拼音框里已有的音节 > 首读音：一次点击能补全，但不会改掉确认过的音
    const next = slots.map((slot, index) =>
      index === slotIndex ? reading : (picked[index] ?? existing[index] ?? slot.readings[0] ?? ''),
    );
    setState({ zh, picked: next });
    onPick(next.filter(Boolean).join(' '));
  };

  return (
    <div className="pinyin-suggest" role="group" aria-label="拼音候选">
      <p className="text-xs muted" style={{ margin: 0 }}>
        点选发音后填入拼音；其余字沿用已有拼音，没有就取第一个读音
      </p>
      {missing.length > 0 ? (
        <p className="text-xs muted" style={{ margin: '6px 0 0' }}>
          {`「${missing.join('」「')}」不在字典里，请手动补这几个字的音节`}
        </p>
      ) : null}
      {stale ? (
        <p className="text-xs muted" style={{ margin: '6px 0 0' }}>
          中文改过了，拼音还是上一个词的，请重新点选或手动确认
        </p>
      ) : null}
      {slots.map((slot, index) => (
        <div className="pinyin-suggest__row" key={`${index}-${slot.ch}`}>
          <span className="pinyin-suggest__char" aria-hidden="true">
            {slot.ch}
          </span>
          <div className="chip-row" style={{ marginBottom: 0 }}>
            {slot.readings.map((reading) => (
              <button
                key={reading}
                type="button"
                className={picked[index] === reading ? 'chip chip--active' : 'chip'}
                aria-pressed={picked[index] === reading}
                aria-label={`${slot.ch} ${reading}`}
                onClick={() => pick(index, reading)}
              >
                {reading}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
