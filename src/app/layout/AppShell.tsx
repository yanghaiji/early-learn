/** 全局骨架：降级提示条 + 页面出口 + Toast */

import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Github } from 'lucide-react';
import { useCatalog } from '../CatalogProvider';
import { APP_NAME, REPO_URL } from '../version';
import { Banner } from '../../shared/ui/Feedback';
import { ToastHost } from '../../shared/ui/ToastHost';
import { useSettingsStore } from '../../shared/store/settingsStore';
import { RouteFallback } from './RouteFallback';

export function AppShell() {
  const { status, message, isReadOnly } = useCatalog();
  const reduceMotion = useSettingsStore((state) => state.settings.reduceMotion);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? 'true' : 'false';
  }, [reduceMotion]);

  return (
    <div className="app-shell">
      {isReadOnly ? <Banner>只读模式：{message ?? '当前浏览器无法保存数据'}（浏览不受影响）</Banner> : null}
      {!isReadOnly && message && status === 'corrupted' ? <Banner tone="info">{message}</Banner> : null}
      {/* 懒加载边界只在页面出口内：切换页面时页脚不跟着消失（v0.7） */}
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
      {/* v0.7：页脚常驻一行「应用名 + 源码地址」，全站任一页都能找到仓库 */}
      <footer className="app-footer">
        <span className="text-xs muted">{APP_NAME} · 1–3 岁启蒙认知</span>
        <span className="app-footer__sep" aria-hidden="true" />
        <a className="foot-link" href={REPO_URL} target="_blank" rel="noreferrer">
          <Github size={13} />
          源码 · GitHub
        </a>
      </footer>
      <ToastHost />
    </div>
  );
}
