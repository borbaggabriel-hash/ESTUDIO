import { useState } from "react";
import { useAuth } from "@studio/hooks/use-auth";
import { useStudios } from "@studio/hooks/use-studios";
import { Link, useLocation } from "wouter";
import { Building2, Loader2, ArrowRight, LogOut, Plus, Copy, Check, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { pt } from "@studio/lib/i18n";
import { RoleBadge } from "@studio/components/ui/design-system";
import { Button } from "@studio/components/ui/button";
import { Input } from "@studio/components/ui/input";
import { Label } from "@studio/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@studio/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@studio/lib/auth-fetch";
import { useToast } from "@studio/hooks/use-toast";

export default function StudioSelect() {
  const { user, isLoading: userLoading, logout } = useAuth();
  const { data: studios, isLoading: studiosLoading } = useStudios();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [studioName, setStudioName] = useState("");
  const [credentials, setCredentials] = useState<{ email: string; password: string; studioName: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      authFetch("/api/admin/create-studio-with-admin", {
        method: "POST",
        body: JSON.stringify({ name }),
      }) as Promise<{ studio: any; adminEmail: string; adminPassword: string }>,
    onSuccess: (data) => {
      setCreateOpen(false);
      setStudioName("");
      setCredentials({ email: data.adminEmail, password: data.adminPassword, studioName: data.studio.name });
      qc.invalidateQueries({ queryKey: ["/api/studios"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "Erro ao criar estudio", variant: "destructive" });
    },
  });

  const copyToClipboard = async (text: string, field: "email" | "password") => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  if (userLoading || studiosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/4 blur-[140px] rounded-full" />
      </div>

      <header className="relative z-10 vhub-topnav px-8 h-14">
        <div className="flex items-center gap-2.5 flex-1">
          <span className="font-black text-xl tracking-tight font-poppins text-gray-900">THE HUB</span>
        </div>
        <div className="flex items-center gap-2">
          {user.role === "platform_owner" && (
            <Button
              size="sm"
              className="gap-1.5 h-7 text-xs"
              onClick={() => setCreateOpen(true)}
              data-testid="button-create-studio"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar Estudio
            </Button>
          )}
          <button
            onClick={logout}
            className="vhub-btn-ghost vhub-btn-xs gap-1.5"
            data-testid="button-logout"
          >
            <LogOut className="h-3.5 w-3.5" />
            {pt.auth.signOut}
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-8 pt-16 pb-12 page-enter">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="vhub-label-accent mb-3">
              {pt.common.welcomeBack}, {(user?.email ?? user?.displayName ?? user?.firstName ?? "Usuario").split("@")[0]}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground" data-testid="text-studios-title">{pt.studio.yourStudios}</h1>
          </div>

        </div>

        {!studios?.length ? (
          <div className="vhub-card-glass rounded-2xl p-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold text-foreground mb-1" data-testid="text-no-studios">
              {user.role === "platform_owner" ? pt.studio.noStudios : pt.studio.noStudiosUser}
            </h3>
            <p className="vhub-body text-muted-foreground">
              {user.role === "platform_owner"
                ? "Crie estudios pelo painel administrativo."
                : pt.studio.noStudiosUserDesc}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studios.map((studio) => (
              <Link
                key={studio.id}
                href={`/hub-dub/studio/${studio.id}/dashboard`}
                className="block group"
                data-testid={`card-studio-${studio.id}`}
              >
                <div className="vhub-card-glass rounded-2xl p-6 h-full cursor-pointer transition-all duration-150 ease-out hover:border-primary/20 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] hover:scale-[1.008] active:scale-[0.997] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-105">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 text-lg">{studio.name}</h3>
                  {(studio as any).userRoles?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(studio as any).userRoles.map((r: string) => (
                        <RoleBadge key={r} role={r} />
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors duration-200">
                    {pt.studio.openWorkspace}
                    <ArrowRight className="w-3.5 h-3.5 translate-x-0 group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      {/* Dialog — criar estudio */}
      <Dialog open={createOpen} onOpenChange={v => { if (!v) { setCreateOpen(false); setStudioName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Estudio</DialogTitle>
            <DialogDescription>Informe o nome do estudio. Um email e senha de administrador serao gerados automaticamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="studio-name">Nome do Estudio *</Label>
              <Input
                id="studio-name"
                value={studioName}
                onChange={e => setStudioName(e.target.value)}
                placeholder="Ex: FanDub Brasil"
                onKeyDown={e => { if (e.key === "Enter" && studioName.trim()) createMutation.mutate(studioName.trim()); }}
                data-testid="input-new-studio-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setStudioName(""); }}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate(studioName.trim())}
              disabled={!studioName.trim() || createMutation.isPending}
              data-testid="button-confirm-create-studio"
            >
              {createMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Criando...</> : "Criar Estudio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — credenciais geradas */}
      <Dialog open={!!credentials} onOpenChange={v => { if (!v) { setCredentials(null); setShowPassword(false); setCopied(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Estudio criado com sucesso!</DialogTitle>
            <DialogDescription>Credenciais do administrador de <strong>{credentials?.studioName}</strong>. Anote agora — a senha nao sera exibida novamente.</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Guarde estas credenciais em um local seguro antes de fechar.</span>
          </div>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email do Admin</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={credentials?.email ?? ""} className="font-mono text-sm" />
                <Button
                  size="icon"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => copyToClipboard(credentials?.email ?? "", "email")}
                  data-testid="button-copy-email"
                >
                  {copied === "email" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Senha</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    readOnly
                    type={showPassword ? "text" : "password"}
                    value={credentials?.password ?? ""}
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => copyToClipboard(credentials?.password ?? "", "password")}
                  data-testid="button-copy-password"
                >
                  {copied === "password" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => { setCredentials(null); setShowPassword(false); setCopied(null); }} data-testid="button-close-credentials">
              Ja anotei, fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
