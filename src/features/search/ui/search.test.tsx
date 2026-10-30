/** 全局搜索（v0.7 PRD US-V1~V3）：取词、四类输入、空态、分页、返回链路 */

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

describe('全局搜索（v0.7）', () => {
  it('should_show_samples_when_keyword_empty', async () => {
    window.location.hash = '#/search';
    render(<AppRouter />);

    expect(await screen.findByText(/想找哪张卡/)).toBeInTheDocument();
    for (const sample of ['苹果', 'apple', 'pingguo']) {
      expect(screen.getByRole('button', { name: sample }), sample).toBeInTheDocument();
    }
  });

  it('should_match_chinese_english_and_toneless_pinyin_when_keyword_given', async () => {
    for (const keyword of ['苹果', 'apple', 'pingguo']) {
      window.location.hash = `#/search?q=${encodeURIComponent(keyword)}`;
      const { unmount } = render(<AppRouter />);

      expect(await screen.findByRole('link', { name: '苹果 apple' }), keyword).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`关键词「${keyword}」`)), keyword).toBeInTheDocument();
      unmount();
    }
  });

  it('should_show_empty_state_when_no_card_matches', async () => {
    window.location.hash = '#/search?q=zzzz';
    render(<AppRouter />);

    expect(await screen.findByText('没有找到「zzzz」')).toBeInTheDocument();
  });

  it('should_offer_category_entries_when_nothing_matches', async () => {
    window.location.hash = '#/search?q=zzzz';
    render(<AppRouter />);

    // 0 条时不能只丢一句「没找到」：分类入口是唯一能走的路
    expect(await screen.findByText('换个思路：按主题翻一翻')).toBeInTheDocument();
    // 「海洋动物」也含「动物」，锚定开头只测分类入口本身
    expect(screen.getByRole('link', { name: /^动物/ })).toBeInTheDocument();
  });

  it('should_paginate_when_hits_more_than_12', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/search?q=a';
    const { container } = render(<AppRouter />);

    expect(await screen.findByText(/第 1 \/ \d+ 页/)).toBeInTheDocument();
    expect(container.querySelectorAll('.card-tile')).toHaveLength(12);

    await user.click(screen.getByRole('button', { name: /下一页/ }));
    expect(await screen.findByText(/第 2 \/ \d+ 页/)).toBeInTheDocument();
  });

  it('should_return_to_same_search_when_back_from_detail', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/search?q=苹果';
    render(<AppRouter />);

    await user.click(await screen.findByRole('link', { name: '苹果 apple' }));
    await screen.findByRole('heading', { name: '苹果' });

    await user.click(screen.getByRole('button', { name: '返回卡片列表' }));
    expect(decodeURIComponent(window.location.hash)).toContain('q=苹果');
  });

  it('should_label_category_on_each_result', async () => {
    window.location.hash = '#/search?q=苹果';
    const { container } = render(<AppRouter />);

    await screen.findByRole('link', { name: '苹果 apple' });
    expect(container.querySelector('.card-tile__cat')?.textContent).toBe('水果');
  });
});
