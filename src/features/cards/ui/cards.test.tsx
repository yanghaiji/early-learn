/** 浏览链路测试（PRD US-02 / US-03 / US-05）：卡片墙、详情、上下张切换、空态 */

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRouter } from '../../../app/router';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { resetLocalStorage } from '../../../test/memoryStorage';

beforeEach(() => {
  resetLocalStorage();
  window.sessionStorage.clear();
  useSettingsStore.getState().resetSettings();
});

describe('分类页', () => {
  it('should_render_card_tiles_when_category_opened', async () => {
    window.location.hash = '#/c/animals';
    render(<AppRouter />);

    expect(await screen.findByRole('heading', { name: '动物' })).toBeInTheDocument();
    expect(screen.getByText(/22 张卡片/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '猫 cat' })).toBeInTheDocument();
  });

  it('should_show_empty_state_when_category_missing', async () => {
    window.location.hash = '#/c/not-exist';
    render(<AppRouter />);

    expect(await screen.findByText('没有找到这个分类')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回首页' })).toBeInTheDocument();
  });
});

describe('分类页 · 分组与分页（v0.1.7）', () => {
  it('should_paginate_when_category_has_more_than_12_cards', async () => {
    window.location.hash = '#/c/characters';
    render(<AppRouter />);

    expect(await screen.findByRole('heading', { name: '汉字' })).toBeInTheDocument();
    expect(screen.getByText(/第 1 \/ 21 页/)).toBeInTheDocument();
    // 241 张只挂第一页的 12 个卡片块
    expect(screen.getAllByRole('link')).toHaveLength(12);
  });

  it('should_show_group_chips_only_when_category_has_groups', async () => {
    window.location.hash = '#/c/characters';
    const { unmount } = render(<AppRouter />);

    await screen.findByRole('heading', { name: '汉字' });
    expect(screen.getByRole('group', { name: '按主题组筛选' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /身体与家人/ })).toBeInTheDocument();
    unmount();

    window.location.hash = '#/c/animals';
    render(<AppRouter />);
    await screen.findByRole('heading', { name: '动物' });
    expect(screen.queryByRole('group', { name: '按主题组筛选' })).not.toBeInTheDocument();
  });

  it('should_filter_cards_and_reset_page_when_chip_clicked', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/c/characters?page=3';
    render(<AppRouter />);

    await screen.findByRole('heading', { name: '汉字' });
    await user.click(screen.getByRole('button', { name: /自然与季节/ }));

    // 28 字 → 3 页，切组后回到第 1 页
    expect(await screen.findByText(/第 1 \/ 3 页/)).toBeInTheDocument();
    expect(window.location.hash).toContain('group=nature');
    expect(window.location.hash).not.toContain('page=3');
  });

  it('should_go_to_next_page_when_pager_clicked', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/c/animals';
    render(<AppRouter />);

    await screen.findByRole('heading', { name: '动物' });
    expect(screen.getByRole('button', { name: /上一页/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /下一页/ }));

    expect(await screen.findByText(/第 2 \/ 2 页/)).toBeInTheDocument();
    expect(window.location.hash).toContain('page=2');
    expect(screen.getByRole('button', { name: /下一页/ })).toBeDisabled();
  });

  it('should_return_to_same_page_when_back_from_detail', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/c/characters?group=nature&page=2';
    render(<AppRouter />);

    await screen.findByRole('heading', { name: '汉字' });
    expect(screen.getByText(/第 2 \/ 3 页/)).toBeInTheDocument();
    await user.click(screen.getAllByRole('link')[0] as HTMLElement);

    await user.click(await screen.findByRole('button', { name: '返回卡片列表' }));
    expect(window.location.hash).toContain('group=nature');
    expect(window.location.hash).toContain('page=2');
  });
});

describe('卡片详情', () => {
  it('should_step_to_next_card_when_next_clicked', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/card/animals-cat';
    render(<AppRouter />);

    expect(await screen.findByRole('heading', { name: '猫' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一张' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '下一张' }));

    expect(await screen.findByLabelText('第 2 张，共 22 张')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一张' })).toBeEnabled();
  });

  it('should_show_english_when_display_mode_is_both', async () => {
    useSettingsStore.getState().setDisplayMode('both');
    window.location.hash = '#/card/animals-cat';
    render(<AppRouter />);

    expect(await screen.findByRole('heading', { name: '猫' })).toBeInTheDocument();
    expect(screen.getByText('cat')).toBeInTheDocument();
    expect(screen.getByText('māo')).toBeInTheDocument();
  });

  it('should_show_empty_state_when_card_missing', async () => {
    window.location.hash = '#/card/not-exist';
    render(<AppRouter />);

    expect(await screen.findByText('卡片不存在')).toBeInTheDocument();
  });

  it('should_navigate_within_current_group_only', async () => {
    window.location.hash = '#/card/characters-shan?group=nature';
    render(<AppRouter />);

    // 「山」是自然与季节组的第一张，该组 28 字
    expect(await screen.findByLabelText('第 1 张，共 28 张')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一张' })).toBeDisabled();
  });
});
