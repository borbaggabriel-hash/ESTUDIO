import { memo, useState } from "react";
import { useSessions } from "@studio/hooks/use-sessions";
import { useStudio } from "@studio/hooks/use-studios";
import { useStudioRole } from "@studio/hooks/use-studio-role";
import { useAuth } from "@studio/hooks/use-auth";
import { SessionCard } from "@studio/components/dashboard/session-card";
import { PageSection } from "@studio/components/ui/design-system";
import { Button } from "@studio/components/ui/button";
import { Calendar, PlayCircle, LogOut, Loader2, Shield } from "lucide-react";
import { Link } from "wouter";
import { pt } from "@studio/lib/i18n";
import { isSessionVisibleOnDashboard } from "@studio/lib/session-status";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { ptBR } from "date-fns/locale";

const Dashboard = memo(function Dashboard({ studioId }: { studioId: string }) {
  const studio = useStudio(studioId);
  const { data: sessions } = useSessions(studioId);
  const { canCreateProductions, canCreateSessions, hasMinRole } = useStudioRole(studioId);
  const canAccessStudioAdmin = hasMinRole("studio_admin");
  const { logout, isLoggingOut } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const upcomingSessions = (sessions || []).filter(s =>
    isSessionVisibleOnDashboard(s.scheduledAt, s.durationMinutes ?? 60)
  ).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const sessionsOnSelectedDate = upcomingSessions.filter(s => 
    selectedDate && new Date(s.scheduledAt).toDateString() === selectedDate.toDateString()
  );

  return (
    <PageSection className="max-w-[1600px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {studio?.name || pt.dashboard.title}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canAccessStudioAdmin && (
              <Link href={`/hub-dub/studio/${studioId}/admin`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  data-testid="button-studio-admin"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Painel Admin</span>
                </Button>
              </Link>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={logout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              <span className="hidden sm:inline">{isLoggingOut ? "Saindo..." : "Sair"}</span>
            </Button>
          </div>
        </div>

        {/* Calendar & Sessions */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 flex flex-col md:flex-row gap-6 transition-all duration-300 hover:border-primary/20 shadow-sm">
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                className="p-0 m-0"
                modifiers={{
                  hasSession: (date) => upcomingSessions.some(s => new Date(s.scheduledAt).toDateString() === date.toDateString())
                }}
                modifiersStyles={{
                  hasSession: { fontWeight: 'bold', color: 'hsl(var(--primary))', textDecoration: 'underline' }
                }}
                styles={{
                  caption: { color: 'hsl(var(--foreground))' },
                  head_cell: { color: 'hsl(var(--muted-foreground))' },
                  day: { color: 'hsl(var(--foreground))' },
                  nav_button: { color: 'hsl(var(--foreground))' },
                }}
              />
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <PlayCircle className="w-5 h-5 text-primary" />
                  Sessões
                </h3>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                {sessionsOnSelectedDate.length > 0 ? (
                  sessionsOnSelectedDate.map(session => (
                    <SessionCard key={session.id} session={session} studioId={studioId} />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground">
                    <Calendar className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm">Nenhuma sessão para este dia</p>
                  </div>
                )}
              </div>
            </div>
          </div>

      </div>
    </PageSection>

  );
});

export default Dashboard;
