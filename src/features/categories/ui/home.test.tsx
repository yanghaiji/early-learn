/** 首页信息架构（v0.10）：分龄大卡带封面、分类墙按认物 / 字卡 / 诗文 / 绘本分段 */

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

describe('首页分类墙分段（H-2）', () => {
  it('should_render_four_sections_in_object_character_poem_story_order', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    await screen.findByRole('heading', { name: /认物/ });
    const names = [...container.querySelectorAll('.cat-section__name')].map((node) => node.textContent);
    expect(names).toEqual(['认物', '字卡', '诗文', '绘本']);
  });

  it('should_put_all_17_object_categories_in_the_first_section', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    await screen.findByRole('heading', { name: /认物/ });
    const section = container.querySelectorAll('.cat-section')[0];
    expect(section?.querySelectorAll('.cat-tile')).toHaveLength(17);
    // 分类墙整体仍是 22 张：分段不吞分类
    expect(container.querySelectorAll('.cat-tile')).toHaveLength(22);
  });

  it('should_group_characters_and_numbers_into_character_section', async () => {
    window.location.hash = '#/';
    render(<AppRouter />);

    const heading = await screen.findByRole('heading', { name: /字卡/ });
    const section = heading.closest('.cat-section') as HTMLElement;
    expect(within(section).getByRole('heading', { name: '汉字' })).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: '数字' })).toBeInTheDocument();
    expect(within(section).queryByRole('heading', { name: '动物' })).toBeNull();
  });

  it('should_lay_out_character_poem_story_sections_as_a_three_column_rail', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    await screen.findByRole('heading', { name: /认物/ });
    const rail = container.querySelector('.cat-row');
    expect(rail).not.toBeNull();
    // 字卡 / 诗文 / 绘本 三列并排，共 5 张横卡；认物 17 张继续走整行分类墙
    expect(rail?.querySelectorAll('.cat-section')).toHaveLength(3);
    expect(rail?.querySelectorAll('.cat-tile--row')).toHaveLength(5);
    expect(container.querySelectorAll('.cat-tile--row')).toHaveLength(5);
    expect(container.querySelector('.cat-section .grid-cats')).not.toBeNull();
  });
});

describe('首页分龄大卡（H-1）', () => {
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
