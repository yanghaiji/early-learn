/**
 * 故事绘本测试（FR/v0.2 US-S1~US-S6）：
 * 分类墙、详情入口、一页读完的故事页（无翻页）、旧链接兼容与返回。
 */

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

describe('故事分类页', () => {
  it('should_list_50_stories_with_group_chips', async () => {
    window.location.hash = '#/c/stories';
    render(<AppRouter />);

    expect(await screen.findByRole('heading', { name: '故事' })).toBeInTheDocument();
    expect(screen.getByText(/50 张卡片/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '按主题组筛选' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /童话故事/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /自然认知/ })).toBeInTheDocument();
  });

  it('should_mark_story_tiles_with_story_badge', async () => {
    window.location.hash = '#/c/stories';
    render(<AppRouter />);

    await screen.findByRole('heading', { name: '故事' });
    // 每页 12 张，每张都只标「绘本故事」，不再标页数（ADR-S7）
    expect(screen.getAllByText('绘本故事')).toHaveLength(12);
    expect(screen.queryByText(/绘本 · \d+ 页/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '三只小猪 Three Little Pigs' })).toBeInTheDocument();
  });

  it('should_filter_by_story_group_when_chip_clicked', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/c/stories';
    render(<AppRouter />);

    await screen.findByRole('heading', { name: '故事' });
    await user.click(screen.getByRole('button', { name: /生活习惯/ }));

    // 15 个生活习惯故事 → 2 页
    expect(await screen.findByText(/第 1 \/ 2 页/)).toBeInTheDocument();
    expect(window.location.hash).toContain('group=story-habit');
  });
});

describe('故事详情', () => {
  it('should_show_moral_and_start_button', async () => {
    window.location.hash = '#/card/stories-three-pigs';
    render(<AppRouter />);

    expect(await screen.findByRole('heading', { name: '三只小猪' })).toBeInTheDocument();
    expect(screen.getByText('做事要认真，结实的房子才挡得住大风。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始阅读' })).toBeInTheDocument();
  });

  it('should_open_story_page_without_page_param', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/card/stories-three-pigs';
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: '开始阅读' }));

    expect(await screen.findByText('6 段 · 一页读完')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '三只小猪' })).toBeInTheDocument();
    // 跳转不再带 page 参数：一个故事就是一个页面
    expect(window.location.hash).toContain('/story/stories-three-pigs');
    expect(window.location.hash).not.toContain('page=');
  });
});

describe('故事页（一页读完）', () => {
  it('should_render_all_paragraphs_on_one_page', async () => {
    window.location.hash = '#/story/stories-three-pigs';
    render(<AppRouter />);

    expect(await screen.findByText('6 段 · 一页读完')).toBeInTheDocument();
    // 首尾段同屏出现，证明没有翻页裁剪
    expect(screen.getByText('猪妈妈对三只小猪说：你们长大了，去盖自己的房子吧。')).toBeInTheDocument();
    expect(screen.getByText('三只小猪躲在砖房里，狼只好灰溜溜地走了。')).toBeInTheDocument();
    expect(document.querySelectorAll('.story__para')).toHaveLength(6);
  });

  it('should_have_no_paging_controls', async () => {
    window.location.hash = '#/story/stories-three-pigs';
    render(<AppRouter />);

    await screen.findByText('6 段 · 一页读完');
    expect(screen.queryByRole('button', { name: '上一页' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '下一页' })).not.toBeInTheDocument();
    expect(screen.queryByText(/第 \d+ \/ \d+ 页/)).not.toBeInTheDocument();
  });

  it('should_show_single_composite_image', async () => {
    window.location.hash = '#/story/stories-three-pigs';
    render(<AppRouter />);

    await screen.findByText('6 段 · 一页读完');
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', expect.stringContaining('/stories/three-pigs/cover.webp'));
  });

  it('should_show_moral_and_read_all_action', async () => {
    window.location.hash = '#/story/stories-three-pigs';
    render(<AppRouter />);

    await screen.findByText('6 段 · 一页读完');
    expect(screen.getByText('做事要认真，结实的房子才挡得住大风。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '读整篇' })).toBeInTheDocument();
  });

  it('should_ignore_legacy_page_param', async () => {
    window.location.hash = '#/story/stories-three-pigs?page=3';
    render(<AppRouter />);

    // 旧的 ?page=n 链接照旧能打开，但一律展示整篇
    expect(await screen.findByText('6 段 · 一页读完')).toBeInTheDocument();
    expect(document.querySelectorAll('.story__para')).toHaveLength(6);
  });

  it('should_return_to_story_detail_when_back_clicked', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/story/stories-three-pigs';
    render(<AppRouter />);

    await screen.findByText('6 段 · 一页读完');
    // 顶栏图标与底部按钮都是「返回故事详情」
    expect(screen.getAllByRole('button', { name: '返回故事详情' })).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: '返回故事详情' })[0] as HTMLElement);

    expect(await screen.findByRole('heading', { name: '三只小猪' })).toBeInTheDocument();
    expect(window.location.hash).toContain('/card/stories-three-pigs');
    expect(screen.getByRole('button', { name: '开始阅读' })).toBeInTheDocument();
  });

  it('should_return_to_story_detail_on_escape', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/story/stories-three-pigs';
    render(<AppRouter />);

    await screen.findByText('6 段 · 一页读完');
    await user.keyboard('{Escape}');

    expect(await screen.findByRole('heading', { name: '三只小猪' })).toBeInTheDocument();
    expect(window.location.hash).toContain('/card/stories-three-pigs');
  });

  it('should_show_empty_state_when_story_missing', async () => {
    window.location.hash = '#/story/not-exist';
    render(<AppRouter />);

    expect(await screen.findByText('故事不存在')).toBeInTheDocument();
  });
});
