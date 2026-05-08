import { memo, useState } from "react";
import { useSessions } from "@studio/hooks/use-sessions";
import { useStudio } from "@studio/hooks/use-studios";
import { useStudioRole } from "@studio/hooks/use-studio-role";
import { useAuth } from "@studio/hooks/use-auth";
import { useMtgJob } from "@studio/hooks/use-mtg-job";
import { SessionCard } from "@studio/components/dashboard/session-card";
import { PageSection } from "@studio/components/ui/design-system";
import { Button } from "@studio/components/ui/button";
import { Calendar, PlayCircle, LogOut, Loader2, Shield, Clapperboard, Download, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { pt } from "@studio/lib/i18n";
import { isSessionVisibleOnDashboard } from "@studio/lib/session-status";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { ptBR } from "date-fns/locale";

const MTG_ETAPA_LABEL: Record<string, string> = {
  demucs: "Separando M&E com IA (Demucs)...",
  demucs_concluido: "Separação M&E concluída",
  combo_mix: "Mixando takes com M&E...",
  processando: "Processando pipeline de qualidade...",
  exportado: "Exportando vídeo final...",
  erro: "Erro no processamento",
  iniciando: "Iniciando pipeline...",
};

const Dashboard = memo(function Dashboard({ studioId }: { studioId: string }) {
  const studio = useStudio(studioId);
  const { data: sessions } = useSessions(studioId);
  const { canCreateProductions, canCreateSessions, hasMinRole } = useStudioRole(studioId);
  const canAccessStudioAdmin = hasMinRole("studio_admin");
  const canFinalize = hasMinRole("diretor");
  const { logout, isLoggingOut } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const { state: mtg, jobId: mtgJobId, startFinalize, reset: resetMtg, isActive, isDone, isError } = useMtgJob();

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
            <div className="md:w-[40%] flex-shrink-0 mx-auto md:mx-0 flex justify-center">
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

            <div className="md:w-[60%] flex-1 flex flex-col min-w-0">
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

        {/* Pós-Produção MTG-STUDIO */}
        {canFinalize && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
              <Clapperboard className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Pós-Produção</h3>
              <p className="text-xs text-muted-foreground">Finalizar sessão com MTG-STUDIO — limpeza de voz, mix M&E e export cinema</p>
            </div>
          </div>

          {mtg.status === "idle" && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <select
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 pr-8 text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Selecionar sessão...</option>
                  {(sessions || []).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} — {new Date(s.scheduledAt).toLocaleDateString("pt-BR")}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <Button
                size="sm"
                disabled={!selectedSessionId}
                onClick={() => startFinalize(selectedSessionId)}
                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Clapperboard className="w-4 h-4" />
                Finalizar Sessão
              </Button>
            </div>
          )}

          {(isActive || mtg.status === "uploading") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {MTG_ETAPA_LABEL[mtg.etapa] || mtg.mensagem || "Processando..."}
                </span>
                <span className="font-semibold tabular-nums text-foreground">{mtg.percentual}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-500"
                  style={{ width: `${Math.max(2, mtg.percentual)}%` }}
                />
              </div>
              {mtg.mensagem && mtg.etapa !== "demucs" && (
                <p className="text-xs text-muted-foreground truncate">{mtg.mensagem}</p>
              )}
            </div>
          )}

          {isDone && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Pós-produção concluída!
              </div>
              <div className="flex flex-wrap gap-2">
                {mtg.combosResults.filter(c => c.output_file).map((combo, i) => (
                  <a
                    key={i}
                    href={`/api/mtg/job/${mtgJobId}/download/${combo.output_file}`}
                    download={combo.output_file}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-100 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {combo.label || combo.output_file}
                  </a>
                ))}
              </div>
              <button onClick={resetMtg} className="text-xs text-muted-foreground hover:text-foreground underline">
                Nova pós-produção
              </button>
            </div>
          )}

          {isError && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-destructive font-medium">
                <AlertCircle className="w-4 h-4" />
                {mtg.error || "Erro no processamento"}
              </div>
              <button onClick={resetMtg} className="text-xs text-muted-foreground hover:text-foreground underline">
                Tentar novamente
              </button>
            </div>
          )}
        </div>
        )}
      </div>
    </PageSection>

  );
});

export default Dashboard;
