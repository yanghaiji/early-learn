/** 全局骨架：降级提示条 + 页面出口 + Toast */

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useCatalog } from '../CatalogProvider';
import { APP_NAME } from '../version';
import { Banner } from '../../shared/ui/Feedback';
import { ToastHost } from '../../shared/ui/ToastHost';
import { useSettingsStore } from '../../shared/store/settingsStore';

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
      <Outlet />
      <footer className="page" style={{ paddingTop: 0, flex: '0 0 auto' }} aria-hidden="true">
        <p className="text-xs muted" style={{ textAlign: 'center', margin: 0 }}>
          {APP_NAME} · 1–3 岁启蒙认知
        </p>
      </footer>
      <ToastHost />
    </div>
  );
}
