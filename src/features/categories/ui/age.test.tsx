/** 分龄浏览（v0.8 PRD §3）：首页入口、分龄墙、分类筛龄、详情跟随与返回链路 */

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRouter } from '../../../app/router';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { resetLocalStorage } from '../../../test/memoryStorage';

beforeEach(() => {
  resetLocalStorage();
  window.sessionStorage.clear();
  useSettingsStore.getState().resetSettings();
});

describe('首页分龄入口（US-W1）', () => {
  it('should_show_two_band_cards_above_category_wall_when_home_opened', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    const group = await screen.findByRole('group', { name: '按年龄浏览' });
    expect(within(group).getAllByRole('link')).toHaveLength(2);
    expect(within(group).getByText(/1–3 岁 · 启蒙/)).toBeInTheDocument();
    expect(within(group).getByText(/3–6 岁 · 进阶/)).toBeInTheDocument();
    expect(within(group).getAllByText(/张适龄/)).toHaveLength(2);

    // 分龄入口必须排在段卡网格之前（v0.12：分类墙已搬到二级页，首页网格变成段卡）
    const bandRow = container.querySelector('.band-row');
    const grid = container.querySelector('.grid-groups');
    expect(bandRow).not.toBeNull();
    expect(grid).not.toBeNull();
    expect(
      bandRow && grid && bandRow.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('should_keep_band_count_equal_to_wall_sum_when_opened', async () => {
    window.location.hash = '#/age/1-3';
    render(<AppRouter />);

    // 分龄墙逐分类的适龄张数之和 == 顶栏总数（不出现空分类拖低计数）
    const heading = await screen.findByRole('heading', { name: '1–3 岁 · 启蒙' });
    expect(heading).toBeInTheDocument();
    const subtitle = screen.getByText(/张适龄卡片$/);
    const total = Number(subtitle.textContent?.replace(/\D/g, ''));
    const counts = screen
      .getAllByText(/张适龄$/)
      .map((node) => Number(node.textContent?.replace(/\D/g, '')));
    expect(counts.length).toBeGreaterThan(0);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(total);
  });
});

describe('分龄浏览区（US-W2）', () => {
  it('should_list_only_non_empty_categories_when_band_page_opened', async () => {
    window.location.hash = '#/age/1-3';
    render(<AppRouter />);

    await screen.findByRole('heading', { name: '1–3 岁 · 启蒙' });
    // 蔬菜在 1–3 岁有 6 张，必须出现；15 个实物分类不应有 0 张的卡片块
    expect(screen.queryByText('0 张适龄')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '蔬菜 6 张适龄卡片' })).toBeInTheDocument();
  });

  it('should_carry_band_query_when_category_tile_clicked', async () => {
    window.location.hash = '#/age/1-3';
    render(<AppRouter />);

    const tile = await screen.findByRole('link', { name: '蔬菜 6 张适龄卡片' });
    expect(tile).toHaveAttribute('href', '#/c/vegetables?band=1-3');
  });

  it('should_show_empty_state_when_band_unknown', async () => {
    window.location.hash = '#/age/2-4';
    render(<AppRouter />);

    expect(await screen.findByText('没有这一档年龄')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回首页' })).toBeInTheDocument();
  });
});

describe('分类页按龄筛选（US-W3）', () => {
  it('should_show_band_subset_when_band_query_present', async () => {
    window.location.hash = '#/c/vegetables?band=1-3';
    const { container } = render(<AppRouter />);

    await screen.findByRole('heading', { name: '蔬菜' });
    expect(screen.getByText(/1–3 岁 · 6 \/ 13 张/)).toBeInTheDocument();
    expect(container.querySelectorAll('.card-tile')).toHaveLength(6);
  });

  it('should_restore_all_cards_when_see_all_clicked', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/c/vegetables?band=1-3';
    const { container } = render(<AppRouter />);

    await screen.findByRole('heading', { name: '蔬菜' });
    await user.click(screen.getByRole('button', { name: /看全部/ }));

    expect(await screen.findByText(/13 张卡片/)).toBeInTheDocument();
    expect(window.location.hash).not.toContain('band=');
    expect(container.querySelectorAll('.card-tile')).toHaveLength(12);
  });

  it('should_ignore_unknown_band_when_query_malformed', async () => {
    window.location.hash = '#/c/vegetables?band=9-9';
    render(<AppRouter />);

    await screen.findByRole('heading', { name: '蔬菜' });
    expect(screen.getByText(/13 张卡片/)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '按年龄筛选' })).not.toBeInTheDocument();
  });

  it('should_keep_band_when_pager_clicked', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/c/idioms?band=1-3';
    render(<AppRouter />);

    await screen.findByRole('heading', { name: '成语' });
    await user.click(screen.getByRole('button', { name: /下一页/ }));

    expect(window.location.hash).toContain('band=1-3');
    expect(window.location.hash).toContain('page=2');
  });
});

