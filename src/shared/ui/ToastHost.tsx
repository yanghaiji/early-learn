/** Toast 容器：所有 toast 出口（错误不打断操作） */

import { useToastStore } from '../store/toastStore';

export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="toast-wrap" aria-live="polite" aria-atomic="false">
      {toasts.map((item) => (
        <div key={item.id} className={item.tone === 'error' ? 'toast toast--error' : 'toast'} role="status">
          {item.message}
        </div>
      ))}
    </div>
  );
}
