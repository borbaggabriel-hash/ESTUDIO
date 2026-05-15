import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@studio/hooks/use-auth";
import { usePublicStudios } from "@studio/hooks/use-public-studios";
import { Input } from "@studio/components/ui/input";
import { useToast } from "@studio/hooks/use-toast";
import { AppHeader } from "@/components/nav/AppHeader";
import { MeshGradient } from "@/components/landing/MeshGradient";

type Tab = "login" | "register";

export default function Login() {
  const [lang, setLang] = useState<"en" | "pt">(() => {
    const saved = localStorage.getItem("vhub_language");
    return saved === "pt" ? "pt" : "en";
  });

  const [activeTab, setActiveTab] = useState<Tab>("login");
  const [registerSuccess, setRegisterSuccess] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register form state
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regStudioId, setRegStudioId] = useState("");

  const { user, login, isLoggingIn, register, isRegistering } = useAuth();
  const { data: publicStudios, isLoading: isLoadingStudios } = usePublicStudios();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem("vhub_language", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (user) {
      setLocation("/hub-dub/studios", { replace: true });
    }
  }, [user, setLocation]);

  const tutorials = useMemo(() => {
    if (lang === "en") {
      return [
        {
          title: "Fast start in a session",
          items: [
            "Use SPACE to play/pause and keep your hand off the mouse.",
            "Use L to toggle loop on the current line and repeat takes faster.",
            "Use ←/→ to jump 2s for micro-adjustments.",
          ],
        },
        {
          title: "Best practices (quality + speed)",
          items: [
            "Record in headphones to avoid bleed and keep alignment clean.",
            "Keep input gain stable; avoid clipping and extreme fixes later.",
            "Prefer short loops over long playback to keep momentum.",
          ],
        },
        {
          title: "Text + timing workflow",
          items: [
            "If you can't click lines, ask for Text Control authorization.",
            "Edit only what's necessary and keep the original intent consistent.",
            "Work line-by-line and avoid random seeking.",
          ],
        },
      ];
    }
    return [
      {
        title: "Começo rápido na sessão",
        items: [
          "Use SPACE para play/pause e reduza o uso do mouse.",
          "Use L para alternar loop na fala atual e acelerar a repetição de takes.",
          "Use ←/→ para saltar 2s e fazer microajustes.",
        ],
      },
      {
        title: "Melhores práticas (qualidade + velocidade)",
        items: [
          "Grave com fones para evitar vazamento e manter o alinhamento limpo.",
          "Mantenha o ganho estável; evite clip e correções agressivas depois.",
          "Prefira loops curtos em vez de rodar trechos longos para manter o ritmo.",
        ],
      },
      {
        title: "Fluxo texto + timing",
        items: [
          "Se você não consegue clicar nas falas, peça autorização de Controle de Texto.",
          "Edite apenas o essencial; mantenha consistência entre takes e revisões.",
          "Trabalhe fala a fala; evite buscar aleatoriamente no vídeo.",
        ],
      },
    ];
  }, [lang]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const safeEmail = loginEmail.trim();
    if (!safeEmail || !loginPassword) {
      toast({ title: lang === "en" ? "Missing fields" : "Campos obrigatórios", variant: "destructive" });
      return;
    }
    login(
      { email: safeEmail, password: loginPassword },
      {
        onSuccess: () => {
          toast({ title: lang === "en" ? "Signed in" : "Login realizado" });
          setLocation("/hub-dub/studios", { replace: true });
        },
        onError: (err: any) => {
          toast({
            title: lang === "en" ? "Login failed" : "Falha no login",
            description: String(err?.message || (lang === "en" ? "Try again." : "Tente novamente.")),
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const safeEmail = regEmail.trim();
    const safeName = regFullName.trim();
    
    if (!safeEmail || !regPassword || !safeName) {
      toast({ 
        title: lang === "en" ? "Missing fields" : "Campos obrigatórios", 
        description: lang === "en" ? "Please fill in all required fields" : "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive" 
      });
      return;
    }
    
    if (regPassword.length < 6) {
      toast({ 
        title: lang === "en" ? "Password too short" : "Senha muito curta", 
        description: lang === "en" ? "Password must be at least 6 characters" : "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive" 
      });
      return;
    }

    register(
      { 
        email: safeEmail, 
        password: regPassword, 
        fullName: safeName,
        ...(regStudioId ? { studioId: regStudioId } : {}),
      },
      {
        onSuccess: () => {
          setRegisterSuccess(true);
        },
        onError: (err: any) => {
          toast({
            title: lang === "en" ? "Registration failed" : "Falha no cadastro",
            description: String(err?.message || (lang === "en" ? "Try again." : "Tente novamente.")),
            variant: "destructive",
          });
        },
      }
    );
  };

  const texts = {
    en: {
      login: "Sign In",
      register: "Create Account",
      email: "Email",
      password: "Password",
      fullName: "Full Name",
      studio: "Studio (optional)",
      selectStudio: "Select a studio",
      noStudio: "No studio",
      signIn: "Sign In",
      createAccount: "Create Account",
      signingIn: "Signing in...",
      creating: "Creating...",
      accessWorkspace: "Access your workspace",
      createWorkspace: "Create your account",
      tip: "Tip: if you can't control the script, ask a director/admin to grant Text Control.",
      haveAccount: "Already have an account?",
      noAccount: "Don't have an account?",
      clickHere: "Click here",
      successTitle: "Account created!",
      successMessage: "Your account has been created and is pending approval. You will be notified when approved.",
      backToLogin: "Back to login",
    },
    pt: {
      login: "Entrar",
      register: "Criar Conta",
      email: "Email",
      password: "Senha",
      fullName: "Nome Completo",
      studio: "Estúdio (opcional)",
      selectStudio: "Selecione um estúdio",
      noStudio: "Nenhum estúdio",
      signIn: "Entrar",
      createAccount: "Criar Conta",
      signingIn: "Entrando...",
      creating: "Criando...",
      accessWorkspace: "Acesse seu workspace",
      createWorkspace: "Crie sua conta",
      tip: "Dica: se você não consegue controlar o roteiro, peça para diretor/admin liberar o Controle de Texto.",
      haveAccount: "Já tem uma conta?",
      noAccount: "Não tem uma conta?",
      clickHere: "Clique aqui",
      successTitle: "Conta criada!",
      successMessage: "Sua conta foi criada e está aguardando aprovação. Você será notificado quando for aprovada.",
      backToLogin: "Voltar para o login",
    },
  };

  const t = texts[lang];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader lang={lang} setLang={setLang} />

      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="opacity-80">
          <MeshGradient />
        </div>
        <div className="absolute inset-0 bg-white/55 backdrop-blur-[2px]" />
      </div>

      <main className="relative z-10 pt-[60px]">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <section className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                {lang === "en" ? "Work faster. Sound better." : "Trabalhe mais rápido. Soe melhor."}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {lang === "en"
                  ? "Mini tutorials to help you get maximum performance from the dubbing workflow."
                  : "Mini tutoriais para extrair o máximo de desempenho do fluxo de dublagem."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {tutorials.map((block) => (
                <motion.div
                  key={block.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-5"
                >
                  <div className="text-xs font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                    {block.title}
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-foreground/90">
                    {block.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-foreground/35 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="lg:sticky lg:top-[92px]">
            <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-6 md:p-7">
              {registerSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold tracking-tight mb-2">
                    {t.successTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    {t.successMessage}
                  </p>
                  <button
                    onClick={() => {
                      setRegisterSuccess(false);
                      setActiveTab("login");
                    }}
                    className="h-11 px-6 rounded-xl bg-foreground text-background font-semibold text-sm transition-opacity hover:opacity-90"
                  >
                    {t.backToLogin}
                  </button>
                </motion.div>
              ) : (
                <>
                  {/* Tabs */}
                  <div className="flex gap-2 p-1 bg-muted/50 rounded-xl mb-6">
                    <button
                      onClick={() => setActiveTab("login")}
                      className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
                        activeTab === "login"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.login}
                    </button>
                    <button
                      onClick={() => setActiveTab("register")}
                      className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
                        activeTab === "register"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.register}
                    </button>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="text-xs font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                      {activeTab === "login" ? t.login : t.register}
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {activeTab === "login" ? t.accessWorkspace : t.createWorkspace}
                    </h2>
                  </div>

                  {activeTab === "login" ? (
                    <form onSubmit={handleLogin} className="space-y-4" data-testid="form-login">
                      <div className="space-y-1.5">
                        <label htmlFor="login-email" className="text-xs text-muted-foreground">{t.email}</label>
                        <Input
                          id="login-email"
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder={lang === "en" ? "you@studio.com" : "voce@estudio.com"}
                          autoComplete="email"
                          data-testid="input-email"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="login-password" className="text-xs text-muted-foreground">{t.password}</label>
                        <Input
                          id="login-password"
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder={t.password}
                          autoComplete="current-password"
                          data-testid="input-password"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full h-11 rounded-xl bg-foreground text-background font-semibold text-sm transition-opacity disabled:opacity-60"
                        data-testid="button-submit-login"
                      >
                        {isLoggingIn ? (
                          <span className="inline-flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t.signingIn}
                          </span>
                        ) : (
                          <span>{t.signIn}</span>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleRegister} className="space-y-4" data-testid="form-register">
                      <div className="space-y-1.5">
                        <label htmlFor="reg-fullname" className="text-xs text-muted-foreground">{t.fullName}</label>
                        <Input
                          id="reg-fullname"
                          type="text"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder={lang === "en" ? "Your full name" : "Seu nome completo"}
                          autoComplete="name"
                          data-testid="input-fullname"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="reg-email" className="text-xs text-muted-foreground">{t.email}</label>
                        <Input
                          id="reg-email"
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder={lang === "en" ? "you@studio.com" : "voce@estudio.com"}
                          autoComplete="email"
                          data-testid="input-reg-email"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="reg-password" className="text-xs text-muted-foreground">{t.password}</label>
                        <Input
                          id="reg-password"
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder={lang === "en" ? "At least 6 characters" : "Mínimo 6 caracteres"}
                          autoComplete="new-password"
                          data-testid="input-reg-password"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="reg-studio" className="text-xs text-muted-foreground">{t.studio}</label>
                        <select
                          id="reg-studio"
                          value={regStudioId}
                          onChange={(e) => setRegStudioId(e.target.value)}
                          className="w-full h-10 rounded-lg px-3 text-sm bg-muted/50 border border-border text-foreground focus:border-primary outline-none"
                          data-testid="select-studio"
                        >
                          <option value="">{t.noStudio}</option>
                          {isLoadingStudios ? (
                            <option disabled>{lang === "en" ? "Loading..." : "Carregando..."}</option>
                          ) : (
                            publicStudios?.map((studio) => (
                              <option key={studio.id} value={studio.id}>
                                {studio.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={isRegistering}
                        className="w-full h-11 rounded-xl bg-foreground text-background font-semibold text-sm transition-opacity disabled:opacity-60"
                        data-testid="button-submit-register"
                      >
                        {isRegistering ? (
                          <span className="inline-flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t.creating}
                          </span>
                        ) : (
                          <span>{t.createAccount}</span>
                        )}
                      </button>
                    </form>
                  )}

                  <div className="mt-5 text-center">
                    <button
                      onClick={() => setActiveTab(activeTab === "login" ? "register" : "login")}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {activeTab === "login" ? (
                        <>{t.noAccount} <span className="underline">{t.clickHere}</span></>
                      ) : (
                        <>{t.haveAccount} <span className="underline">{t.clickHere}</span></>
                      )}
                    </button>
                  </div>

                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

