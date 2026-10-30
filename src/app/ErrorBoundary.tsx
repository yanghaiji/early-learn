/** 顶层错误边界：渲染异常时给出可恢复出口，避免整页白屏（PRD §9） */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { EmptyState } from '../shared/ui/Feedback';
import { Button } from '../shared/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private readonly reload = () => {
    // 重新加载与「恢复初始路由」兼顾：回到首页并让应用重新装配
    window.location.hash = '#/';
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="app-shell">
        <main className="page">
          <EmptyState
            emoji="🛠️"
            title="页面出了点小问题"
            description="内容都还存在本地，刷新一下就能继续使用。"
            action={
              <Button variant="primary" size="lg" onClick={this.reload}>
                重新加载
              </Button>
            }
          />
        </main>
      </div>
    );
  }
}
