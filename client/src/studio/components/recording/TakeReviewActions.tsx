import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@studio/lib/auth-fetch";
import { useToast } from "@studio/hooks/use-toast";
import { CheckCircle2, XCircle } from "lucide-react";

interface TakeReviewActionsProps {
  takeId: string;
  currentStatus: string;
  sessionId: string;
}

export function TakeReviewActions({ 
  takeId, 
  currentStatus,
  sessionId
}: TakeReviewActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [feedbackMode, setFeedbackMode] = useState<'approve' | 'reject' | null>(null);
  const [feedback, setFeedback] = useState("");
  const [setAsFinal, setSetAsFinal] = useState(false);
  
  const approveMutation = useMutation({
    mutationFn: async () => {
      return authFetch(`/api/takes/${takeId}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ feedback, setAsFinal }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Take Aprovado ✅",
        description: setAsFinal 
          ? "Take marcado como versão final. Outros takes desta linha foram marcados como superseded."
          : "O dublador foi notificado da aprovação.",
      });
      setFeedbackMode(null);
      setFeedback("");
      setSetAsFinal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "takes"] });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao aprovar take",
        description: err?.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });
  
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!feedback.trim()) {
        throw new Error("Feedback é obrigatório ao rejeitar um take");
      }
      return authFetch(`/api/takes/${takeId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ feedback }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Take Rejeitado ❌",
        description: "O dublador foi notificado e pode regravar.",
      });
      setFeedbackMode(null);
      setFeedback("");
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "takes"] });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao rejeitar take",
        description: err?.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });
  
  if (currentStatus !== "pending") {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {currentStatus === "approved" && (
          <>
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span>Aprovado</span>
          </>
        )}
        {currentStatus === "rejected" && (
          <>
            <XCircle className="w-3 h-3 text-red-500" />
            <span>Rejeitado</span>
          </>
        )}
        {currentStatus === "superseded" && (
          <span className="text-muted-foreground">Substituído</span>
        )}
      </div>
    );
  }
  
  if (feedbackMode) {
    return (
      <div className="space-y-2 border rounded-lg p-3" style={{ background: "hsl(var(--muted) / 0.3)", borderColor: "hsl(var(--border) / 0.8)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.85)" }}>
            {feedbackMode === 'approve' ? '✅ Aprovar Take' : '❌ Rejeitar Take'}
          </span>
          <button
            onClick={() => {
              setFeedbackMode(null);
              setFeedback("");
              setSetAsFinal(false);
            }}
            className="text-xs px-2 py-0.5 rounded transition-colors"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Cancelar
          </button>
        </div>
        
        <textarea
          placeholder={
            feedbackMode === 'approve'
              ? "Feedback opcional (ex: 'Excelente entonação!')"
              : "Explique o que precisa ser corrigido (obrigatório)"
          }
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          className="w-full text-sm px-3 py-2 rounded border resize-none"
          style={{ 
            background: "hsl(var(--muted) / 0.4)", 
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--foreground) / 0.85)"
          }}
        />
        
        {feedbackMode === 'approve' && (
          <label className="flex items-center gap-2 text-xs" style={{ color: "hsl(var(--foreground) / 0.70)" }}>
            <input
              type="checkbox"
              checked={setAsFinal}
              onChange={(e) => setSetAsFinal(e.target.checked)}
              className="rounded accent-amber-500"
            />
            <span>Marcar como versão final (substitui outros takes desta linha)</span>
          </label>
        )}
        
        <button
          onClick={() => {
            if (feedbackMode === 'approve') {
              approveMutation.mutate();
            } else {
              rejectMutation.mutate();
            }
          }}
          disabled={
            (feedbackMode === 'reject' && !feedback.trim()) ||
            approveMutation.isPending ||
            rejectMutation.isPending
          }
          className="w-full px-3 py-2 text-sm rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            background: feedbackMode === 'approve' ? "hsl(var(--primary))" : "hsl(0 72% 50%)",
            color: "white"
          }}
        >
          {approveMutation.isPending || rejectMutation.isPending
            ? "Processando..."
            : feedbackMode === 'approve'
            ? "Confirmar Aprovação"
            : "Confirmar Rejeição"}
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setFeedbackMode('approve')}
        className="flex-1 px-3 py-2.5 text-xs rounded border transition-colors min-h-[44px]"
        style={{ 
          color: "hsl(160 84% 39%)",
          borderColor: "hsl(160 84% 39% / 0.3)",
          background: "hsl(160 84% 39% / 0.05)"
        }}
      >
        <CheckCircle2 className="w-4 h-4 mr-1 inline" />
        Aprovar
      </button>
      <button
        onClick={() => setFeedbackMode('reject')}
        className="flex-1 px-3 py-2.5 text-xs rounded border transition-colors min-h-[44px]"
        style={{ 
          color: "hsl(0 72% 50%)",
          borderColor: "hsl(0 72% 50% / 0.3)",
          background: "hsl(0 72% 50% / 0.05)"
        }}
      >
        <XCircle className="w-4 h-4 mr-1 inline" />
        Rejeitar
      </button>
    </div>
  );
}
