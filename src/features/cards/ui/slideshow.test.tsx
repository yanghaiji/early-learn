/** 连播状态机 / 清除进度 / 收藏 Toast / 家长说明页（PRD US-A1 / US-A6 / US-A7 · M-D） */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRouter } from '../../../app/router';
import { SLIDESHOW_GAP_MS } from '../../../domain/constants';
import { EMPTY_PROGRESS } from '../../../domain/entities/progress';
import { STORAGE_KEYS } from '../../../data/storage/keys';
import { useProgressStore } from '../../../shared/store/progressStore';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { useToastStore } from '../../../shared/store/toastStore';
import { markGatePassed } from '../../admin/gateSession';
import { __setSlideshowGapForTest, stopSlideshow } from '../hooks/useSlideshow';
import { clearSpeechStub, resetLocalStorage, stubChineseVoices } from '../../../test/helpers';

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  resetLocalStorage();
  window.sessionStorage.clear();
  useSettingsStore.getState().resetSettings();
  useProgressStore.setState({ doc: EMPTY_PROGRESS, persistent: true });
  useToastStore.setState({ toasts: [] });
  markGatePassed();
  // 间隔缩短：契约值 2s 由常量保证，用例只验证「到点才推进」这一行为
  __setSlideshowGapForTest(60);
});

afterEach(() => {
  stopSlideshow();
  __setSlideshowGapForTest(SLIDESHOW_GAP_MS);
  clearSpeechStub();
  vi.restoreAllMocks();
});

describe('详情页连播（US-A6）', () => {
  it('should_read_first_card_and_enter_playing_when_slideshow_started', async () => {
    const user = userEvent.setup();
    stubChineseVoices();
    window.location.hash = '#/card/animals-cat';
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: '连播' }));

    expect(await screen.findByRole('button', { name: '停止连播' })).toBeInTheDocument();
    expect(screen.getByLabelText('猫 卡片详情')).toBeInTheDocument();
  });

  it('should_stop_immediately_and_not_advance_when_stop_clicked', async () => {
    const user = userEvent.setup();
    stubChineseVoices();
    __setSlideshowGapForTest(10_000);
    window.location.hash = '#/card/animals-cat';
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: '连播' }));
    await user.click(screen.getByRole('button', { name: '停止连播' }));

    await wait(150);
    expect(await screen.findByLabelText('猫 卡片详情')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '连播' })).toBeInTheDocument();
  });

  it('should_stop_when_leaving_detail_page_and_not_resume', async () => {
    const user = userEvent.setup();
    stubChineseVoices();
    __setSlideshowGapForTest(120);
    window.location.hash = '#/card/animals-cat';
    const { unmount } = render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: '连播' }));
    unmount();
    await wait(250);

    window.location.hash = '#/card/animals-dog';
    render(<AppRouter />);
    // 回详情页不自动续播
    expect(await screen.findByRole('button', { name: '连播' })).toBeInTheDocument();
    await wait(200);
    expect(screen.getByLabelText('狗 卡片详情')).toBeInTheDocument();
  });

  it('should_stop_when_unreadable_and_stay_on_card', async () => {
    const user = userEvent.setup();
    // 不装桩：jsdom 无语音能力 → 连播不得「静默一张张跳」
    window.location.hash = '#/card/animals-cat';
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: '连播' }));

    await wait(150);
    expect(screen.getByLabelText('猫 卡片详情')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '连播' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/朗读/);
  });

  it('should_not_auto_advance_when_user_flips_manually', async () => {
    const user = userEvent.setup();
    stubChineseVoices();
    window.location.hash = '#/card/animals-cat';
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: '连播' }));
    await waitFor(() => {
      expect(screen.getByLabelText('狗 卡片详情')).toBeInTheDocument();
    });

    // 连播接管期间用户手动翻页即夺回控制权
    await user.keyboard('{ArrowRight}');
    await wait(250);
    expect(screen.getByLabelText('猪 卡片详情')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '连播' })).toBeInTheDocument();
  });

  it('should_not_advance_before_reading_done_when_reading_takes_longer_than_gap', async () => {
    const user = userEvent.setup();
    stubChineseVoices();
    // 停顿从「读完」起算（技术方案 §4.3）：把念完拖到 400ms，测试节拍 60ms 不得在读一半时就把卡翻走
    window.speechSynthesis.speak = vi.fn((utterance: SpeechSynthesisUtterance) => {
      const target = utterance as unknown as { onstart: (() => void) | null; onend: (() => void) | null };
      window.setTimeout(() => {
        target.onstart?.();
        target.onend?.();
      }, 400);
    });
    window.location.hash = '#/card/animals-cat';
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: '连播' }));
    await wait(200);
    expect(screen.getByLabelText('猫 卡片详情')).toBeInTheDocument();

    expect(await screen.findByLabelText('狗 卡片详情', undefined, { timeout: 3000 })).toBeInTheDocument();
  });

  it('should_toast_group_finished_and_not_loop_when_last_card_reached', async () => {
    const user = userEvent.setup();
    stubChineseVoices();
    // 蝴蝶是内置动物分类的末位卡
    window.location.hash = '#/card/animals-butterfly';
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: '连播' }));

    expect(await screen.findByText('这一组看完啦')).toBeInTheDocument();
    await wait(200);
    expect(screen.getByLabelText('蝴蝶 卡片详情')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '连播' })).toBeInTheDocument();
  });

  it('should_stop_and_hint_when_reading_becomes_unavailable_midway', async () => {
    const user = userEvent.setup();
    stubChineseVoices();
    __setSlideshowGapForTest(300);
    window.location.hash = '#/card/animals-cat';
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: '连播' }));
    await waitFor(() => {
      expect(screen.getByLabelText('狗 卡片详情')).toBeInTheDocument();
    });

    // 中途朗读不可用：立即停，绝不「静默地一张张跳过」
    useSettingsStore.setState((state) => ({ settings: { ...state.settings, speechEnabled: false } }));
    await wait(700);
    expect(screen.getByLabelText('狗 卡片详情')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '连播' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/朗读/);
  });
});

