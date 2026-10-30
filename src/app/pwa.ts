/**
 * Service Worker 注册（v0.7 US-V4 / US-V5）。
 *
 * 只在生产构建里注册：dev 下注册会与 HMR 抢资源，vitest（NODE_ENV=test）也不需要。
 * 注册失败不抛错——离线是增强能力，不能影响正常浏览。
 */

export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  const base = import.meta.env.BASE_URL || './';

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      // 静态托管不支持 SW（如内嵌 WebView）时静默降级：浏览与朗读均不受影响
    });
  });
}
