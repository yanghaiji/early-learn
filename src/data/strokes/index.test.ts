/**
 * 笔顺数据运行时入口（v0.9 NFR §2.3 / T-X2）。
 *
 * 三个约定：manifest 不进主 chunk 也能判「有没有按钮」；同组只载一次；
 * 载失败不留在缓存里（否则断网恢复后永远重试不了）。
 */

import { describe, expect, it, vi } from 'vitest';
import { createGroupCache, hasStrokeData, loadCharStrokeData, loadStrokeGroup } from './index';

describe('笔顺数据入口（v0.9）', () => {
  it('should_report_data_only_when_char_in_topic_group', () => {
    expect(hasStrokeData('猫')).toBe(true);
    expect(hasStrokeData('鑫')).toBe(false);
  });

  it('should_reuse_one_load_when_two_chars_share_a_group', async () => {
    // 猫 / 狗 同在 animals 组：同一个 Promise、同一份对象，第二次点击不再发请求
    const first = loadStrokeGroup('猫');
    const second = loadStrokeGroup('狗');
    expect(second).toBe(first);
    const group = await first;
    expect(group['猫']).toBe(await loadCharStrokeData('猫'));
    expect(group['狗']?.strokes.length).toBeGreaterThan(0);
  });

  it('should_return_matching_stroke_and_median_when_loading_one_char', async () => {
    const data = await loadCharStrokeData('猫');
    expect(data.strokes.length).toBe(11);
    expect(data.medians).toHaveLength(data.strokes.length);
    expect(data.medians[0]?.length).toBeGreaterThan(1);
  });

  it('should_reject_when_char_outside_groups', async () => {
    await expect(loadStrokeGroup('鑫')).rejects.toThrow('no-group');
  });

  it('should_load_again_when_previous_attempt_failed', async () => {
    const load = vi
      .fn<(key: string) => Promise<Record<string, { strokes: string[]; medians: number[][][] }>>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ 猫: { strokes: ['M0 0'], medians: [[[0, 0]]] } });
    const cached = createGroupCache(load);

    await expect(cached('animals')).rejects.toThrow('offline');
    // 失败必须摘掉缓存：下一次点击要真的重新载
    await expect(cached('animals')).resolves.toBeTruthy();
    expect(load).toHaveBeenCalledTimes(2);
    // 成功之后同一组复用，不再第三次载
    await cached('animals');
    expect(load).toHaveBeenCalledTimes(2);
  });
});
