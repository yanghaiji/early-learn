/** 设置页（PRD US-06 / US-08）：展示语言、语音开关与语速、动效偏好 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { APP_NAME, APP_VERSION } from '../../../app/version';
import {
  DISPLAY_MODES,
  DISPLAY_MODE_LABEL,
  type DisplayMode,
} from '../../../domain/entities/settings';
import { SPEECH_RATES } from '../../../domain/constants';
import { Button, IconButton } from '../../../shared/ui/Button';
import { Modal } from '../../../shared/ui/Modal';
import { ParentGate } from '../../../shared/ui/ParentGate';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { clearGatePassed, markGatePassed } from '../../admin/gateSession';
import { useVoiceReport } from '../../speech/hooks/useVoiceReport';

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="row">
      <div className="row__grow">
        <p className="row__title">{title}</p>
        <p className="row__meta">{description}</p>
      </div>
      <Button
        variant={checked ? 'primary' : 'default'}
        aria-pressed={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        {checked ? '已开启' : '已关闭'}
      </Button>
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const settings = useSettingsStore((state) => state.settings);
  const setDisplayMode = useSettingsStore((state) => state.setDisplayMode);
  const setSpeechEnabled = useSettingsStore((state) => state.setSpeechEnabled);
  const setSpeechRate = useSettingsStore((state) => state.setSpeechRate);
  const setSpeakOnEnter = useSettingsStore((state) => state.setSpeakOnEnter);
  const setReduceMotion = useSettingsStore((state) => state.setReduceMotion);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const [gateOpen, setGateOpen] = useState(false);
  const voices = useVoiceReport();

  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <>
      <header className="topbar topbar--bordered">
        <IconButton label="返回首页" plain onClick={() => navigate('/')}>
          <ArrowLeft size={26} />
        </IconButton>
        <h1 className="topbar__title">设置</h1>
      </header>

      <main className="page" style={{ maxWidth: 720 }}>
        <section className="panel">
          <h2 className="panel__title">显示语言</h2>
          <div className="chip-row" style={{ marginBottom: 0 }}>
            {DISPLAY_MODES.map((mode: DisplayMode) => (
              <button
                key={mode}
                type="button"
                className={mode === settings.displayMode ? 'chip chip--active' : 'chip'}
                aria-pressed={mode === settings.displayMode}
                onClick={() => setDisplayMode(mode)}
              >
                {DISPLAY_MODE_LABEL[mode]}
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="panel__title">语音朗读</h2>
          {!speechSupported ? (
            <p className="field__hint" style={{ marginBottom: 12 }}>
              当前浏览器不支持语音合成，建议使用 Chrome / Edge / Safari。
            </p>
          ) : null}
          <ToggleRow
            title="点读发音"
            description="点击图片或按钮时朗读中文与英文"
            checked={settings.speechEnabled}
            onChange={setSpeechEnabled}
          />
          <ToggleRow
            title="进入卡片自动朗读"
            description="打开新卡片时自动读一遍中文（默认关闭，避免打扰）"
            checked={settings.speakOnEnter}
            disabled={!settings.speechEnabled}
            onChange={setSpeakOnEnter}
          />
          <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
            <span className="field__label">语速</span>
            <div className="chip-row" style={{ marginBottom: 0 }}>
              {SPEECH_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  className={rate === settings.speechRate ? 'chip chip--active' : 'chip'}
                  aria-pressed={rate === settings.speechRate}
                  disabled={!settings.speechEnabled}
                  onClick={() => setSpeechRate(rate)}
                >
                  {rate}×
                </button>
              ))}
            </div>
          </div>
          {speechSupported ? (
            <p className="field__hint" style={{ marginTop: 12, marginBottom: 0 }}>
              本机音色：中文 {voices.zh} 个（本地 {voices.zhLocal} 个）· 英文 {voices.en} 个（本地 {voices.enLocal} 个）
              {voices.en === 0
                ? '。这台设备没有英文音色，English 按钮只能靠中文音色拼读；在系统语音设置里加装英文语音包后即可正常发音。'
                : ''}
            </p>
          ) : null}
        </section>

        <section className="panel">
          <h2 className="panel__title">其它</h2>
          <ToggleRow
            title="减少动效"
            description="关闭页面过渡与按压动效，适合对闪烁敏感的孩子"
            checked={settings.reduceMotion}
            onChange={setReduceMotion}
          />
          <div className="row">
            <div className="row__grow">
              <p className="row__title">家长管理</p>
              <p className="row__meta">编辑分类与卡片、导入导出内容</p>
            </div>
            <Button onClick={() => setGateOpen(true)}>
              <Lock size={18} />
              进入
            </Button>
          </div>
          <div className="row">
            <div className="row__grow">
              <p className="row__title">恢复默认设置</p>
              <p className="row__meta">只影响本机设置，不会删除任何卡片</p>
            </div>
            <Button variant="ghost" onClick={resetSettings}>
              恢复
            </Button>
          </div>
        </section>

        <p className="text-xs muted" style={{ textAlign: 'center' }}>
          {APP_NAME} v{APP_VERSION}
        </p>
      </main>

      {gateOpen ? (
        <Modal title="家长管理" onClose={() => setGateOpen(false)}>
          <ParentGate
            onPass={() => {
              clearGatePassed();
              markGatePassed();
              setGateOpen(false);
              navigate('/admin');
            }}
          />
        </Modal>
      ) : null}
    </>
  );
}
