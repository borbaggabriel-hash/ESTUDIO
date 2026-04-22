import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

// ─── Page Section ────────────────────────────────────────────────────────────
interface PageSectionProps {
  children: ReactNode;
  className?: string;
}
export function PageSection({ children, className }: PageSectionProps) {
  return (
    <div className={cn("space-y-8 page-enter", className)}>
      {children}
    </div>
  );
}

// ─── Page Header ─────────────────────────────────────────────────────────────
interface PageHeaderProps {
  label?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}
export function PageHeader({ label, title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start justify-between gap-4", className)}>
      <div>
        {label && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary mb-2">
            {label}
          </p>
        )}
        <h1 className="vhub-page-title">{title}</h1>
        {subtitle && <p className="vhub-page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  valueClassName?: string;
  className?: string;
  description?: string;
}
export function StatCard({ label, value, icon, valueClassName, className, description }: StatCardProps) {
  return (
    <div className={cn("vhub-card p-5", className)}>
      <div className="flex items-start justify-between mb-3">
        <span className="vhub-label">{label}</span>
        <div className="shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">{icon}</div>
      </div>
      <div className={cn("text-2xl font-bold tracking-tight", valueClassName ?? "text-foreground")}>
        {value}
      </div>
      {description && (
        <p className="text-[11px] text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("vhub-card flex flex-col items-center justify-center py-16 px-8 text-center", className)}>
      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-muted-foreground/40">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mt-1">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
interface SectionLabelProps {
  children: ReactNode;
  className?: string;
  as?: "p" | "h2" | "h3" | "span";
}
export function SectionLabel({ children, className, as: Tag = "p" }: SectionLabelProps) {
  return (
    <Tag className={cn("vhub-label", className)}>
      {children}
    </Tag>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CLASS: Record<string, string> = {
  active:    "status-active",
  scheduled: "status-active",
  planned:   "status-planned",
  completed: "status-completed",
  cancelled: "status-cancelled",
  archived:  "status-planned",
};
interface StatusBadgeProps {
  status: string;
  className?: string;
}
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      "vhub-badge capitalize",
      STATUS_CLASS[status.toLowerCase()] ?? "status-planned",
      className
    )}>
      {status}
    </span>
  );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  platform_owner:   "Dono da Plataforma",
  studio_admin:     "Admin do Estúdio",
  diretor:          "Diretor",
  dublador:         "Dublador",
};
const ROLE_CLASS: Record<string, string> = {
  platform_owner:   "bg-rose-500/12 text-rose-400 border border-rose-500/25",
  studio_admin:     "bg-blue-500/12 text-blue-400 border border-blue-500/25",
  diretor:          "bg-amber-500/12 text-amber-400 border border-amber-500/25",
  dublador:         "bg-violet-500/12 text-violet-400 border border-violet-500/25",
};
interface RoleBadgeProps {
  role: string;
  className?: string;
}
export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span className={cn(
      "vhub-badge",
      ROLE_CLASS[role] ?? "bg-muted text-muted-foreground border border-border/40",
      className
    )}>
      {ROLE_LABEL[role] ?? role.replace(/_/g, " ")}
    </span>
  );
}

// ─── Field Group ──────────────────────────────────────────────────────────────
interface FieldGroupProps {
  label: string;
  children: ReactNode;
  className?: string;
}
export function FieldGroup({ label, children, className }: FieldGroupProps) {
  return (
    <div className={cn("vhub-field", className)}>
      <label className="vhub-field-label">{label}</label>
      {children}
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-border/50 my-1", className)} />;
}

// ─── Loading Rows ────────────────────────────────────────────────────────────
export function LoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-border/40">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <div className="w-8 h-8 rounded-full shimmer shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 rounded shimmer" />
            <div className="h-2 w-24 rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Grid Skeleton ────────────────────────────────────────────────────────────
export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="vhub-card h-40 shimmer" />
      ))}
    </>
  );
}

// ─── Card Section (header + content) ─────────────────────────────────────────
interface CardSectionProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}
export function CardSection({ title, icon, action, children, className }: CardSectionProps) {
  return (
    <div className={cn("vhub-card overflow-hidden", className)}>
      <div className="vhub-card-header">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          {icon}
          {title}
        </div>
        {action && <div className="text-xs text-muted-foreground">{action}</div>}
      </div>
      <div className="vhub-card-body">{children}</div>
    </div>
  );
}

// ─── Icon Button ──────────────────────────────────────────────────────────────
interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  label?: string;
  size?: number;
  className?: string;
  "data-testid"?: string;
}
export function IconButton({ icon: Icon, onClick, label, size = 14, className, ...rest }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground",
        "hover:text-foreground hover:bg-muted/60 transition-colors press-effect",
        className
      )}
      {...rest}
    >
      <Icon size={size} />
    </button>
  );
}

// ─── Inline Code ─────────────────────────────────────────────────────────────
export function InlineCode({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <code className={cn("font-mono text-xs bg-muted/60 px-1.5 py-0.5 rounded", className)}>
      {children}
    </code>
  );
}
