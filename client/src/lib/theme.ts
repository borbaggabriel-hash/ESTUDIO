export const theme = {
  colors: {
    background:      "hsl(222 47% 6%)",
    surface:         "rgba(255,255,255,0.06)",
    surfaceHover:    "rgba(255,255,255,0.10)",
    border:          "rgba(255,255,255,0.10)",
    borderSubtle:    "rgba(255,255,255,0.06)",
    text: {
      primary:   "hsl(210 40% 96%)",
      secondary: "rgba(255,255,255,0.70)",
      muted:     "rgba(255,255,255,0.45)",
      disabled:  "rgba(255,255,255,0.25)",
    },
    accent: {
      blue:       "hsl(38 100% 50%)",
      blueFaint:  "hsl(38 100% 50% / 0.08)",
      blueSubtle: "hsl(38 100% 50% / 0.15)",
      blueBorder: "hsl(38 100% 50% / 0.25)",
      violet:     "hsl(270 80% 60%)",
      violetFaint:"hsl(270 80% 60% / 0.08)",
    },
    status: {
      active:    { bg: "bg-emerald-500/12",  text: "text-emerald-400", ring: "border-emerald-500/25" },
      planned:   { bg: "bg-white/6",         text: "text-white/55",    ring: "border-white/10"       },
      completed: { bg: "bg-amber-500/12",    text: "text-amber-400",   ring: "border-amber-500/25"   },
      cancelled: { bg: "bg-red-500/12",      text: "text-red-400",     ring: "border-red-500/25"     },
    },
    roles: {
      platform_owner: "bg-rose-500/12 text-rose-400 border-rose-500/25",
      diretor:        "bg-amber-500/12 text-amber-400 border-amber-500/25",
      dublador:       "bg-violet-500/12 text-violet-400 border-violet-500/25",
    },
  },

  spacing: {
    pagePx:   "px-5",
    pagePy:   "py-8",
    sectionGap: "space-y-8",
    cardPad:  "p-5",
    innerGap: "gap-3",
  },

  typography: {
    pageTitle:    "text-3xl font-bold tracking-tight",
    pageSubtitle: "text-sm text-muted-foreground mt-1",
    sectionLabel: "text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground",
    cardTitle:    "text-sm font-medium text-foreground/80",
    statValue:    "text-2xl font-bold tracking-tight",
    body:         "text-sm text-foreground",
    caption:      "text-xs text-muted-foreground",
    mono:         "font-mono text-xs",
  },

  radius: {
    sm: "rounded-md",
    md: "rounded-lg",
    lg: "rounded-xl",
    xl: "rounded-2xl",
    full: "rounded-full",
  },

  animation: {
    enter:   "page-enter",
    shimmer: "shimmer",
    press:   "press-effect",
  },
} as const;

export type ThemeColors = typeof theme.colors;
export type ThemeTypography = typeof theme.typography;

export const t = theme.typography;
export const c = theme.colors;
export const r = theme.radius;
export const s = theme.spacing;
