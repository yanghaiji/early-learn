/** 家长门会话状态：通过后本标签页会话内有效 */

const GATE_SESSION_KEY = 'early-learn:gate-passed';

export function isGatePassed(): boolean {
  try {
    return window.sessionStorage.getItem(GATE_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function markGatePassed(): void {
  try {
    window.sessionStorage.setItem(GATE_SESSION_KEY, '1');
  } catch {
    // 会话存储不可用时仅本次渲染有效（由组件 state 兜底）
  }
}

export function clearGatePassed(): void {
  try {
    window.sessionStorage.removeItem(GATE_SESSION_KEY);
  } catch {
    // ignore
  }
}
