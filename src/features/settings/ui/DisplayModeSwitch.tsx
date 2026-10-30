/** 展示模式切换（幼儿可见的安全设置，无需家长门） */

import { DISPLAY_MODES, DISPLAY_MODE_LABEL, type DisplayMode } from '../../../domain/entities/settings';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { useSettingsStore } from '../../../shared/store/settingsStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DisplayModeSwitch({ open, onClose }: Props) {
  const mode = useSettingsStore((state) => state.settings.displayMode);
  const setDisplayMode = useSettingsStore((state) => state.setDisplayMode);

  if (!open) return null;

  const choose = (next: DisplayMode) => {
    setDisplayMode(next);
    onClose();
  };

  return (
    <Modal
      title="显示方式"
      onClose={onClose}
      footer={
        <Button variant="ghost" onClick={onClose}>
          关闭
        </Button>
      }
    >
      <p className="modal__body">切换卡片上显示的语言</p>
      <div className="stack">
        {DISPLAY_MODES.map((item) => (
          <Button
            key={item}
            size="lg"
            variant={item === mode ? 'primary' : 'default'}
            onClick={() => choose(item)}
          >
            {DISPLAY_MODE_LABEL[item]}
          </Button>
        ))}
      </div>
    </Modal>
  );
}
