import { ReactNode } from "react";
import { cn } from "@studio/lib/utils";
import { Badge } from "@studio/components/ui/badge";

// ─── Page Section ────────────────────────────────────────────────────────────
interface PageSectionProps {
  children: ReactNode;
  className?: string;
}
export function PageSection({ children, className }: PageSectionProps) {
  return (
    <div className={cn("space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500", className)}>
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
      <div className="space-y-1">
        {label && (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/90">
            {label}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-base text-muted-foreground/95 max-w-2xl">{subtitle}</p>}
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
    <div className={cn("rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md text-card-foreground shadow-sm p-6 transition-all duration-300 hover:bg-card hover:border-primary/20 hover:shadow-md", className)}>
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="h-8 w-8 rounded-full bg-primary/12 border border-primary/20 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      <div className={cn("text-2xl font-bold tracking-tight", valueClassName)}>
        {value}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
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
    <div className={cn("rounded-2xl border border-border/70 bg-card/70 backdrop-blur-md flex flex-col items-center justify-center py-16 px-8 text-center", className)}>
      <div className="w-12 h-12 rounded-full bg-muted/80 border border-border/70 flex items-center justify-center mb-4 text-muted-foreground">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground text-lg mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mt-1">{description}</p>
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
    <Tag className={cn("text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2", className)}>
      {children}
    </Tag>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    active: { label: "Ativo", variant: "default" },
    pending: { label: "Pendente", variant: "secondary" },
    inactive: { label: "Inativo", variant: "outline" },
    archived: { label: "Arquivado", variant: "outline" },
    error: { label: "Erro", variant: "destructive" },
  };

  const config = statusMap[status] || { label: status, variant: "outline" };

  return (
    <Badge variant={config.variant} className={cn("capitalize", className)}>
      {config.label}
    </Badge>
  );
}

// ─── Role Badge ──────────────────────────────────────────────────────────────
export function RoleBadge({ role, className }: { role: string; className?: string }) {
  const roleMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    platform_owner: { label: "Dono da Plataforma", variant: "destructive" },
    diretor: { label: "Diretor", variant: "secondary" },
    dublador: { label: "Dublador", variant: "outline" },
  };

  const config = roleMap[role] || { label: role, variant: "outline" };

  return (
    <Badge variant={config.variant} className={cn("uppercase text-[10px] tracking-wider font-medium px-2 py-0.5 rounded-full", className)}>
      {config.label}
    </Badge>
  );
}

// ─── Field Group ─────────────────────────────────────────────────────────────
interface FieldGroupProps {
  label: string;
  children: ReactNode;
  className?: string;
  error?: string;
}
export function FieldGroup({ label, children, className, error }: FieldGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Grid Skeleton ───────────────────────────────────────────────────────────
export function GridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/70 bg-card/60 h-[120px] animate-pulse" />
      ))}
    </div>
  );
}

// ─── Loading Rows ────────────────────────────────────────────────────────────
export function LoadingRows({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-12 w-full rounded-md bg-muted/40 animate-pulse" />
      ))}
    </div>
  );
}
