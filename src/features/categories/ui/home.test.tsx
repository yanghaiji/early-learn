/** 首页信息架构（v0.12）：分龄大卡不动，分类墙收成 7 张段卡，点段卡进 /group/:groupId 二级页 */

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AppRouter } from '../../../app/router';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { resetLocalStorage } from '../../../test/memoryStorage';

beforeEach(() => {
  resetLocalStorage();
  window.sessionStorage.clear();
  useSettingsStore.getState().resetSettings();
});

describe('首页段卡网格（H-2）', () => {
  it('should_render_seven_group_cards_in_theme_order_linking_to_group_pages', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    await screen.findByRole('link', { name: /动物与植物/ });
    const names = [...container.querySelectorAll('.group-card__name')].map(
      (node) => node.textContent,
    );
    expect(names).toEqual([
      '动物与植物',
      '身边的物什',
      '人物与动作',
      '自然与概念',
      '字卡',
      '诗文',
      '绘本',
    ]);
    const hrefs = [...container.querySelectorAll('.group-card')].map((node) =>
      node.getAttribute('href'),
    );
    expect(hrefs).toEqual([
      '#/group/plants',
      '#/group/things',
      '#/group/people',
      '#/group/nature',
      '#/group/character',
      '#/group/poem',
      '#/group/story',
    ]);
  });

  it('should_sum_group_card_counts_to_the_full_seed_library', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    await screen.findByRole('link', { name: /动物与植物/ });
    const counts = [...container.querySelectorAll('.group-card__count')].map((node) =>
      Number(node.textContent?.match(/\d+/)?.[0] ?? 0),
    );
    expect(counts).toEqual([71, 65, 46, 28, 349, 200, 50]);
    // 段卡不吞卡：七段合计仍是内置全量 809
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(809);
  });

  it('should_use_first_category_cover_of_each_section_for_the_group_card', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    await screen.findByRole('link', { name: /动物与植物/ });
    const covers = [...container.querySelectorAll('.group-card__media img')].map((node) =>
      node.getAttribute('src'),
    );
    // 封面复用段内首分类现有 webp，零新图；诗文段以成语打头
    expect(covers).toEqual([
      'assets/images/covers/animals.webp',
      'assets/images/covers/vehicles.webp',
      'assets/images/covers/body.webp',
      'assets/images/covers/weather.webp',
      'assets/images/covers/characters.webp',
      'assets/images/covers/idioms.webp',
      'assets/images/covers/stories.webp',
    ]);
  });

  it('should_drop_the_retired_tile_wall_and_horizontal_rail_from_home', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    await screen.findByRole('link', { name: /动物与植物/ });
    // 分类墙整体搬到二级页，v0.10 的横卡轨与分段标题全部退役
    expect(container.querySelectorAll('.cat-tile')).toHaveLength(0);
    expect(container.querySelector('.cat-row')).toBeNull();
    expect(container.querySelector('.cat-section')).toBeNull();
  });

  it('should_preview_first_category_names_on_each_group_card', async () => {
    window.location.hash = '#/';
    render(<AppRouter />);

    const card = await screen.findByRole('link', { name: /动物与植物/ });
    // 前三个分类名 + 其余折成 +N，家长不点进二级页也能扫一眼内容
    expect(within(card).getByText('动物 · 小虫子 · 海洋动物 +2').textContent).toBeTruthy();
  });
});

describe('首页分龄大卡（H-1，改版回归）', () => {
  it('should_show_a_cover_image_on_each_band_card', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    const group = await screen.findByRole('group', { name: '按年龄浏览' });
    const covers = [...group.querySelectorAll('img')].map((node) => node.getAttribute('src'));
    expect(covers).toEqual(['assets/images/covers/fruit.webp', 'assets/images/covers/poems.webp']);
    expect(container.querySelectorAll('.band-card__body')).toHaveLength(2);
  });

  it('should_keep_band_links_and_counts_unchanged_after_redesign', async () => {
    window.location.hash = '#/';
    render(<AppRouter />);

    const group = await screen.findByRole('group', { name: '按年龄浏览' });
    const links = within(group).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['#/age/1-3', '#/age/3-6']);
    expect(within(group).getAllByText(/张适龄/)).toHaveLength(2);
  });
});
