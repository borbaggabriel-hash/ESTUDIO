import { useState } from "react";
import { Button } from "@studio/components/ui/button";
import { Input } from "@studio/components/ui/input";
import { Textarea } from "@studio/components/ui/textarea";
import { Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@studio/components/ui/dialog";
import { FieldGroup } from "@studio/components/ui/design-system";
import { useToast } from "@studio/hooks/use-toast";

interface ProductionFormData {
  name: string;
  description: string;
  videoUrl: string;
  scriptJson: string;
  status: string;
  isPublic: boolean;
}

interface ProductionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductionFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function ProductionWizard({ open, onOpenChange, onSubmit, isSubmitting }: ProductionWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<ProductionFormData>({
    name: "",
    description: "",
    videoUrl: "",
    scriptJson: "",
    status: "planned",
    isPublic: false,
  });

  const updateField = (field: keyof ProductionFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Basic Info
        if (!formData.name.trim()) {
          toast({ title: "Nome obrigatório", description: "Por favor, preencha o nome da produção", variant: "destructive" });
          return false;
        }
        return true;
      case 1: // Video
        if (!formData.videoUrl.trim()) {
          toast({ title: "URL do vídeo obrigatória", description: "Por favor, insira a URL do vídeo", variant: "destructive" });
          return false;
        }
        try {
          new URL(formData.videoUrl);
        } catch {
          toast({ title: "URL inválida", description: "Por favor, insira uma URL válida", variant: "destructive" });
          return false;
        }
        return true;
      case 2: // Script (optional)
        if (formData.scriptJson.trim()) {
          try {
            JSON.parse(formData.scriptJson);
          } catch {
            toast({ title: "JSON inválido", description: "O roteiro deve ser um JSON válido", variant: "destructive" });
            return false;
          }
        }
        return true;
      case 3: // Finalize
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        name: "",
        description: "",
        videoUrl: "",
        scriptJson: "",
        status: "planned",
        isPublic: false,
      });
      setCurrentStep(0);
      onOpenChange(false);
    } catch (err: any) {
      toast({ 
        title: "Erro ao criar produção", 
        description: err.message || "Tente novamente", 
        variant: "destructive" 
      });
    }
  };

  const steps = [
    { title: "Informações", description: "Nome e descrição" },
    { title: "Vídeo", description: "URL de referência" },
    { title: "Roteiro", description: "Script JSON (opcional)" },
    { title: "Finalizar", description: "Revisar e criar" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Produção - {steps[currentStep].title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-colors ${
                idx < currentStep ? "bg-primary text-primary-foreground" :
                idx === currentStep ? "bg-primary/20 text-primary border-2 border-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {idx < currentStep ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                  idx < currentStep ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-4 py-4">
          {currentStep === 0 && (
            <>
              <FieldGroup label="Nome da Produção *">
                <Input
                  placeholder="ex: Episódio 1 — Dragão"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  data-testid="wizard-name"
                />
              </FieldGroup>
              <FieldGroup label="Descrição">
                <Textarea
                  placeholder="Detalhes da produção..."
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="resize-none"
                  rows={4}
                  data-testid="wizard-description"
                />
              </FieldGroup>
              <FieldGroup label="Status">
                <select
                  value={formData.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="w-full h-10 rounded-lg px-3 text-sm bg-muted/50 border border-border text-foreground focus:border-primary outline-none"
                  data-testid="wizard-status"
                >
                  <option value="planned">Planejado</option>
                  <option value="in_progress">Em Progresso</option>
                  <option value="completed">Completo</option>
                </select>
              </FieldGroup>
            </>
          )}

          {currentStep === 1 && (
            <>
              <FieldGroup label="URL do Vídeo de Referência *">
                <Input
                  placeholder="https://..."
                  value={formData.videoUrl}
                  onChange={(e) => updateField("videoUrl", e.target.value)}
                  data-testid="wizard-video-url"
                />
              </FieldGroup>
              {formData.videoUrl && (
                <div className="rounded-lg border border-border p-4 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <div className="aspect-video bg-black/5 rounded flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      {formData.videoUrl.includes("youtube") || formData.videoUrl.includes("youtu.be") 
                        ? "YouTube video" 
                        : "Video URL"}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {currentStep === 2 && (
            <>
              <FieldGroup label="Roteiro (JSON)">
                <Textarea
                  placeholder='[{"character": "Personagem", "start": "00:00:01", "text": "Fala..."}]'
                  value={formData.scriptJson}
                  onChange={(e) => updateField("scriptJson", e.target.value)}
                  className="resize-none font-mono text-xs"
                  rows={12}
                  data-testid="wizard-script"
                />
              </FieldGroup>
              <p className="text-xs text-muted-foreground">
                Opcional: Você pode adicionar o roteiro depois. Formato esperado: array de objetos com character, start, text.
              </p>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className="space-y-4">
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Resumo da Produção</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nome:</span>
                      <p className="font-medium">{formData.name}</p>
                    </div>
                    {formData.description && (
                      <div>
                        <span className="text-muted-foreground">Descrição:</span>
                        <p className="text-sm">{formData.description}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Vídeo:</span>
                      <p className="text-xs truncate">{formData.videoUrl}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Roteiro:</span>
                      <p className="text-xs">{formData.scriptJson ? "Incluído" : "Não incluído"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <p className="text-xs capitalize">{formData.status}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.isPublic}
                    onChange={(e) => updateField("isPublic", e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                    data-testid="wizard-is-public"
                  />
                  <label htmlFor="isPublic" className="text-sm cursor-pointer">
                    <span className="font-medium">Tornar esta produção pública</span>
                    <p className="text-xs text-muted-foreground">
                      Outros estúdios poderão criar sessões usando esta produção
                    </p>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0 || isSubmitting}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>

          <div className="text-xs text-muted-foreground">
            Etapa {currentStep + 1} de {steps.length}
          </div>

          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext} disabled={isSubmitting} className="gap-2">
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Criando..." : "Criar Produção"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
