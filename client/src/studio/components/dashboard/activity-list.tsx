import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import { EmptyState } from "@studio/components/ui/design-system";

interface ActivityItem {
  id: string;
  action: string;
  createdAt: string;
  userId?: string;
}

export function ActivityList({ activities }: { activities: ActivityItem[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="py-6 flex flex-col items-center gap-2">
        <Activity className="h-5 w-5 text-muted-foreground/25" />
        <p className="vhub-caption">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0 -mx-1">
      {activities.slice(0, 8).map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-2.5 py-2.5 px-1 rounded-lg hover:bg-muted/30 transition-colors"
        >
          <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[8px] font-bold text-primary uppercase">
              {activity.action[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground/75 truncate">{activity.action}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
