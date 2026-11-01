/** 首页信息架构（v0.13）：年龄双大卡作主纲（图上文下）+ 日常玩法区收口既有路由，段卡网格全部下沉年龄页 */

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

describe('首页年龄双大卡（v0.13 H-1）', () => {
  it('should_render_two_band_hero_cards_linking_to_age_pages_when_home_opened', async () => {
    window.location.hash = '#/';
    render(<AppRouter />);

    const group = await screen.findByRole('group', { name: '按年龄浏览' });
    const links = within(group).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['#/age/1-3', '#/age/3-6']);
    expect(within(group).getByText(/1–3 岁 · 启蒙/)).toBeInTheDocument();
    expect(within(group).getByText(/3–6 岁 · 进阶/)).toBeInTheDocument();
  });

  it('should_show_adult_count_and_section_count_on_each_hero_when_home_opened', async () => {
    window.location.hash = '#/';
    render(<AppRouter />);

    const group = await screen.findByRole('group', { name: '按年龄浏览' });
    // 种子真值：启蒙 576 · 7 段 / 进阶 609 · 7 段（段数按该档非空段动态计）
    expect(within(group).getByText('576 张适龄 · 7 段')).toBeInTheDocument();
    expect(within(group).getByText('609 张适龄 · 7 段')).toBeInTheDocument();
  });

  it('should_reuse_existing_band_covers_on_hero_media_when_home_opened', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    const group = await screen.findByRole('group', { name: '按年龄浏览' });
    const covers = [...group.querySelectorAll('img')].map((node) => node.getAttribute('src'));
    expect(covers).toEqual(['assets/images/covers/fruit.webp', 'assets/images/covers/poems.webp']);
    expect(container.querySelectorAll('.band-hero__card')).toHaveLength(2);
  });

  it('should_nest_hero_body_inside_media_when_home_opened', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    await screen.findByRole('group', { name: '按年龄浏览' });
    // v0.14 S-1：文字压图——body 必须叠在 media 内（遮罩白字挂在图下缘）
    const bodies = container.querySelectorAll('.band-hero__body');
    expect(bodies).toHaveLength(2);
    bodies.forEach((body) => {
      expect(body.closest('.band-hero__media')).not.toBeNull();
    });
  });
});

describe('首页日常玩法区（v0.13 H-2）', () => {
  it('should_render_three_play_cards_linking_to_existing_routes_when_home_opened', async () => {
    window.location.hash = '#/';
    render(<AppRouter />);

    const region = await screen.findByRole('group', { name: '日常玩法' });
    const hrefs = within(region).getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['#/group/story', '#/quiz', '#/review']);
    expect(within(region).getByText('绘本故事')).toBeInTheDocument();
    expect(within(region).getByText('听音选图')).toBeInTheDocument();
    expect(within(region).getByText('练一练不熟的')).toBeInTheDocument();
  });

  it('should_use_story_cover_for_picture_book_card_when_play_row_rendered', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    await screen.findByRole('group', { name: '日常玩法' });
    const storyImg = container.querySelector('.play-card--story img');
    expect(storyImg).toHaveAttribute('src', 'assets/images/covers/stories.webp');
  });
});

describe('首页退役段卡网格（v0.13）', () => {
  it('should_drop_group_cards_and_tile_wall_from_home_when_redesigned', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    await screen.findByRole('group', { name: '按年龄浏览' });
    expect(container.querySelector('.grid-groups')).toBeNull();
    expect(container.querySelectorAll('.group-card')).toHaveLength(0);
    expect(container.querySelectorAll('.cat-tile')).toHaveLength(0);
  });

  it('should_render_band_hero_before_play_row_when_home_opened', async () => {
    window.location.hash = '#/';
    const { container } = render(<AppRouter />);

    await screen.findByRole('group', { name: '按年龄浏览' });
    const hero = container.querySelector('.band-hero');
    const play = container.querySelector('.play-row');
    expect(hero).not.toBeNull();
    expect(play).not.toBeNull();
    expect(
      hero && play && hero.compareDocumentPosition(play) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
