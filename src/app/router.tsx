/**
 * 路由表。
 * 使用 HashRouter：配合 vite base './' 与相对图片路径，静态托管（含子路径）无需重写规则（NFR §6.3）。
 */

import { HashRouter, Route, Routes } from 'react-router-dom';
import { AdminGuard } from '../features/admin/ui/AdminGuard';
import { AdminLayout } from '../features/admin/ui/AdminLayout';
import { CardAdmin } from '../features/admin/ui/CardAdmin';
import { CategoryAdmin } from '../features/admin/ui/CategoryAdmin';
import { DataAdmin } from '../features/admin/ui/DataAdmin';
import { CardDetailPage } from '../features/cards/ui/CardDetailPage';
import { CategoryPage } from '../features/cards/ui/CategoryPage';
import { StoryReaderPage } from '../features/cards/ui/StoryReaderPage';
import { HomePage } from '../features/categories/ui/HomePage';
import { FavoritesPage } from '../features/learn/ui/FavoritesPage';
import { QuizPage } from '../features/learn/ui/QuizPage';
import { RecentPage } from '../features/learn/ui/RecentPage';
import { ReviewPage } from '../features/learn/ui/ReviewPage';
import { GuidePage } from '../features/misc/ui/GuidePage';
import { NotFoundPage } from '../features/misc/ui/NotFoundPage';
import { SettingsPage } from '../features/settings/ui/SettingsPage';
import { CatalogProvider } from './CatalogProvider';
import { AppShell } from './layout/AppShell';

export function AppRouter() {
  return (
    <CatalogProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="c/:categoryId" element={<CategoryPage />} />
            <Route path="card/:cardId" element={<CardDetailPage />} />
            <Route path="story/:cardId" element={<StoryReaderPage />} />
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
