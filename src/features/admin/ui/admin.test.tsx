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

    expect(await screen.findByRole('heading', { name: /分类（22）/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /新建分类/ }));
    const dialog = await screen.findByRole('dialog', { name: '新建分类' });
    await user.type(within(dialog).getByLabelText('分类名称'), '恐龙');
    await user.click(within(dialog).getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('heading', { name: /分类（23）/ })).toBeInTheDocument();
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

  // 809 张卡逐字重算列表，并发跑门禁时实测要 3~5s，按默认 5s 会偶发超时
  // v0.7：CardAdmin 改为懒加载，首次断言要等 chunk 落地，故 findByRole 显式放宽到 5s
  it('should_filter_cards_when_keyword_typed', async () => {
    const user = userEvent.setup();
    markGatePassed();
    window.location.hash = '#/admin/cards';
    render(<AppRouter />);

    const search = await screen.findByRole(
      'searchbox',
      { name: '搜索卡片' },
      { timeout: 5000 },
    );
    await user.type(search, '猫');

    expect(await screen.findByText('māo · cat · 动物')).toBeInTheDocument();
    expect(screen.getByText(/共 \d+ 张符合条件/)).toBeInTheDocument();
  }, 20_000);

  it('should_ask_confirm_before_restoring_seed_content', async () => {
    const user = userEvent.setup();
    markGatePassed();
    window.location.hash = '#/admin/data';
    render(<AppRouter />);

    await user.click(await screen.findByRole('button', { name: /恢复内置内容/ }));

    const dialog = await screen.findByRole('dialog', { name: '恢复内置内容' });
    expect(within(dialog).getByText(/22 个分类、809 张卡片将被内置内容覆盖/)).toBeInTheDocument();

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

/** 拼音候选（v0.8 PRD §3）：按字列全部读音，点选才写入，不静默生成 */
describe('拼音候选（v0.8）', () => {
  /** 管理区懒加载 + 809 张卡列表：统一给到 20s */
  async function openCardForm(user: ReturnType<typeof userEvent.setup>) {
    markGatePassed();
    window.location.hash = '#/admin/cards';
    render(<AppRouter />);
    await user.click(await screen.findByRole('button', { name: '新建卡片' }, { timeout: 5000 }));
    return screen.findByRole('dialog', { name: '新建卡片' });
  }

  it('should_list_every_reading_when_multiple_pronunciation_char_typed', async () => {
    const user = userEvent.setup();
    const dialog = await openCardForm(user);

    await user.type(within(dialog).getByLabelText('中文'), '长大');
    const group = await within(dialog).findByRole('group', { name: '拼音候选' });

    expect(within(group).getByRole('button', { name: '长 cháng' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: '长 zhǎng' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: '大 dà' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: '大 dài' })).toBeInTheDocument();
  }, 20_000);

  it('should_leave_pinyin_blank_when_only_chinese_typed', async () => {
    const user = userEvent.setup();
    const dialog = await openCardForm(user);

    await user.type(within(dialog).getByLabelText('中文'), '长大');
    await within(dialog).findByRole('group', { name: '拼音候选' });

    // 不点候选就不写：多音字宁可空，也不静默猜
    expect(within(dialog).getByLabelText('拼音（带声调）')).toHaveValue('');
  }, 20_000);

  it('should_fill_whole_pinyin_when_reading_clicked', async () => {
    const user = userEvent.setup();
    const dialog = await openCardForm(user);

    await user.type(within(dialog).getByLabelText('中文'), '长大');
    const group = await within(dialog).findByRole('group', { name: '拼音候选' });
    const pinyinInput = within(dialog).getByLabelText('拼音（带声调）');

    // 其余位取第一个读音兜底：一次点击就能得到完整拼音串
    await user.click(within(group).getByRole('button', { name: '长 zhǎng' }));
    expect(pinyinInput).toHaveValue('zhǎng dà');

    await user.click(within(group).getByRole('button', { name: '大 dài' }));
    expect(pinyinInput).toHaveValue('zhǎng dài');
  }, 20_000);

  it('should_keep_existing_syllables_when_one_reading_clicked', async () => {
    const user = userEvent.setup();
    const dialog = await openCardForm(user);

    await user.type(within(dialog).getByLabelText('中文'), '长大');
    const group = await within(dialog).findByRole('group', { name: '拼音候选' });
    const pinyinInput = within(dialog).getByLabelText('拼音（带声调）');

    // 家长已手输确认「长 zhǎng」：再点「大」不能把长改回 cháng
    await user.type(pinyinInput, 'zhǎng');
    await user.click(within(group).getByRole('button', { name: '大 dài' }));

    expect(pinyinInput).toHaveValue('zhǎng dài');
  }, 20_000);

  it('should_warn_stale_pinyin_when_chinese_changed_after_pick', async () => {
    const user = userEvent.setup();
    const dialog = await openCardForm(user);

    await user.type(within(dialog).getByLabelText('中文'), '苹果');
    const group = await within(dialog).findByRole('group', { name: '拼音候选' });
    const pinyinInput = within(dialog).getByLabelText('拼音（带声调）');
    await user.click(within(group).getByRole('button', { name: '苹 píng' }));
    expect(pinyinInput).toHaveValue('píng guǒ');

    // 改词后旧拼音仍在框里（不静默改写，但必须明说）
    const zhInput = within(dialog).getByLabelText('中文');
    await user.clear(zhInput);
    await user.type(zhInput, '香蕉');

    expect(await within(dialog).findByText(/中文改过了，拼音还是上一个词的/)).toBeInTheDocument();
    expect(pinyinInput).toHaveValue('píng guǒ');
  }, 20_000);

  it('should_name_missing_chars_when_dictionary_partially_covers', async () => {
    const user = userEvent.setup();
    const dialog = await openCardForm(user);

    // 龘（U+9F98）在 GB2312 二级字，不在候选字典里；「大」在字典里
    await user.type(within(dialog).getByLabelText('中文'), '龘大');

    expect(await within(dialog).findByText(/「龘」不在字典里，请手动补/)).toBeInTheDocument();
    // 缺字不影响已知字的点选
    await user.click(within(dialog).getByRole('button', { name: '大 dà' }));
    expect(within(dialog).getByLabelText('拼音（带声调）')).toHaveValue('dà');
  }, 20_000);

  it('should_hint_manual_input_when_char_outside_dictionary', async () => {
    const user = userEvent.setup();
    const dialog = await openCardForm(user);

    // 龘（U+9F98）在 GB2312 二级字，不在候选字典里
    await user.type(within(dialog).getByLabelText('中文'), '龘');

    expect(await within(dialog).findByText(/「龘」不在字典里，请手输拼音/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('拼音（带声调）')).toHaveValue('');
  }, 20_000);
});
