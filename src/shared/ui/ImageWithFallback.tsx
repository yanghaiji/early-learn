/** 图片 + 首字兜底占位（ADR-005）：永不白屏，不产生布局跳动 */

import { useEffect, useState } from 'react';
import { firstChar } from '../../domain/services/catalog';
import { categoryColorVar, cx } from '../utils/classNames';

interface Props {
  src?: string;
  alt: string;
  /** 兜底显示的文字，取首字 */
  fallbackText: string;
  colorToken?: string;
  /** 首屏 / 详情页首张图可关掉懒加载 */
  eager?: boolean;
  className?: string;
}

export function ImageWithFallback({ src, alt, fallbackText, colorToken, eager, className }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className={cx('img-ph', className)} style={categoryColorVar(colorToken)} aria-hidden="true">
        {firstChar(fallbackText)}
      </div>
    );
  }

  return (
    <img
      className={cx('img-fill', className)}
      src={src}
      alt={alt}
      width={320}
      height={320}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
