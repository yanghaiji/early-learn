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
  it('should_show_two_band_cards_before_play_row_when_home_opened', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    const group = await screen.findByRole('group', { name: '按年龄浏览' });
    expect(within(group).getAllByRole('link')).toHaveLength(2);
    expect(within(group).getByText(/1–3 岁 · 启蒙/)).toBeInTheDocument();
    expect(within(group).getByText(/3–6 岁 · 进阶/)).toBeInTheDocument();

    // 年龄双大卡排在日常玩法区之前（v0.13：首页主纲是年龄档，段卡已下沉年龄页）
    const hero = container.querySelector('.band-hero');
    const play = container.querySelector('.play-row');
    expect(hero).not.toBeNull();
    expect(play).not.toBeNull();
    expect(
      hero && play && hero.compareDocumentPosition(play) & Node.DOCUMENT_POSITION_FOLLOWING,
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

describe('分龄墙按段分组（v0.13 US-R2）', () => {
  it('should_split_band_wall_into_seven_theme_groups_when_band_page_opened', async () => {
    window.location.hash = '#/age/1-3';
    const { container } = render(<AppRouter />);

    await screen.findByRole('heading', { name: '1–3 岁 · 启蒙' });
    // 种子 22 个分类恰好分属七个段，两档都非空 → 七个分组
    expect(container.querySelectorAll('.band-group')).toHaveLength(7);
  });

  it('should_link_group_header_to_full_section_page_when_grouped', async () => {
    window.location.hash = '#/age/1-3';
    render(<AppRouter />);

    await screen.findByRole('heading', { name: '1–3 岁 · 启蒙' });
    // 段头是链到段页的 Link（蔬菜属「动物与植物」段）
    const plantsHead = screen.getByRole('link', { name: /动物与植物/ });
    expect(plantsHead).toHaveAttribute('href', '#/group/plants');
    expect(screen.getByRole('link', { name: /字卡/ })).toHaveAttribute('href', '#/group/character');
  });

  it('should_keep_group_tile_sum_equal_to_band_total_when_grouped', async () => {
    window.location.hash = '#/age/3-6';
    render(<AppRouter />);

    await screen.findByRole('heading', { name: '3–6 岁 · 进阶' });
    const total = Number(screen.getByText(/张适龄卡片$/).textContent?.replace(/\D/g, ''));
    // 分组后各分类 tile 角标（「N 张适龄」）之和仍 == 顶栏总数（段头文案不带「张适龄」）
    const tileSum = screen
      .getAllByText(/张适龄$/)
      .map((node) => Number(node.textContent?.replace(/\D/g, '')))
      .reduce((sum, count) => sum + count, 0);
    expect(total).toBe(609);
    expect(tileSum).toBe(total);
  });

  it('should_carry_band_query_on_tiles_but_not_group_header_when_grouped', async () => {
    window.location.hash = '#/age/1-3';
    render(<AppRouter />);

    await screen.findByRole('heading', { name: '1–3 岁 · 启蒙' });
    // 分类 tile 仍带 band 透传，段头链到不带 band 的全量段页
    expect(screen.getByRole('link', { name: '蔬菜 6 张适龄卡片' })).toHaveAttribute(
      'href',
      '#/c/vegetables?band=1-3',
    );
    expect(screen.getByRole('link', { name: /动物与植物/ })).toHaveAttribute(
      'href',
      '#/group/plants',
    );
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

describe('年龄页档位 chips 与段头 CTA（v0.14 US-S3 / US-S4）', () => {
  it('should_mark_current_band_chip_active_when_band_page_opened', async () => {
    window.location.hash = '#/age/1-3';
    render(<AppRouter />);

    await screen.findByRole('heading', { name: '1–3 岁 · 启蒙' });
    // chips 作用域隔离：顶栏新增两枚 Link，不与段头 / tile 链接串断言（S-3）
    const chipGroup = screen.getByRole('group', { name: '切换年龄档' });
    const chips = within(chipGroup).getAllByRole('link');
    expect(chips.map((chip) => chip.getAttribute('href'))).toEqual(['#/age/1-3', '#/age/3-6']);
    expect(chips[0]).toHaveClass('is-active');
    expect(chips[1]).not.toHaveClass('is-active');
    expect(within(chipGroup).getByText('3–6 岁')).toBeInTheDocument();
  });

  it('should_render_see_all_cta_as_span_inside_group_head_when_grouped', async () => {
    window.location.hash = '#/age/1-3';
    render(<AppRouter />);

    await screen.findByRole('heading', { name: '1–3 岁 · 启蒙' });
    // 段头整行仍是单个 Link：「看全部」是挂在链接内的 span，不产生嵌套链接（S-4）
    const plantsHead = screen.getByRole('link', { name: /动物与植物/ });
    const cta = plantsHead.querySelector('.band-group__cta');
    expect(cta).not.toBeNull();
    expect(cta?.textContent).toContain('看全部');
    expect(plantsHead.querySelectorAll('a')).toHaveLength(0);
  });
});
