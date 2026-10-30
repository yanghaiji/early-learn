/** 设置页交互测试（PRD US-06 / M9）：展示模式、语音联动、恢复默认、管理入口 */

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRouter } from '../../../app/router';
import { SPEECH_DEFAULT_RATE } from '../../../domain/constants';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { resetLocalStorage } from '../../../test/memoryStorage';

beforeEach(() => {
  resetLocalStorage();
  window.sessionStorage.clear();
  window.location.hash = '#/settings';
  useSettingsStore.getState().resetSettings();
});

describe('SettingsPage', () => {
  it('should_switch_display_mode_when_chip_clicked', async () => {
    const user = userEvent.setup();
    render(<AppRouter />);

    const english = await screen.findByRole('button', { name: '英文' });
    await user.click(english);

    expect(useSettingsStore.getState().settings.displayMode).toBe('en');
    expect(english).toHaveAttribute('aria-pressed', 'true');
  });

  it('should_disable_rate_chips_when_speech_turned_off', async () => {
    const user = userEvent.setup();
    render(<AppRouter />);

    const rateChip = await screen.findByRole('button', { name: `${SPEECH_DEFAULT_RATE}×` });
    expect(rateChip).toBeEnabled();

    const speechRow = screen.getByText('点读发音').closest('.row');
    expect(speechRow).not.toBeNull();
    await user.click(within(speechRow as HTMLElement).getByRole('button', { name: '已开启' }));

    expect(useSettingsStore.getState().settings.speechEnabled).toBe(false);
    expect(rateChip).toBeDisabled();
  });

  it('should_restore_defaults_when_reset_clicked', async () => {
    const user = userEvent.setup();
    useSettingsStore.getState().setDisplayMode('both');
    useSettingsStore.getState().setReduceMotion(true);
    render(<AppRouter />);

    const resetRow = screen.getByText('恢复默认设置').closest('.row');
    expect(resetRow).not.toBeNull();
    await user.click(within(resetRow as HTMLElement).getByRole('button', { name: '恢复' }));

    const settings = useSettingsStore.getState().settings;
    expect(settings.displayMode).toBe('zh');
    expect(settings.reduceMotion).toBe(false);
  });

  it('should_open_parent_gate_when_admin_entry_clicked', async () => {
    const user = userEvent.setup();
    render(<AppRouter />);

    const adminRow = screen.getByText('家长管理').closest('.row');
    expect(adminRow).not.toBeNull();
    await user.click(within(adminRow as HTMLElement).getByRole('button', { name: '进入' }));

    expect(await screen.findByRole('group', { name: '家长验证' })).toBeInTheDocument();
  });
});
