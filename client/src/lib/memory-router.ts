import { memoryLocation } from "wouter/memory-location";

const initialFull = window.location.pathname + window.location.search;

const { hook: _baseHook, navigate: _baseNavigate } = memoryLocation({ path: initialFull || "/" });

const historyStack: string[] = [initialFull || "/"];

export const memoryNavigate = (to: string, opts?: any) => {
  const next = to || "/";
  const replace = Boolean(opts?.replace);
  if (replace) {
    historyStack[historyStack.length - 1] = next;
  } else {
    historyStack.push(next);
  }
  _baseNavigate(to, opts);
};

export const canGoBack = () => historyStack.length > 1;

export const goBack = (fallback = "/") => {
  if (historyStack.length > 1) {
    historyStack.pop();
    const prev = historyStack[historyStack.length - 1] || fallback;
    _baseNavigate(prev, { replace: true });
    return;
  }
  _baseNavigate(fallback, { replace: true });
};

export const memoryHook = (): [string, typeof memoryNavigate] => {
  const [fullPath] = _baseHook();
  const pathname = fullPath.split("?")[0] || "/";
  return [pathname, memoryNavigate];
};

export const memorySearchHook = (): string => {
  const [fullPath] = _baseHook();
  const idx = fullPath.indexOf("?");
  return idx === -1 ? "" : fullPath.slice(idx + 1);
};
