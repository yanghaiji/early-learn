/**
 * 生成 PWA 图标（v0.7）。
 * 源文件只有 public/icons/icon.svg（纯几何图形，不依赖字体），
 * 用它渲染 192 / 512 与 maskable 三份 PNG，避免手写多份位图。
 *
 * 用法：npm run prepare:icons
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = path.join(root, 'public/icons/icon.svg');
const outDir = path.join(root, 'public/icons');

const TARGETS = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512 },
];

const svg = await readFile(src);

for (const { file, size } of TARGETS) {
  const dest = path.join(outDir, file);
  await sharp(svg, { density: Math.max(72, Math.round((size / 512) * 384)) })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(dest);
  console.log(`生成 ${path.relative(root, dest)} (${size}×${size})`);
}

console.log('图标生成完成 ✓');
