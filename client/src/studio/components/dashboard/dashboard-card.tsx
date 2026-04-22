import { ReactNode } from "react";
import { cn } from "@studio/lib/utils";

interface DashboardCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  noPadding?: boolean;
}

export function DashboardCard({ title, icon, children, className, headerAction, noPadding }: DashboardCardProps) {
  return (
    <div className={cn("vhub-card overflow-hidden", className)}>
      <div className="vhub-card-header">
        <div className="flex items-center gap-2 vhub-card-title">
          {icon}
          {title}
        </div>
        {headerAction}
      </div>
      <div className={cn(noPadding ? "" : "vhub-card-body")}>
        {children}
      </div>
    </div>
  );
}
