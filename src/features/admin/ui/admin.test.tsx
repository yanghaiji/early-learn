/** 管理区主流程测试（PRD US-07~US-10）：分类 CRUD、卡片检索、数据维护、只读降级 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRouter } from '../../../app/router';
import { resetLocalStorage } from '../../../test/memoryStorage';
import { clearGatePassed, markGatePassed } from '../gateSession';

const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

/** 模拟浏览器禁用本地存储：setItem 抛错让 safeLocalStorage 探测失败 */
function breakLocalStorage(): void {
  const denied = (): never => {
    throw new Error('storage denied');
  };
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: { getItem: denied, setItem: denied, removeItem: denied, clear: denied, key: () => null, length: 0 },
  });
}

beforeEach(() => {
  resetLocalStorage();
  clearGatePassed();
  window.location.hash = '#/admin';
});

afterEach(() => {
  if (originalLocalStorage) Object.defineProperty(window, 'localStorage', originalLocalStorage);
});

describe('管理区', () => {
  it('should_block_admin_when_gate_not_passed', async () => {
    render(<AppRouter />);
    expect(await screen.findByRole('group', { name: '家长验证' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /分类（/ })).toBeNull();
  });

  it('should_create_category_when_name_submitted', async () => {
    const user = userEvent.setup();
    markGatePassed();
    render(<AppRouter />);

    expect(await screen.findByRole('heading', { name: /分类（17）/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /新建分类/ }));
    const dialog = await screen.findByRole('dialog', { name: '新建分类' });
    await user.type(within(dialog).getByLabelText('分类名称'), '恐龙');
    await user.click(within(dialog).getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('heading', { name: /分类（18）/ })).toBeInTheDocument();
    expect(screen.getByText('恐龙')).toBeInTheDocument();
  });

  it('should_reject_duplicated_category_name_when_submitted', async () => {
    const user = userEvent.setup();
    markGatePassed();
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: /新建分类/ }));
    const dialog = await screen.findByRole('dialog', { name: '新建分类' });
    await user.type(within(dialog).getByLabelText('分类名称'), '动物');
    await user.click(within(dialog).getByRole('button', { name: '保存' }));

    expect(await screen.findByText('分类名已存在')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '新建分类' })).toBeInTheDocument();
  });

  it('should_warn_cascade_delete_when_deleting_category_with_cards', async () => {
    const user = userEvent.setup();
    markGatePassed();
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: '删除 动物' }));

    const dialog = await screen.findByRole('dialog', { name: '删除分类「动物」' });
    expect(within(dialog).getByText(/22 张卡片也会一并删除/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: '取消' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('should_filter_cards_when_keyword_typed', async () => {
    const user = userEvent.setup();
    markGatePassed();
    window.location.hash = '#/admin/cards';
    render(<AppRouter />);

    const search = await screen.findByRole('searchbox', { name: '搜索卡片' });
    await user.type(search, '猫');

    expect(await screen.findByText('māo · cat · 动物')).toBeInTheDocument();
    expect(screen.getByText(/共 \d+ 张符合条件/)).toBeInTheDocument();
  });

  it('should_ask_confirm_before_restoring_seed_content', async () => {
    const user = userEvent.setup();
    markGatePassed();
    window.location.hash = '#/admin/data';
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: /恢复内置内容/ }));

    const dialog = await screen.findByRole('dialog', { name: '恢复内置内容' });
    expect(within(dialog).getByText(/17 个分类、501 张卡片将被内置内容覆盖/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: '确认恢复' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('should_show_readonly_notice_when_storage_unavailable', async () => {
    markGatePassed();
    breakLocalStorage();
    render(<AppRouter />);

    expect(await screen.findByText('当前为只读模式')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /分类（/ })).toBeNull();
  });
});
