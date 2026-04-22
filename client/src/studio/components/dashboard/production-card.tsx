import { Film } from "lucide-react";
import { Link } from "wouter";

interface Production {
  id: string;
  name: string;
}

export function ProductionCard({ production, studioId }: { production: Production; studioId: string }) {
  return (
    <Link
      href={`/hub-dub/studio/${studioId}/sessions?productionId=${production.id}`}
      className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/8 cursor-pointer transition-all duration-150 ease-out hover:border-white/15 hover:bg-white/8 hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:scale-[1.008] active:scale-[0.997] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 no-underline"
      data-testid={`card-dashboard-production-${production.id}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Film className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-medium text-foreground truncate">{production.name}</span>
      </div>
    </Link>
  );
}
