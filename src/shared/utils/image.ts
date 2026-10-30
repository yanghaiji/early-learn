/** 图片选择与校验（PRD §6.1：单张 ≤ 500KB） */

import { LIMITS } from '../../domain/constants';

export interface PickedImage {
  dataUrl: string;
  bytes: number;
  name: string;
}

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
