/**
 * 笔顺播放器（v0.9 NFR §3.2 / §3.3 / §3.5 / T-X3）。
 *
 * 用假 writer 验状态机与减少动画：真库只会「在线播」，测不出去重、暂停与降级。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrokePlayer } from './StrokePlayer';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { useToastStore } from '../../../shared/store/toastStore';

const mocks = vi.hoisted(() => ({
  loadCharStrokeData: vi.fn(),
  create: vi.fn(),
  animateCharacter: vi.fn(),
  pauseAnimation: vi.fn(),
  showCharacter: vi.fn(),
}));

vi.mock('../../../data/strokes', () => ({
  loadCharStrokeData: (zh: string) => mocks.loadCharStrokeData(zh),
}));

vi.mock('hanzi-writer', () => ({
  default: { create: (...args: unknown[]) => mocks.create(...args) },
}));

/** 一个「字已画完」的 writer */
const fakeWriter = {
  animateCharacter: () => mocks.animateCharacter(),
  pauseAnimation: () => mocks.pauseAnimation(),
  showCharacter: () => mocks.showCharacter(),
};

beforeEach(() => {
  useSettingsStore.getState().resetSettings();
  useToastStore.setState({ toasts: [] });
  mocks.loadCharStrokeData
    .mockReset()
    .mockResolvedValue({ strokes: ['M0 0', 'M1 1'], medians: [[[0, 0], [1, 1]], [[2, 2], [3, 3]]] });
  mocks.create.mockReset().mockReturnValue(fakeWriter);
  mocks.animateCharacter.mockReset().mockResolvedValue({ canceled: false });
  mocks.pauseAnimation.mockReset().mockResolvedValue(undefined);
  mocks.showCharacter.mockReset().mockResolvedValue({ canceled: false });
});

describe('笔顺播放器（v0.9）', () => {
  it('should_show_static_char_and_button_when_never_played', () => {
    render(<StrokePlayer zh="手" />);

    expect(screen.getByText('手')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '看笔顺' })).toBeInTheDocument();
    // 不点不载也不建 writer（US-X1 末句：不自动播放）
    expect(mocks.loadCharStrokeData).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('should_animate_when_button_clicked', async () => {
    const user = userEvent.setup();
    render(<StrokePlayer zh="手" />);

    await user.click(screen.getByRole('button', { name: '看笔顺' }));

    expect(mocks.loadCharStrokeData).toHaveBeenCalledWith('手');
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.animateCharacter).toHaveBeenCalledTimes(1);
    // 画布接管后不再重复显示静态大字，按钮变「重播」
    expect(screen.queryByText('手')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重播' })).toBeInTheDocument();
  });

  it('should_pause_and_keep_drawn_strokes_when_stop_clicked', async () => {
    mocks.animateCharacter.mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    render(<StrokePlayer zh="手" />);

    await user.click(screen.getByRole('button', { name: '看笔顺' }));
    await user.click(await screen.findByRole('button', { name: '停止' }));

    expect(mocks.pauseAnimation).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '重播' })).toBeInTheDocument();
  });

  it('should_show_whole_char_without_animating_when_reduce_motion_on', async () => {
    useSettingsStore.getState().setReduceMotion(true);
    const user = userEvent.setup();
    render(<StrokePlayer zh="手" />);

    expect(screen.getByText(/减少动画/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '显示整字' }));

    expect(mocks.animateCharacter).not.toHaveBeenCalled();
    expect(mocks.showCharacter).toHaveBeenCalledTimes(1);
    const options = mocks.create.mock.calls[0]?.[2] as { showCharacter?: boolean } | undefined;
    expect(options?.showCharacter).toBe(true);
  });

  it('should_fall_back_to_static_char_when_data_fails', async () => {
    mocks.loadCharStrokeData.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    render(<StrokePlayer zh="手" />);

    await user.click(screen.getByRole('button', { name: '看笔顺' }));

    // 不抛错、不白屏：回到静态大字 + 一次提示（§3.5）
    expect(await screen.findByRole('button', { name: '看笔顺' })).toBeInTheDocument();
    expect(screen.getByText('手')).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(useToastStore.getState().toasts.map((item) => item.message)).toContain(
      '笔顺数据没加载成功，检查网络后再试',
    );
  });
});
