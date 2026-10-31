/** 图片压缩纯函数单测（NFR/v0.9 §5.2） */

import { describe, expect, it } from 'vitest';
import {
  IMAGE_EDGE_LADDER,
  IMAGE_MAX_EDGE,
  IMAGE_QUALITY_LADDER,
  IMAGE_RAW_MAX_BYTES,
  IMAGE_TARGET_BYTES,
  ImageTooLargeError,
  firstAttempt,
  fitWithin,
  imageAttempts,
  nextAttempt,
  readImageAsDataUrl,
  withinTarget,
} from './image';

describe('fitWithin', () => {
  it('should_scale_by_longest_edge_when_image_is_larger_than_max_edge', () => {
    expect(fitWithin(2000, 1000, 1280)).toEqual({ width: 1280, height: 640 });
    expect(fitWithin(1000, 2000, 1280)).toEqual({ width: 640, height: 1280 });
  });

  it('should_keep_size_when_image_already_fits', () => {
    expect(fitWithin(600, 900, 1280)).toEqual({ width: 600, height: 900 });
    expect(fitWithin(1280, 1280, 1280)).toEqual({ width: 1280, height: 1280 });
  });

  it('should_return_zero_size_when_input_is_not_usable', () => {
    expect(fitWithin(0, 900, 1280)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(Number.NaN, 900, 1280)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(600, 900, 0)).toEqual({ width: 0, height: 0 });
  });

  it('should_never_round_a_side_down_to_zero_when_image_is_extremely_thin', () => {
    expect(fitWithin(4000, 3, 800)).toEqual({ width: 800, height: 1 });
  });
});

describe('imageAttempts', () => {
  it('should_list_every_edge_and_quality_pair_with_first_attempt_at_the_top', () => {
    const attempts = imageAttempts();
    expect(attempts).toHaveLength(IMAGE_EDGE_LADDER.length * IMAGE_QUALITY_LADDER.length);
    expect(attempts[0]).toEqual({ edge: IMAGE_MAX_EDGE, quality: 0.82 });
    expect(firstAttempt()).toEqual(attempts[0]);
    expect(attempts[attempts.length - 1]).toEqual({ edge: 800, quality: 0.55 });
  });
});

describe('nextAttempt', () => {
  it('should_drop_quality_first_when_target_is_not_met', () => {
    expect(nextAttempt({ edge: 1280, quality: 0.82 })).toEqual({ edge: 1280, quality: 0.72 });
    expect(nextAttempt({ edge: 1280, quality: 0.62 })).toEqual({ edge: 1280, quality: 0.55 });
  });

  it('should_shrink_edge_and_reset_quality_when_quality_is_exhausted', () => {
    expect(nextAttempt({ edge: 1280, quality: 0.55 })).toEqual({ edge: 1024, quality: 0.82 });
    expect(nextAttempt({ edge: 1024, quality: 0.55 })).toEqual({ edge: 800, quality: 0.82 });
  });

  it('should_return_null_when_ladder_is_exhausted_or_value_is_not_a_ladder_entry', () => {
    expect(nextAttempt({ edge: 800, quality: 0.55 })).toBeNull();
    expect(nextAttempt({ edge: 1024, quality: 0.9 })).toBeNull();
  });
});

describe('withinTarget', () => {
  it('should_compare_against_target_bytes_and_treat_empty_result_as_failure', () => {
    expect(withinTarget(IMAGE_TARGET_BYTES)).toBe(true);
    expect(withinTarget(IMAGE_TARGET_BYTES + 1)).toBe(false);
    expect(withinTarget(0)).toBe(false);
  });
});

/** 原图上限从 v0.8 的 500 KB 放宽到 8 MB（NFR/v0.9 §5.1），压缩交给 compressImageFile */
describe('readImageAsDataUrl / 原图上限', () => {
  it('should_read_a_600kb_photo_that_the_old_500kb_limit_would_have_rejected', async () => {
    const file = new File([new Uint8Array(600 * 1024)], 'photo.png', { type: 'image/png' });

    const picked = await readImageAsDataUrl(file);

    expect(picked.bytes).toBe(600 * 1024);
    expect(picked.name).toBe('photo.png');
    expect(picked.dataUrl.startsWith('data:image/png')).toBe(true);
  });

  it('should_reject_one_byte_over_the_eight_megabyte_raw_limit', async () => {
    expect(IMAGE_RAW_MAX_BYTES).toBe(8 * 1024 * 1024);
    const file = new File([new Uint8Array(IMAGE_RAW_MAX_BYTES + 1)], 'huge.png', { type: 'image/png' });

    const error = await readImageAsDataUrl(file).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ImageTooLargeError);
    expect((error as Error).message).toContain('8.0 MB');
  });
});
