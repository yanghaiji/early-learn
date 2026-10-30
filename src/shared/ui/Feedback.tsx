/** 空态与提示条 */

import type { ReactNode } from 'react';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ emoji = '🧸', title, description, action }: EmptyStateProps) {
  return (
    <div className="empty" role="status">
      <div className="empty__emoji" aria-hidden="true">
        {emoji}
      </div>
      <p className="empty__title">{title}</p>
      {description ? <p className="empty__desc">{description}</p> : null}
      {action}
    </div>
  );
}

interface BannerProps {
  children: ReactNode;
  tone?: 'warn' | 'info';
}

export function Banner({ children, tone = 'warn' }: BannerProps) {
  return (
    <div
      className="banner"
      role="status"
      style={
        tone === 'info'
          ? { background: 'var(--c-primary-soft)', color: 'var(--c-primary)' }
          : undefined
      }
    >
      {children}
    </div>
  );
}
