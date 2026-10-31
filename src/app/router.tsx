/**
 * 路由表。
 * 使用 HashRouter：配合 vite base './' 与相对图片路径，静态托管（含子路径）无需重写规则（NFR §6.3）。
 *
 * 懒加载分工（v0.7 ADR-V4，v0.10 扩到设置页与管理区门禁）：管理区三页、听音选图、故事页、
 * 使用说明、设置页走 lazy，高频页（首页 / 分龄墙 / 段页 / 分类 / 详情 / 收藏 / 最近 / 复习 / 搜索）保持静态，
 * 避免「点一张卡要先等一个 chunk」。v0.10 把设置页与 `AdminGuard` 也移出主 chunk：两者都只在点进去后
 * 才需要，却把 `ParentGate` / `Modal` 整套家长门一起钉在了首屏（主 chunk 预算已无余量）。
 * v0.12 的段页 GroupPage 同样静态：它是首页段卡的直接落点，首跳不等 chunk（技术方案 Q-3）。
 */

import { lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../features/admin/ui/AdminLayout';
import { CardDetailPage } from '../features/cards/ui/CardDetailPage';
import { CategoryPage } from '../features/cards/ui/CategoryPage';
import { AgePage } from '../features/categories/ui/AgePage';
import { GroupPage } from '../features/categories/ui/GroupPage';
import { HomePage } from '../features/categories/ui/HomePage';
import { FavoritesPage } from '../features/learn/ui/FavoritesPage';
import { RecentPage } from '../features/learn/ui/RecentPage';
import { ReviewPage } from '../features/learn/ui/ReviewPage';
import { NotFoundPage } from '../features/misc/ui/NotFoundPage';
import { SearchPage } from '../features/search/ui/SearchPage';
import { CatalogProvider } from './CatalogProvider';
import { AppShell } from './layout/AppShell';

const CardAdmin = lazy(() =>
  import('../features/admin/ui/CardAdmin').then((m) => ({ default: m.CardAdmin })),
);
const CategoryAdmin = lazy(() =>
  import('../features/admin/ui/CategoryAdmin').then((m) => ({ default: m.CategoryAdmin })),
);
const DataAdmin = lazy(() =>
  import('../features/admin/ui/DataAdmin').then((m) => ({ default: m.DataAdmin })),
);
const QuizPage = lazy(() =>
  import('../features/learn/ui/QuizPage').then((m) => ({ default: m.QuizPage })),
);
const StoryReaderPage = lazy(() =>
  import('../features/cards/ui/StoryReaderPage').then((m) => ({ default: m.StoryReaderPage })),
);
const GuidePage = lazy(() =>
  import('../features/misc/ui/GuidePage').then((m) => ({ default: m.GuidePage })),
);
const SettingsPage = lazy(() =>
  import('../features/settings/ui/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const AdminGuard = lazy(() =>
  import('../features/admin/ui/AdminGuard').then((m) => ({ default: m.AdminGuard })),
);

/** 路由表（懒加载边界在 AppShell 的页面出口处，见 AppShell.tsx） */
export function AppRouter() {
  return (
    <CatalogProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="age/:band" element={<AgePage />} />
            <Route path="group/:groupId" element={<GroupPage />} />
            <Route path="c/:categoryId" element={<CategoryPage />} />
            <Route path="card/:cardId" element={<CardDetailPage />} />
            <Route path="story/:cardId" element={<StoryReaderPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="recent" element={<RecentPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="quiz" element={<QuizPage />} />
            <Route path="guide" element={<GuidePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="admin"
              element={
                <AdminGuard>
                  <AdminLayout />
                </AdminGuard>
              }
            >
              <Route index element={<CategoryAdmin />} />
              <Route path="cards" element={<CardAdmin />} />
              <Route path="data" element={<DataAdmin />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </CatalogProvider>
  );
}
