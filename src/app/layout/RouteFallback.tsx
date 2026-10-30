/** 懒加载占位：与页面同容器宽度，切换时容器高度不跳（v0.7） */

export function RouteFallback() {
  return (
    <main className="page page--wide">
      <p className="section-hint">正在打开…</p>
    </main>
  );
}
