/** 应用装配冒烟测试：种子渲染、路由跳转、404 兜底 */

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppRouter } from './router';
import { resetLocalStorage } from '../test/memoryStorage';

beforeEach(() => {
  resetLocalStorage();
  window.location.hash = '';
});

describe('AppRouter', () => {
  it('should_render_seed_categories_on_home', async () => {
    render(<AppRouter />);
    expect(await screen.findByRole('heading', { name: '童识 · 认知卡片' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^动物/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /汉字/ })).toBeInTheDocument();
  });

  it('should_render_card_detail_with_pinyin_when_route_matches', async () => {
    window.location.hash = '#/card/animals-cat';
    render(<AppRouter />);
    expect(await screen.findByRole('heading', { name: '猫' })).toBeInTheDocument();
    expect(screen.getByText('māo')).toBeInTheDocument();
    // 默认展示模式为中文，英文不显示
    expect(screen.queryByText('cat')).toBeNull();
    expect(screen.getAllByText('1 / 19').length).toBeGreaterThan(0);
  });

  it('should_render_not_found_when_route_unknown', async () => {
    window.location.hash = '#/not-exist';
    render(<AppRouter />);
    expect(await screen.findByText('页面走丢了')).toBeInTheDocument();
  });

  it('should_require_parent_gate_before_admin', async () => {
    window.location.hash = '#/admin';
    render(<AppRouter />);
    expect(await screen.findByRole('group', { name: '家长验证' })).toBeInTheDocument();
  });
});
