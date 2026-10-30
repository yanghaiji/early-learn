/** 应用入口：挂载路由与全局样式 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { ErrorBoundary } from './app/ErrorBoundary';
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
