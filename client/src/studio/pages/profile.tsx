import { useState, memo } from "react";
import { useAuth } from "@studio/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@studio/lib/auth-fetch";
import { useToast } from "@studio/hooks/use-toast";
import { Button } from "@studio/components/ui/button";
import { Input } from "@studio/components/ui/input";
import { Textarea } from "@studio/components/ui/textarea";
import { Label } from "@studio/components/ui/label";
import { Badge } from "@studio/components/ui/badge";
import { Loader2, UserCircle, Save } from "lucide-react";
import { pt } from "@studio/lib/i18n";
import { PageSection, PageHeader, RoleBadge } from "@studio/components/ui/design-system";

const Profile = memo(function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    displayName: user?.displayName || "",
    artistName: user?.artistName || "",
    phone: user?.phone || "",
    city: user?.city || "",
    state: user?.state || "",
    bio: user?.bio || "",
    experience: user?.experience || "",
    specialty: user?.specialty || "",
    mainLanguage: user?.mainLanguage || "",
    portfolioUrl: user?.portfolioUrl || "",
  });

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: () => authFetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Perfil atualizado com sucesso" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err?.message, variant: "destructive" });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const initials = (user.firstName && user.lastName)
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : (user.displayName || user.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <PageSection>
        <PageHeader
          label="Conta"
          title={pt.nav.profile}
          subtitle="Gerencie suas informacoes pessoais e profissionais"
        />

        <div className="max-w-2xl space-y-6">
          <div className="vhub-card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/15 ring-2 ring-primary/30 flex items-center justify-center text-primary font-bold text-xl shrink-0" data-testid="avatar-initials">
                {initials}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground" data-testid="text-display-name">
                  {user.fullName || user.displayName || user.email}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground" data-testid="text-email">{user.email}</span>
                  <RoleBadge role={user.role || "user"} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={form.firstName}
                  onChange={e => update("firstName", e.target.value)}
                  placeholder="Seu nome"
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sobrenome</Label>
                <Input
                  value={form.lastName}
                  onChange={e => update("lastName", e.target.value)}
                  placeholder="Seu sobrenome"
                  data-testid="input-last-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nome de exibicao</Label>
                <Input
                  value={form.displayName}
                  onChange={e => update("displayName", e.target.value)}
                  placeholder="Como sera exibido na plataforma"
                  data-testid="input-display-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nome artistico</Label>
                <Input
                  value={form.artistName}
                  onChange={e => update("artistName", e.target.value)}
                  placeholder="Nome artistico (opcional)"
                  data-testid="input-artist-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  value={form.phone}
                  onChange={e => update("phone", e.target.value)}
                  placeholder="(11) 99999-9999"
                  data-testid="input-phone"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Idioma principal</Label>
                <Input
                  value={form.mainLanguage}
                  onChange={e => update("mainLanguage", e.target.value)}
                  placeholder="ex: Portugues Brasileiro"
                  data-testid="input-main-language"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input
                  value={form.city}
                  onChange={e => update("city", e.target.value)}
                  placeholder="Sua cidade"
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Input
                  value={form.state}
                  onChange={e => update("state", e.target.value)}
                  placeholder="SP, RJ, MG..."
                  data-testid="input-state"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Especialidade</Label>
                <Input
                  value={form.specialty}
                  onChange={e => update("specialty", e.target.value)}
                  placeholder="ex: dublador, ator, narrador"
                  data-testid="input-specialty"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Portfolio URL</Label>
                <Input
                  value={form.portfolioUrl}
                  onChange={e => update("portfolioUrl", e.target.value)}
                  placeholder="https://seu-portfolio.com"
                  data-testid="input-portfolio-url"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Experiencia profissional</Label>
                <Input
                  value={form.experience}
                  onChange={e => update("experience", e.target.value)}
                  placeholder="Descreva sua experiencia"
                  data-testid="input-experience"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Mini biografia</Label>
                <Textarea
                  value={form.bio}
                  onChange={e => update("bio", e.target.value)}
                  placeholder="Conte um pouco sobre voce..."
                  rows={3}
                  data-testid="input-bio"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="gap-2"
                data-testid="button-save-profile"
              >
                {saveMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Save className="w-4 h-4" />}
                {saveMutation.isPending ? "Salvando..." : "Salvar Alteracoes"}
              </Button>
            </div>
          </div>

          <div className="vhub-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Informacoes da conta</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium text-foreground" data-testid="readonly-email">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Funcao na plataforma</span>
                <RoleBadge role={user.role || "user"} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status da conta</span>
                <Badge variant={user.status === "approved" ? "default" : "secondary"}>
                  {user.status === "approved" ? "Ativo" : user.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </PageSection>
    </div>
  );
});

export default Profile;
