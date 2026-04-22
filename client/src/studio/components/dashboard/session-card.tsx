import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { computeSessionStatus } from "@studio/lib/session-status";
import { StatusBadge } from "@studio/components/ui/design-system";

interface Session {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  status?: string;
}

export function SessionCard({ session, studioId }: { session: Session; studioId: string }) {
  const computedStatus = computeSessionStatus(session.scheduledAt, session.durationMinutes ?? 60);

  return (
    <Link
      href={`/hub-dub/studio/${studioId}/sessions/${session.id}/room`}
      className="flex items-center gap-2.5 p-3 rounded-lg bg-white/5 border border-white/8 cursor-pointer transition-all duration-150 ease-out hover:border-white/15 hover:bg-white/8 hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:scale-[1.008] active:scale-[0.997] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 no-underline"
      data-testid={`card-dashboard-session-${session.id}`}
    >
      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Calendar className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {format(new Date(session.scheduledAt), "dd/MM, HH:mm")}
        </p>
      </div>
      <StatusBadge status={computedStatus} className="ml-2 shrink-0" />
    </Link>
  );
}
