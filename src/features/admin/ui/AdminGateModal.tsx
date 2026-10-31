/**
 * 家长门弹窗（v0.10）：`Modal` + `ParentGate` 合计约 5.7 kB，首页只是「点进去才用」，
 * 却因为首页静态 import 被钉在主 chunk。抽成独立模块后由首页 `lazy` 引用。
 */

import { Modal } from '../../../shared/ui/Modal';
import { ParentGate } from '../../../shared/ui/ParentGate';

interface Props {
  title: string;
  onClose: () => void;
  onPass: () => void;
}

export function AdminGateModal({ title, onClose, onPass }: Props) {
  return (
    <Modal title={title} onClose={onClose}>
      <ParentGate onPass={onPass} />
    </Modal>
  );
}
