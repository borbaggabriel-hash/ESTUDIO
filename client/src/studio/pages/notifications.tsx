import { memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@studio/lib/auth-fetch";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@studio/components/ui/button";
import {
  PageSection, PageHeader, EmptyState
} from "@studio/components/ui/design-system";
import { pt } from "@studio/lib/i18n";
import { Badge } from "@studio/components/ui/badge";

const Notifications = memo(function Notifications({ studioId }: { studioId: string }) {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: () => authFetch("/api/notifications"),
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await authFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  return (
    <PageSection>
      <PageHeader title={pt.notifications.title} />

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications?.length ? (
          notifications.map((n: any) => (
            <div
              key={n.id}
              className={`vhub-card-clickable p-4 flex items-start gap-4 ${n.isRead ? "opacity-60" : ""}`}
              data-testid={`notification-${n.id}`}
              role="button"
              tabIndex={0}
              onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
              onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !n.isRead) { e.preventDefault(); markRead.mutate(n.id); } }}
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-foreground">{n.title}</h4>
                  {!n.isRead && (
                    <Badge variant="default" className="text-[10px] h-4 px-1.5">Novo</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">
                  {new Date(n.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
              {!n.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                  className="shrink-0 h-7 text-xs gap-1 relative z-10"
                  data-testid={`button-mark-read-${n.id}`}
                >
                  <Check className="w-3 h-3" />
                  {pt.notifications.markAsRead}
                </Button>
              )}
            </div>
          ))
        ) : (
          <EmptyState
            icon={<Bell className="w-5 h-5" />}
            title={pt.notifications.noNotifications}
            description=""
          />
        )}
      </div>
    </PageSection>
  );
});

export default Notifications;
