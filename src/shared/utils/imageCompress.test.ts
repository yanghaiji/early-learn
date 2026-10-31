/** 图片压缩链路单测（NFR/v0.9 §5）：jsdom 没有真实 canvas / createImageBitmap，这里统一打桩 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImageCompressError, ImageTooLargeError, compressImageFile } from './image';

interface CanvasCall {
  width: number;
  height: number;
  mime: string;
  quality: number | undefined;
}

/**
 * 桩：`getContext` 返回只带 drawImage 的假上下文，`toBlob` 按 `sizeFor(第几次调用)` 回一个指定体积的 blob。
 * jsdom 下必须同时桩 `toDataURL`（WebP 探测走它）与 `createImageBitmap`（解码走它）。
 */
function stubCanvas(sizeFor: (call: number) => number, dataUrl = 'data:image/webp;base64,AAAA'): CanvasCall[] {
  const calls: CanvasCall[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => ({ drawImage: () => undefined }) as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(dataUrl);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
    mime?: string,
    quality?: number,
  ) {
    calls.push({ width: this.width, height: this.height, mime: mime ?? '', quality });
    const size = sizeFor(calls.length);
    callback(new Blob([new Uint8Array(size)], { type: mime ?? 'image/webp' }));
  } as HTMLCanvasElement['toBlob']);
  return calls;
}

function stubBitmap(width: number, height: number) {
  const close = vi.fn();
  const createImageBitmap = vi.fn(async () => ({ width, height, close }));
  vi.stubGlobal('createImageBitmap', createImageBitmap);
  return { createImageBitmap, close };
}

function makeFile(bytes: number, name = 'photo.png'): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('compressImageFile / 成功路径', () => {
  it('should_encode_as_webp_at_max_edge_when_first_attempt_fits', async () => {
    const calls = stubCanvas(() => 100 * 1024);
    stubBitmap(3000, 2000);
    const file = makeFile(3 * 1024 * 1024);

    const result = await compressImageFile(file);

    expect(result.mime).toBe('image/webp');
    expect(result.width).toBe(1280);
    expect(result.height).toBe(853);
    expect(result.bytes).toBe(100 * 1024);
    expect(result.originalBytes).toBe(file.size);
    expect(result.dataUrl.startsWith('data:image/webp')).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.quality).toBeCloseTo(0.82);
  });

  it('should_drop_quality_first_then_shrink_edge_when_blob_stays_large', async () => {
    // 1280 边长下 4 个质量档都超限，缩到 1024 的第一档才达标 → 第 5 次调用
    const calls = stubCanvas((call) => (call <= 4 ? 200 * 1024 : 100 * 1024));
    stubBitmap(3000, 2000);

    const result = await compressImageFile(makeFile(3 * 1024 * 1024));

    expect(calls).toHaveLength(5);
    expect(calls.map((item) => item.quality)).toEqual([0.82, 0.72, 0.62, 0.55, 0.82]);
    expect(calls.slice(0, 4).every((item) => item.width === 1280)).toBe(true);
    expect(result.width).toBe(1024);
    expect(result.height).toBe(683);
  });

  it('should_fall_back_to_img_and_revoke_it_when_createImageBitmap_rejects', async () => {
    stubCanvas(() => 80 * 1024);
    vi.stubGlobal('createImageBitmap', vi.fn(async () => Promise.reject(new Error('unsupported'))));
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    class FakeImage {
      naturalWidth = 2400;
      naturalHeight = 1200;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', FakeImage);

    const result = await compressImageFile(makeFile(2 * 1024 * 1024));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    expect(result.width).toBe(1280);
    expect(result.height).toBe(640);
  });

  it('should_use_jpeg_when_the_webp_probe_fails', async () => {
    stubCanvas(() => 90 * 1024, 'data:image/jpeg;base64,AAAA');
    stubBitmap(1600, 1200);

    const result = await compressImageFile(makeFile(1024 * 1024));

    expect(result.mime).toBe('image/jpeg');
    expect(result.dataUrl.startsWith('data:image/jpeg')).toBe(true);
  });
});

describe('compressImageFile / 失败路径', () => {
  it('should_reject_before_decoding_when_original_exceeds_raw_limit', async () => {
    const calls = stubCanvas(() => 100 * 1024);
    const { createImageBitmap } = stubBitmap(3000, 2000);

    await expect(compressImageFile(makeFile(9 * 1024 * 1024))).rejects.toBeInstanceOf(ImageTooLargeError);
    expect(createImageBitmap).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it('should_reject_after_twelve_attempts_when_every_ladder_step_overflows', async () => {
    const calls = stubCanvas(() => 300 * 1024);
    stubBitmap(4000, 3000);

    const error = await compressImageFile(makeFile(4 * 1024 * 1024)).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ImageCompressError);
    expect((error as Error).message).toContain('150 KB');
    // 3 边长 × 4 质量走满，不返回半成品
    expect(calls).toHaveLength(12);
  });

  it('should_reject_when_the_file_is_empty', async () => {
    stubCanvas(() => 100 * 1024);
    stubBitmap(3000, 2000);

    await expect(compressImageFile(makeFile(0))).rejects.toThrow('这张图片是空的');
  });

  it('should_reject_when_canvas_context_is_unavailable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/webp;base64,AAAA');
    stubBitmap(3000, 2000);

    // 12 档每档都拿不到上下文 → 与「用尽档位」同一个出口
    await expect(compressImageFile(makeFile(1024 * 1024))).rejects.toBeInstanceOf(ImageCompressError);
  });
});
