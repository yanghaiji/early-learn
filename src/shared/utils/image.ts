/** 图片选择与压缩（PRD §6.1：上传图压缩后 ≤ 150KB） */

import { LIMITS } from '../../domain/constants';

export interface PickedImage {
  dataUrl: string;
  bytes: number;
  name: string;
}

/** 一次编码尝试：最长边 + 质量（NFR/v0.9 §5.1） */
export interface ImageAttempt {
  /** 最长边上限 */
  edge: number;
  /** WebP / JPEG 编码质量 0–1 */
  quality: number;
}

/** 质量档：先逐档降质量，降到最低仍超限再缩边长 */
export const IMAGE_QUALITY_LADDER = [0.82, 0.72, 0.62, 0.55] as const;
/** 边长档：第一档复用 LIMITS.IMAGE_MAX_EDGE，避免两处写 1280 */
export const IMAGE_EDGE_LADDER = [LIMITS.IMAGE_MAX_EDGE, 1024, 800] as const;

export class ImageTooLargeError extends Error {
  constructor(bytes: number) {
    super(`图片 ${formatBytes(bytes)} 超过上限 ${formatBytes(LIMITS.IMAGE_MAX_BYTES)}，请压缩后再试`);
    this.name = 'ImageTooLargeError';
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function readImageAsDataUrl(file: File): Promise<PickedImage> {
  if (file.size > LIMITS.IMAGE_MAX_BYTES) return Promise.reject(new ImageTooLargeError(file.size));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('图片读取失败'));
        return;
      }
      resolve({ dataUrl: reader.result, bytes: file.size, name: file.name });
    };
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

/** dataURL 体积估算（base64 膨胀约 4/3） */
export function estimateDataUrlBytes(dataUrl: string): number {
  const index = dataUrl.indexOf(',');
  if (index < 0) return 0;
  return Math.floor(((dataUrl.length - index - 1) * 3) / 4);
}

/**
 * 等比缩到最长边 ≤ maxEdge：小图不放大（否则糊成一片），非正尺寸返回 0 交给调用方判掉。
 * 两侧都取整并下限 1，避免细长图被舍入成 0 像素。
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(maxEdge) ||
    width <= 0 ||
    height <= 0 ||
    maxEdge <= 0
  ) {
    return { width: 0, height: 0 };
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** 全部尝试档位：3 个边长 × 4 个质量 = 12 档，大在前、小在后 */
export function imageAttempts(): ImageAttempt[] {
  return IMAGE_EDGE_LADDER.flatMap((edge) =>
    IMAGE_QUALITY_LADDER.map((quality) => ({ edge, quality })),
  );
}

/** 第一档（1280 / 0.82），调用方从这里开始逐档重试 */
export function firstAttempt(): ImageAttempt {
  const [first] = imageAttempts();
  // 档位表在模块内静态构造，必非空；给类型一个兜底而不抛错
  return first ?? { edge: LIMITS.IMAGE_MAX_EDGE, quality: IMAGE_QUALITY_LADDER[0] };
}

/**
 * 下一档；末档或传入非档位值（不是表里的边长 / 质量组合）返回 null。
 * 传入未知值的口径是「已用尽」，而不是静默回到首档 —— 后者会让重试循环永不终止。
 */
export function nextAttempt(current: ImageAttempt): ImageAttempt | null {
  const attempts = imageAttempts();
  const at = attempts.findIndex(
    (item) => item.edge === current.edge && item.quality === current.quality,
  );
  return at < 0 ? null : (attempts[at + 1] ?? null);
}

/**
 * 编码结果是否达标：按 `blob.size` 判（dataURL 长度含 base64 头，不拿来当体积）。
 * 0 字节视为编码失败，不算达标。
 */
export function withinTarget(bytes: number): boolean {
  return bytes > 0 && bytes <= LIMITS.IMAGE_TARGET_BYTES;
}
