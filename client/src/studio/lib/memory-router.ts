import { memoryLocation } from "wouter/memory-location";

const getInitialPath = () => {
  const path = window.location.pathname + window.location.search;
  // If we're in the hub-dub subpath, we want to start from there
  if (path.startsWith("/hub-dub")) {
    return path;
  }
  return path || "/";
};

const { hook: _baseHook, navigate: _baseNavigate } = memoryLocation({ 
  path: getInitialPath()
});

export const memoryNavigate = (to: string, opts?: any) => {
  // Ensure 'to' starts with /hub-dub if it doesn't already
  const target = to.startsWith("/hub-dub") ? to : `/hub-dub${to.startsWith("/") ? "" : "/"}${to}`;
  _baseNavigate(target, opts);
};

export const memoryHook = (): [string, typeof memoryNavigate] => {
  const [fullPath] = _baseHook();
  // Strip /hub-dub prefix for internal routing logic if needed, 
  // but wouter matches against the full path in the Switch
  const pathname = fullPath.split("?")[0] || "/";
  return [pathname, memoryNavigate];
};

export const memorySearchHook = (): string => {
  const [fullPath] = _baseHook();
  const idx = fullPath.indexOf("?");
  return idx === -1 ? "" : fullPath.slice(idx + 1);
};
