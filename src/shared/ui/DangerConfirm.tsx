/** 危险操作确认：删除分类等不可逆动作 */

import { Modal } from './Modal';
import { Button } from './Button';

interface Props {
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DangerConfirm({ title, description, confirmLabel = '确认删除', busy, onConfirm, onCancel }: Props) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      dismissible={!busy}
      footer={
        <>
          <Button onClick={onCancel} disabled={busy}>
            取消
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? '处理中…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="modal__body">{description}</p>
    </Modal>
  );
}