describe('管理区清除学习进度（技术方案任务 13）', () => {
  it('should_remove_progress_key_only_when_clear_progress_confirmed', async () => {
    const user = userEvent.setup();
    useProgressStore.getState().toggleFavorite('animals-cat');
    expect(window.localStorage.getItem(STORAGE_KEYS.progress)).not.toBeNull();

    window.location.hash = '#/admin/data';
    render(<AppRouter />);
    // 内容键是启动时才落盘，必须在 render 之后取快照
    const catalogBefore = window.localStorage.getItem(STORAGE_KEYS.catalog);
    expect(catalogBefore).not.toBeNull();

    await user.click(await screen.findByRole('button', { name: '清除学习进度' }));
    const dialog = await screen.findByRole('dialog', { name: '清除学习进度' });
    await user.click(within(dialog).getByRole('button', { name: '确认清除' }));

    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEYS.progress)).toBeNull();
    });
    expect(useProgressStore.getState().doc).toEqual(EMPTY_PROGRESS);
    // 只清进度，内容键不受影响
    expect(window.localStorage.getItem(STORAGE_KEYS.catalog)).toBe(catalogBefore);
  });
});

describe('收藏 Toast 与只读提示（US-A1 / PRD §6.3）', () => {
  it('should_toast_added_then_removed_when_favorite_toggled', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/card/animals-cat';
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: '收藏这张卡' }));
    expect(await screen.findByText('已加入收藏')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '取消收藏' }));
    expect(await screen.findByText('已取消收藏')).toBeInTheDocument();

    // 同文案不堆叠：反复收藏/取消，每种文案仍只有一条
    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole('button', { name: '收藏这张卡' }));
      await user.click(screen.getByRole('button', { name: '取消收藏' }));
    }
    expect(screen.getAllByText('已加入收藏')).toHaveLength(1);
    expect(screen.getAllByText('已取消收藏')).toHaveLength(1);
  });

  it('should_merge_toasts_when_tapped_many_times', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/card/animals-cat';
    render(<AppRouter />);

    const btn = await screen.findByRole('button', { name: /收藏/ });
    for (let i = 0; i < 20; i += 1) await user.click(btn);

    expect(screen.getAllByRole('status').length).toBeLessThanOrEqual(2);
  });

  it('should_hint_not_saved_only_once_when_storage_unavailable', async () => {
    const user = userEvent.setup();
    useProgressStore.setState({ persistent: false });
    window.location.hash = '#/card/animals-cat';
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: /收藏/ }));
    await user.click(screen.getByRole('button', { name: '认识' }));
    await user.click(screen.getByRole('button', { name: '不认识' }));

    expect(screen.getAllByText('本机存储不可用，标记不会保存')).toHaveLength(1);
  });
});

describe('家长使用说明页（US-A7）', () => {
  it('should_show_six_topics_and_no_admin_entry_when_guide_opened', async () => {
    window.location.hash = '#/guide';
    render(<AppRouter />);

    expect(await screen.findByRole('heading', { name: '给家长的使用说明' })).toBeInTheDocument();
    for (const topic of [
      /分类怎么用/,
      /发音从哪来/,
      /家长管理怎么进/,
      /怎么自己加卡片/,
      /导出与备份/,
      /没声了怎么办/,
    ]) {
      expect(screen.getByText(topic)).toBeInTheDocument();
    }
    // 说明页只解释门怎么开，不给管理入口
    expect(screen.queryByRole('link', { name: /管理/ })).not.toBeInTheDocument();
  });

  it('should_link_guide_from_home_when_categories_exist', async () => {
    window.location.hash = '#/';
    render(<AppRouter />);

    expect(await screen.findByRole('link', { name: '给家长的使用说明' })).toBeInTheDocument();
  });
});
