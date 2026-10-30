/** 应用入口：挂载路由与全局样式 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { ErrorBoundary } from './app/ErrorBoundary';
import { registerServiceWorker } from './app/pwa';
import { AppRouter } from './app/router';

const container = document.getElementById('root');
if (!container) throw new Error('缺少 #root 挂载点');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  </StrictMode>,
);

// 生产构建注册 SW：断网仍能打开外壳（v0.7 US-V5）
registerServiceWorker();
