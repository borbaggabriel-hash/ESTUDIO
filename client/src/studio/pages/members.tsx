import { useState, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@studio/lib/auth-fetch";
import { Users, CheckCircle2, XCircle, Loader2, UserPlus, Pencil } from "lucide-react";
import { Button } from "@studio/components/ui/button";
import { Badge } from "@studio/components/ui/badge";
import { Checkbox } from "@studio/components/ui/checkbox";
import { Label } from "@studio/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@studio/components/ui/dialog";
import {
  PageSection, PageHeader, EmptyState, RoleBadge
} from "@studio/components/ui/design-system";
import { pt } from "@studio/lib/i18n";
import { useToast } from "@studio/hooks/use-toast";
import { useStudioRole } from "@studio/hooks/use-studio-role";

const STUDIO_ROLES = [
  { value: "diretor", label: pt.roles.diretor },
  { value: "dublador", label: pt.roles.dublador },
];

const Members = memo(function Members({ studioId }: { studioId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canManageMembers } = useStudioRole(studioId);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string[]>>({});
  const [editMember, setEditMember] = useState<any | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);

  const { data: members, isLoading } = useQuery({
    queryKey: ["/api/studios", studioId, "members"],
    queryFn: () => authFetch(`/api/studios/${studioId}/members`),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ membershipId, roles }: { membershipId: string; roles: string[] }) => {
      return authFetch(`/api/studios/${studioId}/members/${membershipId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studios", studioId, "members"] });
      toast({ title: "Membro aprovado" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      return authFetch(`/api/studios/${studioId}/members/${membershipId}/reject`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studios", studioId, "members"] });
      toast({ title: "Membro rejeitado" });
    },
  });

  const updateRolesMutation = useMutation({
    mutationFn: async ({ membershipId, roles }: { membershipId: string; roles: string[] }) => {
      return authFetch(`/api/studios/${studioId}/members/${membershipId}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studios", studioId, "members"] });
      setEditMember(null);
      toast({ title: "Papeis atualizados" });
    },
  });

  function toggleRole(membershipId: string, role: string) {
    setSelectedRoles(prev => {
      const current = prev[membershipId] || [];
      const updated = current.includes(role)
        ? current.filter(r => r !== role)
        : [...current, role];
      return { ...prev, [membershipId]: updated };
    });
  }

  const pendingMembers = members?.filter((m: any) => m.status === "pending") || [];
  const approvedMembers = members?.filter((m: any) => m.status === "approved") || [];

  return (
    <PageSection>
      <PageHeader title={pt.members.title} />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {pendingMembers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-500" />
                {pt.members.pendingMembers}
                <Badge variant="secondary" className="ml-1">{pendingMembers.length}</Badge>
              </h3>
              {pendingMembers.map((m: any) => (
                <div key={m.id} className="vhub-card p-4" data-testid={`pending-member-${m.id}`}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-500/15 ring-1 ring-amber-500/25 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                        {(m.user?.fullName || m.user?.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground truncate">
                          {m.user?.fullName || m.user?.displayName || m.user?.email}
                        </h4>
                        <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                        {m.user?.specialty && (
                          <p className="text-xs text-muted-foreground mt-0.5">{m.user.specialty}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pl-14">
                      {STUDIO_ROLES.map(r => (
                        <label key={r.value} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox
                            checked={(selectedRoles[m.id] || []).includes(r.value)}
                            onCheckedChange={() => toggleRole(m.id, r.value)}
                            data-testid={`check-role-${m.id}-${r.value}`}
                          />
                          <span className="text-xs text-foreground">{r.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pl-14">
                      <Button
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        disabled={!(selectedRoles[m.id]?.length) || approveMutation.isPending}
                        onClick={() => approveMutation.mutate({ membershipId: m.id, roles: selectedRoles[m.id] })}
                        data-testid={`button-approve-${m.id}`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {pt.members.approve}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs text-destructive"
                        disabled={rejectMutation.isPending}
                        onClick={() => rejectMutation.mutate(m.id)}
                        data-testid={`button-reject-${m.id}`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {pt.members.reject}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              {pt.members.approvedMembers}
              <Badge variant="secondary" className="ml-1">{approvedMembers.length}</Badge>
            </h3>
            {approvedMembers.length > 0 ? (
              <div className="vhub-card overflow-hidden">
                <div className="vhub-table-header">
                  <span className="vhub-col-label flex-1">Membro</span>
                  <span className="vhub-col-label">Email</span>
                  <span className="vhub-col-label">Papeis</span>
                  {canManageMembers && <span className="vhub-col-label w-10"></span>}
                </div>
                <div className="divide-y divide-border/40">
                  {approvedMembers.map((m: any) => {
                    const memberRoles: string[] = m.roles || (m.role ? [m.role] : []);
                    return (
                      <div key={m.id} className="vhub-table-row" data-testid={`approved-member-${m.id}`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {(m.user?.fullName || m.user?.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">
                            {m.user?.fullName || m.user?.displayName || m.user?.email}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{m.user?.email}</span>
                        <div className="flex flex-wrap gap-1">
                          {memberRoles.map(r => <RoleBadge key={r} role={r} />)}
                        </div>
                        {canManageMembers && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Editar papeis"
                            onClick={() => { setEditMember(m); setEditRoles(memberRoles); }}
                            data-testid={`button-edit-roles-${m.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Users className="w-5 h-5" />}
                title={pt.members.noMembers}
                description=""
              />
            )}
          </div>
        </div>
      )}

      <Dialog open={!!editMember} onOpenChange={v => { if (!v) setEditMember(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Papeis</DialogTitle>
            <DialogDescription>
              Selecione os papeis de {editMember?.user?.fullName || editMember?.user?.displayName || editMember?.user?.email} neste estudio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {STUDIO_ROLES.map(r => (
              <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={editRoles.includes(r.value)}
                  onCheckedChange={() => {
                    setEditRoles(prev =>
                      prev.includes(r.value)
                        ? prev.filter(x => x !== r.value)
                        : [...prev, r.value]
                    );
                  }}
                  data-testid={`check-edit-role-${r.value}`}
                />
                <Label className="cursor-pointer">{r.label}</Label>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>Cancelar</Button>
            <Button
              disabled={editRoles.length === 0 || updateRolesMutation.isPending}
              onClick={() => editMember && updateRolesMutation.mutate({ membershipId: editMember.id, roles: editRoles })}
              data-testid="button-save-roles"
            >
              {updateRolesMutation.isPending ? "Salvando..." : "Salvar Papeis"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageSection>
  );
});

export default Members;
