/** 弹层：遮罩 + Esc 关闭 + 焦点收敛（管理区表单/确认共用） */

import { useEffect, type ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  /** 关闭遮罩点击（危险确认场景可禁用，避免误触关闭） */
  dismissible?: boolean;
}

export function Modal({ title, children, footer, onClose, dismissible = true }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, dismissible]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="modal__title">{title}</h2>
        <div>{children}</div>
        {footer ? <div className="modal__actions">{footer}</div> : null}
      </div>
    </div>
  );
}
