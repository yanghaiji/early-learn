/** 段页（v0.12）：/group/:groupId 把段内分类墙整页铺开，退役段 id 给空态 */

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppRouter } from '../../../app/router';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { resetLocalStorage } from '../../../test/memoryStorage';

beforeEach(() => {
  resetLocalStorage();
  window.sessionStorage.clear();
  useSettingsStore.getState().resetSettings();
});

describe('段页分类墙（US-Q2）', () => {
  it('should_list_the_five_plant_categories_in_group_order_when_plants_opened', async () => {
    window.location.hash = '#/group/plants';
    const { container } = render(<AppRouter />);

    await screen.findByRole('heading', { name: '动物与植物' });
    expect(screen.getByText('5 个分类 · 71 张卡片')).toBeInTheDocument();
    const tiles = container.querySelectorAll('.cat-tile__name');
    expect([...tiles].map((node) => node.textContent)).toEqual([
      '动物',
      '小虫子',
      '海洋动物',
      '水果',
      '蔬菜',
    ]);
    // tile 链到既有的分类页，不带多余查询串
    expect(container.querySelectorAll('.cat-tile')[0]?.getAttribute('href')).toBe('#/c/animals');
  });

  it('should_show_poem_group_with_idioms_before_poems', async () => {
    window.location.hash = '#/group/poem';
    const { container } = render(<AppRouter />);

    await screen.findByRole('heading', { name: '诗文' });
    expect(screen.getByText('2 个分类 · 200 张卡片')).toBeInTheDocument();
    expect(container.querySelectorAll('.cat-tile')).toHaveLength(2);
    expect(container.querySelectorAll('.cat-tile')[0]?.getAttribute('href')).toBe('#/c/idioms');
  });

  it('should_render_single_story_tile_when_story_group_opened', async () => {
    window.location.hash = '#/group/story';
    render(<AppRouter />);

    await screen.findByRole('heading', { name: '绘本' });
    expect(screen.getByText('1 个分类 · 50 张卡片')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '故事 50 张卡片' })).toBeInTheDocument();
  });

  it('should_show_empty_hint_when_fallback_group_has_no_custom_category', async () => {
    window.location.hash = '#/group/more';
    render(<AppRouter />);

    // 内置 22 类全落七个主题段，兜底段没有自建分类时为可见空态而非死链
    await screen.findByRole('heading', { name: '更多' });
    expect(screen.getByText('这一段还没有内容')).toBeInTheDocument();
  });
});

describe('段页对旧链接的兜底（US-Q4）', () => {
  it('should_show_not_found_copy_when_retired_object_group_linked', async () => {
    window.location.hash = '#/group/object';
    render(<AppRouter />);

    // v0.10 的认物大段 id 退役后，收藏夹里的旧链不得白屏
    expect(await screen.findByText('没有这个分类段')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回首页' })).toBeInTheDocument();
  });

  it('should_show_not_found_copy_when_group_id_unknown', async () => {
    window.location.hash = '#/group/nope';
    render(<AppRouter />);

    expect(await screen.findByText('没有这个分类段')).toBeInTheDocument();
  });
});
