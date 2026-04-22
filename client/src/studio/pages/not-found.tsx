import { Link } from "wouter";
import { pt } from "@studio/lib/i18n";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center page-enter">
        <p className="text-8xl font-bold text-muted-foreground/15 tracking-tighter select-none mb-6 font-mono">
          404
        </p>
        <h1 className="vhub-page-title mb-2">{pt.common.notFound}</h1>
        <p className="vhub-page-subtitle !mt-0 mb-8">
          {pt.common.notFoundDesc}
        </p>
        <Link href="/hub-dub/studios">
          <button className="vhub-btn-md vhub-btn-primary press-effect" data-testid="button-go-home">
            Ir para Estudios
          </button>
        </Link>
      </div>
    </div>
  );
}
