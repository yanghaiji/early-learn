/** 基础按钮：统一触控尺寸、按压反馈与可访问性 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/classNames';

type Variant = 'default' | 'primary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  size?: 'md' | 'lg';
  children: ReactNode;
}

const VARIANT_CLASS: Record<Variant, string> = {
  default: '',
  primary: 'btn--primary',
  danger: 'btn--danger',
  ghost: 'btn--ghost',
};

export function Button({
  variant = 'default',
  block = false,
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx('btn', VARIANT_CLASS[variant], block && 'btn--block', size === 'lg' && 'btn--lg', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 必须提供，供屏幕阅读器与测试定位 */
  label: string;
  plain?: boolean;
  small?: boolean;
  children: ReactNode;
}

export function IconButton({ label, plain, small, className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx('icon-btn', plain && 'icon-btn--plain', small && 'icon-btn--sm', className)}
      {...rest}
    >
      {children}
    </button>
  );
}
