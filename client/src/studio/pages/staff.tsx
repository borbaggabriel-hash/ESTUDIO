import { useState, memo } from "react";
import { useStaff, useCreateStaff } from "@studio/hooks/use-staff";
import { Button } from "@studio/components/ui/button";
import { Input } from "@studio/components/ui/input";
import { Plus, Users } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@studio/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@studio/components/ui/select";
import {
  PageSection, PageHeader, EmptyState, RoleBadge, FieldGroup, LoadingRows
} from "@studio/components/ui/design-system";
import { pt } from "@studio/lib/i18n";

const Staff = memo(function Staff({ studioId }: { studioId: string }) {
  const { data: staff, isLoading } = useStaff(studioId);
  const createStaff = useCreateStaff(studioId);

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  const handleCreate = async () => {
    if (!name || !role) return;
    await createStaff.mutateAsync({ name, role });
    setIsOpen(false);
    setName("");
    setRole("");
  };

  return (
    <PageSection>
      <PageHeader
        title={pt.staff.title}
        subtitle="Gerencie membros e papeis do estudio"
        action={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 press-effect">
                <Plus className="w-3.5 h-3.5" />
                {pt.staff.addMember}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Membro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <FieldGroup label={pt.staff.name}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Maria Silva" />
                </FieldGroup>
                <FieldGroup label={pt.staff.role}>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar papel..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="voice_actor">{pt.roles.dublador}</SelectItem>
                      <SelectItem value="director">{pt.roles.diretor}</SelectItem>
                      <SelectItem value="studio_admin">{pt.roles.studio_admin}</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!name || !role || createStaff.isPending} className="press-effect">
                  {createStaff.isPending ? pt.staff.creating : pt.staff.create}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="vhub-card overflow-hidden">
        {isLoading ? (
          <LoadingRows count={4} />
        ) : staff?.length ? (
          <>
            <div className="vhub-table-header">
              <span className="vhub-col-label flex-1">Membro</span>
              <span className="vhub-col-label">{pt.staff.role}</span>
            </div>
            <div className="divide-y divide-border/40">
              {staff.map(member => (
                <div
                  key={member.id}
                  className="vhub-table-row transition-colors duration-150 hover:bg-muted/30"
                  data-testid={`row-staff-${member.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{member.name}</span>
                  </div>
                  <RoleBadge role={member.role} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Users className="w-5 h-5" />}
            title={pt.staff.noStaff}
            description={pt.staff.noStaffDesc}
          />
        )}
      </div>
    </PageSection>
  );
});

export default Staff;