describe('详情页跟随龄段（US-W4）', () => {
  it('should_limit_sequence_to_band_when_band_query_present', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/c/colors?band=3-6';
    const { container } = render(<AppRouter />);

    await screen.findByRole('heading', { name: '颜色' });
    expect(screen.getByText(/3–6 岁 · 2 \/ 8 张/)).toBeInTheDocument();
    await user.click(container.querySelectorAll('.card-tile')[0] as HTMLElement);

    // 颜色 3–6 岁只有 2 张：进详情后序列长度必须是 2，不能串到难度 1 的卡
    expect(await screen.findByLabelText('第 1 张，共 2 张')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一张' })).toBeDisabled();
  });

  it('should_keep_band_query_when_stepping_to_next_card', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/c/colors?band=3-6';
    const { container } = render(<AppRouter />);

    await screen.findByRole('heading', { name: '颜色' });
    await user.click(container.querySelectorAll('.card-tile')[0] as HTMLElement);
    await screen.findByLabelText('第 1 张，共 2 张');

    await user.click(screen.getByRole('button', { name: '下一张' }));

    expect(await screen.findByLabelText('第 2 张，共 2 张')).toBeInTheDocument();
    expect(window.location.hash).toContain('band=3-6');
    // 末张即停：不会越界到只剩「3–6 岁」之外的卡
    expect(screen.getByRole('button', { name: '下一张' })).toBeDisabled();
  });

  it('should_return_to_band_list_when_back_clicked', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/c/colors?band=3-6';
    const { container } = render(<AppRouter />);

    await screen.findByRole('heading', { name: '颜色' });
    await user.click(container.querySelectorAll('.card-tile')[0] as HTMLElement);
    await screen.findByLabelText('第 1 张，共 2 张');
    await user.click(screen.getByRole('button', { name: '返回卡片列表' }));

    expect(window.location.hash).toContain('/c/colors');
    expect(window.location.hash).toContain('band=3-6');
  });

  it('should_keep_band_query_across_story_page_when_opened', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/c/stories?band=3-6';
    const { container } = render(<AppRouter />);

    await screen.findByRole('heading', { name: '故事' });
    // 故事 50 张，其中 3–6 岁（难度 2 / 3）35 张
    expect(screen.getByText(/3–6 岁 · 35 \/ 50 张/)).toBeInTheDocument();
    await user.click(container.querySelectorAll('.card-tile')[0] as HTMLElement);
    expect(await screen.findByLabelText('第 1 张，共 35 张')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '开始阅读' }));
    await screen.findByText(/段 · 一页读完/);
    // 去故事页也不能把龄段丢掉，否则回来序列会退回整个分类
    expect(window.location.hash).toContain('band=3-6');

    await user.click(screen.getAllByRole('button', { name: '返回故事详情' })[0] as HTMLElement);
    expect(await screen.findByLabelText('第 1 张，共 35 张')).toBeInTheDocument();
    expect(window.location.hash).toContain('band=3-6');
    expect(screen.getByRole('button', { name: '上一张' })).toBeDisabled();
  }, 20_000);
});
