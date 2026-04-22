import { useTheme as useNextTheme } from "next-themes";

export type Theme = "dark" | "light" | "system";

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  return { theme: theme as Theme, setTheme, resolvedTheme };
}

export function ThemeProvider({ children }: { children: React.ReactNode } & Record<string, unknown>) {
  return <>{children}</>;
}
