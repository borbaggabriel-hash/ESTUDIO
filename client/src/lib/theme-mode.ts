export type ThemeMode = "light" | "dark";

export function getThemeModeFromDom(): ThemeMode {
  return "light";
}

export function setThemeMode(_mode: ThemeMode) {
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "light";
}

export function initThemeMode() {
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "light";
}

export function toggleThemeMode(): ThemeMode {
  return "light";
}

