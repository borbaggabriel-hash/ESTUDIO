import React from "react";

interface StudioLayoutProps {
  studioId: string;
  children: React.ReactNode;
}

export function StudioLayout({ studioId, children }: StudioLayoutProps) {

  return (
    <>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Pular para o conteúdo principal
      </a>
      <div className="flex min-h-screen w-full bg-background text-foreground relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/12 via-background to-background"></div>
        <div className="absolute -top-28 right-[-12rem] w-[34rem] h-[34rem] rounded-full bg-primary/10 blur-3xl opacity-70" />
        <div className="absolute -bottom-24 left-[-8rem] w-[26rem] h-[26rem] rounded-full bg-primary/8 blur-3xl opacity-70" />
      </div>

      <div className="flex flex-col flex-1 w-full overflow-hidden min-w-0 relative z-10">
        <main id="main-content" className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-6 py-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
    </>
  );
}
