import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { goBack } from "@/lib/memory-router";

export function BackButton() {
  useLocation();

  return (
    <div className="fixed left-4 top-[72px] z-[70]">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="rounded-full bg-background/70 backdrop-blur-xl border-border/60 shadow-sm hover:bg-background/80"
        onClick={() => goBack("/")}
        aria-label="Voltar"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </div>
  );
}
