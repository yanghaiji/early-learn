/** 浏览链路测试（PRD US-02 / US-03 / US-05）：卡片墙、详情、上下张切换、空态 */

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

describe('分类页', () => {
  it('should_render_card_tiles_when_category_opened', async () => {
    window.location.hash = '#/c/animals';
    render(<AppRouter />);

    expect(await screen.findByRole('heading', { name: '动物' })).toBeInTheDocument();
    expect(screen.getByText(/19 张卡片/)).toBeInTheDocument();
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
    const { container } = render(<AppRouter />);

    expect(await screen.findByRole('heading', { name: '汉字' })).toBeInTheDocument();
    expect(screen.getByText(/第 1 \/ 27 页/)).toBeInTheDocument();
    // 321 张只挂第一页的 12 个卡片块（按块数而不按链接数：页脚还有源码链接）
    expect(container.querySelectorAll('.card-tile')).toHaveLength(12);
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

    // 44 字 → 4 页，切组后回到第 1 页
    expect(await screen.findByText(/第 1 \/ 4 页/)).toBeInTheDocument();
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
    const { container } = render(<AppRouter />);

    await screen.findByRole('heading', { name: '汉字' });
    expect(screen.getByText(/第 2 \/ 4 页/)).toBeInTheDocument();
    await user.click(container.querySelectorAll('.card-tile')[0] as HTMLElement);

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

    expect(await screen.findByLabelText('第 2 张，共 19 张')).toBeInTheDocument();
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

    // 「山」是自然与季节组的第一张，该组 44 字
    expect(await screen.findByLabelText('第 1 张，共 44 张')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一张' })).toBeDisabled();
  });

  // v0.15 T-3：顶栏补当前卡名（非 heading），正文 h1 仍是唯一 heading 不破 findByRole 断言
  it('should_show_current_card_name_in_topbar_without_extra_heading_when_detail_opened', async () => {
    window.location.hash = '#/card/animals-cat';
    const { container } = render(<AppRouter />);

    // 顶栏可见当前卡名「猫」（作用域限定顶栏，避免与正文 h1 撞）
    const topbar = container.querySelector('.topbar') as HTMLElement;
    expect(within(topbar).getByText('猫')).toBeInTheDocument();
    // 顶栏内不得出现 heading（卡名用非 heading 元素），正文标题仍是全局唯一 heading
    expect(within(topbar).queryByRole('heading')).toBeNull();
    expect(screen.getAllByRole('heading', { name: '猫' })).toHaveLength(1);
  });
});

/** 笔顺演示（v0.9 US-X1 / US-X2 / T-X4）：汉字卡有「看笔顺」，其余卡片不受影响 */
describe('笔顺演示（v0.9）', () => {
  it('should_render_stroke_player_when_character_card_opened', async () => {
    window.location.hash = '#/card/characters-shou';
    render(<AppRouter />);

    expect(await screen.findByRole('button', { name: '看笔顺' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '笔顺演示' })).toBeInTheDocument();
  });

  it('should_keep_plain_char_without_player_when_card_not_character', async () => {
    window.location.hash = '#/card/animals-cat';
    render(<AppRouter />);

    expect(await screen.findByRole('heading', { name: '猫' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '看笔顺' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '笔顺演示' })).not.toBeInTheDocument();
  });

  // v0.15 T-1：汉字卡把笔顺播放器升为左栏主视觉，不再渲染近乎空白的封面图
  it('should_host_stroke_player_in_stage_without_cover_when_character_opened', async () => {
    window.location.hash = '#/card/characters-shou';
    const { container } = render(<AppRouter />);

    await screen.findByRole('region', { name: '笔顺演示' });
    const stage = container.querySelector('.detail__stage');
    // 主视觉（笔顺播放器）落在 stage 内，且 stage 不再出现封面 <img>
    expect(stage?.querySelector('[aria-label="笔顺演示"]')).not.toBeNull();
    expect(stage?.querySelector('img')).toBeNull();
  });

  // v0.15 T-1 回归护栏：普通卡仍以封面图为左栏主视觉（不受汉字卡改版影响）
  it('should_keep_cover_image_in_stage_when_object_card_opened', async () => {
    window.location.hash = '#/card/animals-cat';
    const { container } = render(<AppRouter />);

    await screen.findByRole('heading', { name: '猫' });
    const stage = container.querySelector('.detail__stage');
    expect(stage?.querySelector('.detail__media-btn img')).not.toBeNull();
  });
});

/** 成语词典（v0.6 PRD §4.1 / §4.2）：无英文、不进出题池、详情多一块释义 */
describe('成语词典（v0.6）', () => {
  it('should_list_150_idioms_in_five_theme_groups_when_category_opened', async () => {
    window.location.hash = '#/c/idioms';
    render(<AppRouter />);

    expect(await screen.findByRole('heading', { name: '成语' })).toBeInTheDocument();
    // 150 张 → 每页 12 张，共 13 页
    expect(screen.getByText(/第 1 \/ 13 页/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '按主题组筛选' })).toBeInTheDocument();
    for (const name of ['寓言故事', '学习求知', '品德修养', '自然景物', '生活常理']) {
      expect(screen.getByRole('button', { name: new RegExp(name) }), name).toBeInTheDocument();
    }
  });

  it('should_render_meaning_examples_related_and_citation_when_idiom_opened', async () => {
    window.location.hash = '#/card/idioms-shou-zhu-dai-tu';
    render(<AppRouter />);

    expect(await screen.findByRole('heading', { name: '守株待兔' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '成语释义与用法' })).toBeInTheDocument();
    expect(screen.getByText(/守着树桩等兔子撞上来/)).toBeInTheDocument();
    expect(screen.getByText('光等着天上掉馅饼，就是守株待兔。')).toBeInTheDocument();
    expect(screen.getByText('坐享其成')).toBeInTheDocument();
    expect(screen.getByText('自食其力')).toBeInTheDocument();
    expect(screen.getByText('出处 · 《韩非子·五蠹》')).toBeInTheDocument();
    // 无英文 → 不出现 English 按钮，也不出现空英文行
    expect(screen.queryByRole('button', { name: 'English' })).not.toBeInTheDocument();
  });
});
