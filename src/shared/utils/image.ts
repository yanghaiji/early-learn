/** 图片选择、压缩与编码（NFR/v0.9 §5：上传图压缩后 ≤ 150 KB） */

/**
 * 压缩相关的三个上限不放 `LIMITS`：`constants.ts` 是主 chunk 的静态依赖，
 * 管理区动态 chunk 一旦按属性读它，那条属性就无法从主 chunk 里摇掉。
 * 实测放 `LIMITS` 时主 chunk gzip 197.61（顶穿 197.58 预算），挪到这里后 197.57。
 */
/** 上传原图上限（压缩前） */
export const IMAGE_RAW_MAX_BYTES = 8 * 1024 * 1024;
/** 压缩后硬上限，写入前校验 */
export const IMAGE_TARGET_BYTES = 150 * 1024;
/** 压缩最长边 */
export const IMAGE_MAX_EDGE = 1280;

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
/** 边长档：第一档复用 IMAGE_MAX_EDGE，避免两处写 1280 */
export const IMAGE_EDGE_LADDER = [IMAGE_MAX_EDGE, 1024, 800] as const;

export class ImageTooLargeError extends Error {
  constructor(bytes: number, limit = IMAGE_RAW_MAX_BYTES) {
    super(`照片 ${formatBytes(bytes)} 太大了（上限 ${formatBytes(limit)}），请先裁剪`);
    this.name = 'ImageTooLargeError';
  }
}

/** 压缩链路自身的失败（打不开 / 编不出 / 档位用尽仍超限），消息直接给家长看 */
export class ImageCompressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageCompressError';
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function readImageAsDataUrl(file: Blob & { name?: string }): Promise<PickedImage> {
  // 这里是「原图上限」，压缩前的原始文件才受 8 MB 约束（压缩后体积由 withinTarget 管）
  if (file.size > IMAGE_RAW_MAX_BYTES) return Promise.reject(new ImageTooLargeError(file.size));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('图片读取失败'));
        return;
      }
      resolve({ dataUrl: reader.result, bytes: file.size, name: file.name ?? '' });
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
  return first ?? { edge: IMAGE_MAX_EDGE, quality: IMAGE_QUALITY_LADDER[0] };
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
  return bytes > 0 && bytes <= IMAGE_TARGET_BYTES;
}

/** 压缩后的图片：多出原始体积与最终尺寸，用于回显「1.8 MB → 96 KB · 1280×960」 */
export interface CompressedImage extends PickedImage {
  originalBytes: number;
  width: number;
  height: number;
  mime: string;
}

/** 解码后的图源（`createImageBitmap` 或回退的 `<img>`），用完必须 release */
interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release(): void;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new ImageCompressError('这张图片打不开，请换一张'));
    image.src = url;
  });
}

/** `createImageBitmap` 优先，不认这个格式（部分浏览器的 webp / heic）时回退 `<img>` + objectURL */
async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close?.(),
      };
    } catch {
      // 继续走 <img>
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(url);
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/** 优先 WebP，不支持则 JPEG；每次调用探一次（1×1 画布），不做全局缓存以免测试互相影响 */
function preferredMime(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
  } catch {
    return 'image/jpeg';
  }
}

/** 一次「画布 + toBlob」；拿不到上下文或编码失败返回 null，由调用方推进下一档 */
function encodeAttempt(
  source: CanvasImageSource,
  width: number,
  height: number,
  mime: string,
  quality: number,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return Promise.resolve(null);

  try {
    context.drawImage(source, 0, 0, width, height);
  } catch {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), mime, quality);
    } catch {
      resolve(null);
    }
  });
}

/**
 * 选图 → 解码 → 逐档编码 → 转 dataURL（NFR/v0.9 §5.2）。
 * 档位用尽仍超限时抛 `ImageCompressError` 而**不返回半成品**：宁可让家长换图，也不往卡片里写一张超预算的图。
 */
export async function compressImageFile(file: File): Promise<CompressedImage> {
  if (file.size === 0) throw new ImageCompressError('这张图片是空的，请重新选择');
  if (file.size > IMAGE_RAW_MAX_BYTES) throw new ImageTooLargeError(file.size);

  const decoded = await decodeImage(file);
  try {
    const mime = preferredMime();
    let attempt: ImageAttempt | null = firstAttempt();
    while (attempt) {
      const size = fitWithin(decoded.width, decoded.height, attempt.edge);
      if (size.width === 0 || size.height === 0) {
        throw new ImageCompressError('读不到这张图片的尺寸，请换一张');
      }

      const blob = await encodeAttempt(decoded.source, size.width, size.height, mime, attempt.quality);
      if (blob && withinTarget(blob.size)) {
        const picked = await readImageAsDataUrl(new File([blob], file.name, { type: mime }));
        return {
          dataUrl: picked.dataUrl,
          bytes: blob.size,
          name: file.name,
          originalBytes: file.size,
          width: size.width,
          height: size.height,
          mime,
        };
      }

      attempt = nextAttempt(attempt);
    }
    throw new ImageCompressError(
      `这张图细节太多，压缩不到 ${formatBytes(IMAGE_TARGET_BYTES)}，请换一张或先裁剪`,
    );
  } finally {
    decoded.release();
  }
}
