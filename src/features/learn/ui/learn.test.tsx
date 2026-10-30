/** 复习 / 听音选图 / 收藏链路测试（PRD US-A1 / US-A4 / US-A5 / §5 features 行） */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRouter } from '../../../app/router';
import type { CardId } from '../../../domain/entities/card';
import { EMPTY_PROGRESS, type ProgressDocument } from '../../../domain/entities/progress';
import { useProgressStore } from '../../../shared/store/progressStore';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { clearSpeechStub, resetLocalStorage, stubChineseVoices } from '../../../test/helpers';

function progressWith(overrides: Partial<ProgressDocument>): ProgressDocument {
  return { ...EMPTY_PROGRESS, ...overrides };
}

function markUnknown(...ids: CardId[]) {
  useProgressStore.setState({
    doc: progressWith({
      marks: Object.fromEntries(
        ids.map((id) => [id, { status: 'unknown' as const, at: '2026-10-30T00:00:00.000Z' }]),
      ),
    }),
  });
}

beforeEach(() => {
  resetLocalStorage();
  window.sessionStorage.clear();
  useSettingsStore.getState().resetSettings();
  useProgressStore.setState({ doc: EMPTY_PROGRESS });
});

afterEach(() => {
  vi.restoreAllMocks();
  clearSpeechStub();
});

describe('复习页', () => {
  it('should_show_empty_state_when_nothing_marked_unknown', async () => {
    window.location.hash = '#/review';
    render(<AppRouter />);

    expect(await screen.findByText('还没有标记不熟的卡片')).toBeInTheDocument();
  });

  it('should_advance_and_remove_from_queue_when_known_clicked', async () => {
    const user = userEvent.setup();
    markUnknown('animals-cat', 'animals-dog');
    window.location.hash = '#/review';
    render(<AppRouter />);

    expect(await screen.findByText('第 1 / 2 张')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '认识了' }));

    expect(await screen.findByText('第 1 / 1 张')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '认识了' }));

    expect(await screen.findByText('这些都认识啦')).toBeInTheDocument();
  });

  it('should_keep_negative_feedback_out_when_still_unknown_clicked', async () => {
    const user = userEvent.setup();
    markUnknown('animals-cat', 'animals-dog');
    window.location.hash = '#/review';
    render(<AppRouter />);

    await screen.findByText('第 1 / 2 张');
    await user.click(screen.getByRole('button', { name: '还不熟' }));

    expect(await screen.findByText('第 2 / 2 张')).toBeInTheDocument();
    expect(screen.queryByText(/答错|错误|×/)).not.toBeInTheDocument();
  });
});

describe('听音选图页', () => {
  it('should_block_start_when_speech_unavailable', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/quiz';
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: '开始游戏' }));

    expect(await screen.findByText(/发音用不了/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^选择/ })).not.toBeInTheDocument();
  });

  it('should_show_four_options_and_no_negative_words_when_wrong_clicked', async () => {
    const user = userEvent.setup();
    stubChineseVoices();
    window.location.hash = '#/quiz';
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: '开始游戏' }));

    const options = await screen.findAllByRole('button', { name: /^选择/ });
    expect(options).toHaveLength(4);

    await user.click(options[0] as HTMLElement);

    // 点对直接进下一题；点错只高亮正确项，允许再选，不出现任何指责性文案
    const right = screen.queryByRole('button', { name: /^正确答案/ });
    if (right) await user.click(right);
    expect(await screen.findByText('第 2 / 10 题')).toBeInTheDocument();
    expect(screen.queryByText(/答错|错误|×|❌/)).not.toBeInTheDocument();
  });
});

describe('收藏与首页入口', () => {
  it('should_show_empty_state_when_nothing_favorited', async () => {
    window.location.hash = '#/favorites';
    render(<AppRouter />);

    expect(await screen.findByText('还没有收藏')).toBeInTheDocument();
  });

  it('should_show_entries_stats_and_keep_category_wall_when_home_opened', async () => {
    useProgressStore.setState({
      doc: progressWith({
        marks: {
          'animals-cat': { status: 'known', at: '2026-10-30T00:00:00.000Z' },
          'animals-dog': { status: 'unknown', at: '2026-10-30T00:00:00.000Z' },
        },
      }),
    });
    window.location.hash = '#/';
    render(<AppRouter />);

    expect(await screen.findByRole('link', { name: '我的收藏' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '练一练不熟的（1）' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '听音选图' })).toBeInTheDocument();
    expect(screen.getByText('已标记 2 张 · 其中 1 张还不熟')).toBeInTheDocument();
    // 分类墙仍是主体，没被新增块挤掉
    expect(screen.getByRole('heading', { name: /动物/ })).toBeInTheDocument();
  });
});
