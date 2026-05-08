import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Mic, Monitor, CheckCircle2, ChevronDown, ChevronRight,
  ArrowRight, Zap, Shield, Clock, Globe, Headphones, FileText,
  BarChart3, DollarSign, X, Menu, Layers, Settings,
  TrendingUp, Play, Download, Users, Wand2, Radio, Award
} from 'lucide-react';

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');`;

function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function StatCard({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const count = useCountUp(value, 1800, inView);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5 }}
      className="flex flex-col items-center gap-1"
    >
      <span className="font-syne text-4xl font-bold text-cyan-400">{count}{suffix}</span>
      <span className="text-sm text-slate-400 text-center">{label}</span>
    </motion.div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-900/50 transition-colors"
      >
        <span className="font-dm text-slate-200 font-medium pr-4">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-cyan-400 shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-slate-400 font-dm text-sm leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ children, className = '', id = '', style }: { children: React.ReactNode; className?: string; id?: string; style?: React.CSSProperties }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className={className}
      style={style}
    >
      {children}
    </motion.section>
  );
}

export function B2BEstudios() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <style>{fonts}</style>
      <style>{`
        .font-syne { font-family: 'Syne', sans-serif; }
        .font-dm { font-family: 'DM Sans', sans-serif; }
        .mesh-cyan { background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(14,165,233,0.14) 0%, transparent 70%); }
        .mesh-violet { background: radial-gradient(ellipse 60% 40% at 80% 100%, rgba(124,58,237,0.1) 0%, transparent 60%); }
        .glass-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); backdrop-filter: blur(12px); }
        .glow-cyan { box-shadow: 0 0 40px rgba(14,165,233,0.18); }
        .waveform-bar { animation: wave 1.2s ease-in-out infinite alternate; }
        @keyframes wave { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
      `}</style>

      <div className="min-h-screen font-dm" style={{ backgroundColor: '#020817', color: '#f1f5f9' }}>

        {/* ── NAV ── */}
        <nav className="fixed top-0 w-full z-50" style={{ background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="font-syne font-bold text-xl text-white">HubDub</span>
              <span className="text-xs font-dm px-2 py-0.5 rounded-full text-cyan-400" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)' }}>Pro</span>
            </a>
            <div className="hidden md:flex items-center gap-8">
              <a href="#custo" className="text-sm text-slate-400 hover:text-white transition-colors font-dm">Custo vs. Cabine</a>
              <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors font-dm">Plataforma</a>
              <a href="#planos" className="text-sm text-slate-400 hover:text-white transition-colors font-dm">Planos</a>
              <a href="/b2b/escolas" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors font-dm">→ Escolas de Dublagem</a>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <a href="/" className="text-sm text-slate-400 hover:text-white transition-colors font-dm">← Voltar</a>
              <a href="#trial" className="font-dm font-semibold text-sm px-5 py-2.5 rounded-full text-white transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 4px 20px rgba(14,165,233,0.35)' }}>
                Trial 14 dias grátis
              </a>
            </div>
            <button onClick={() => setMobileOpen(v => !v)} className="md:hidden text-slate-300 p-2">
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          <AnimatePresence>
            {mobileOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="px-6 py-4 flex flex-col gap-4">
                  <a href="#custo" onClick={() => setMobileOpen(false)} className="text-sm text-slate-300 font-dm">Custo vs. Cabine</a>
                  <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm text-slate-300 font-dm">Plataforma</a>
                  <a href="#planos" onClick={() => setMobileOpen(false)} className="text-sm text-slate-300 font-dm">Planos</a>
                  <a href="/b2b/escolas" className="text-sm text-slate-400 font-dm">→ Escolas de Dublagem</a>
                  <a href="#trial" onClick={() => setMobileOpen(false)} className="font-dm font-semibold text-sm px-5 py-3 rounded-full text-center text-white" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>Trial 14 dias grátis</a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* ── HERO ── */}
        <section className="relative pt-32 pb-24 px-6 overflow-hidden">
          <div className="absolute inset-0 mesh-cyan" />
          <div className="absolute inset-0 mesh-violet" />
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.5), transparent)' }} />

          {/* Waveform decoration */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-end gap-1 opacity-10 pr-8" style={{ height: 200 }}>
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="waveform-bar rounded-full"
                style={{
                  width: 3,
                  height: `${20 + Math.sin(i * 0.6) * 60 + Math.random() * 40}%`,
                  background: '#0ea5e9',
                  animationDelay: `${i * 0.04}s`,
                  transformOrigin: 'bottom',
                }}
              />
            ))}
          </div>

          <div className="relative max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-dm text-cyan-300 mb-8" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
                <Radio className="w-4 h-4" />
                Por menos que 1h de aluguel de cabine por mês
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-syne font-bold leading-tight mb-6 max-w-3xl"
              style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}
            >
              Seu estúdio de dublagem{' '}
              <span style={{ background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                sem paredes.
              </span>{' '}
              Sessões profissionais, de qualquer lugar.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="font-dm text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed"
            >
              HubDub substitui a cabine física, a DAW de aprovação e o sistema de gestão do seu estúdio.
              Diretor, atores e técnicos — todos na mesma sala virtual, em tempo real.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-start gap-4 mb-16"
            >
              <a href="#trial" className="font-dm font-semibold px-8 py-4 rounded-full text-white transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 4px 24px rgba(14,165,233,0.4)' }}>
                Começar trial gratuito — 14 dias
              </a>
              <a href="#custo" className="font-dm font-medium px-8 py-4 rounded-full transition-all hover:bg-white/5 text-slate-300" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                Ver comparativo de custo <ChevronRight className="inline w-4 h-4" />
              </a>
            </motion.div>

            <div className="grid grid-cols-3 gap-8 pt-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <StatCard value={14} suffix=" dias" label="Trial grátis, sem cartão" delay={0.1} />
              <StatCard value={297} suffix="R$" label="vs R$300–1500/h de cabine" delay={0.2} />
              <StatCard value={100} suffix="%" label="Browser — sem instalação" delay={0.3} />
            </div>
          </div>
        </section>

        {/* ── CUSTO vs CABINE ── */}
        <Section className="py-24 px-6" id="custo">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="font-dm text-cyan-400 text-sm font-medium uppercase tracking-widest">O custo real</span>
              <h2 className="font-syne font-bold text-3xl md:text-4xl mt-3 text-white">O que você paga hoje vs. o que vai pagar</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Custo atual */}
              <div className="glass-card rounded-3xl p-8" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="font-syne font-bold text-red-400 mb-6 text-lg">❌ Modelo tradicional</p>
                <div className="space-y-4">
                  {[
                    { item: 'Aluguel de cabine de gravação', cost: 'R$ 300–1.500/h' },
                    { item: 'Software DAW profissional', cost: 'R$ 2.000–8.000/ano' },
                    { item: 'Plataforma de videoconferência', cost: 'R$ 80–350/mês' },
                    { item: 'Sistema de gestão de projetos de áudio', cost: 'R$ 200–600/mês' },
                    { item: 'Deslocamento de atores', cost: 'Variável' },
                    { item: 'Técnico de gravação presencial', cost: 'R$ 80–150/h' },
                  ].map(({ item, cost }, i) => (
                    <div key={i} className="flex items-center justify-between font-dm text-sm">
                      <span className="text-slate-400">{item}</span>
                      <span className="text-red-400 font-medium">{cost}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="font-dm font-medium text-slate-300">Custo por sessão (estimativa)</span>
                  <span className="font-syne font-bold text-red-400 text-xl">R$ 500–2.500</span>
                </div>
              </div>

              {/* HubDub */}
              <div className="rounded-3xl p-8 relative overflow-hidden glow-cyan" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.3)' }}>
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)' }} />
                <p className="font-syne font-bold text-cyan-400 mb-6 text-lg">✅ Com HubDub Studio</p>
                <div className="space-y-4">
                  {[
                    { item: 'Sala de gravação remota', cost: 'Incluso' },
                    { item: 'DAW Timeline integrada', cost: 'Incluso' },
                    { item: 'Videoconferência integrada', cost: 'Incluso' },
                    { item: 'Gestão de produções e atores', cost: 'Incluso' },
                    { item: 'Análise de qualidade por IA', cost: 'Incluso' },
                    { item: 'Painel admin + financeiro', cost: 'Incluso' },
                  ].map(({ item, cost }, i) => (
                    <div key={i} className="flex items-center justify-between font-dm text-sm">
                      <span className="text-slate-400">{item}</span>
                      <span className="text-cyan-400 font-medium">{cost}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="font-dm font-medium text-slate-300">Custo mensal total</span>
                  <span className="font-syne font-bold text-cyan-400 text-xl">R$ 297/mês</span>
                </div>
              </div>
            </div>

            <div className="text-center glass-card rounded-2xl px-8 py-6">
              <p className="font-syne font-bold text-2xl text-white">
                Uma única sessão presencial já paga{' '}
                <span style={{ background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  o plano inteiro do mês.
                </span>
              </p>
            </div>
          </div>
        </Section>

        {/* ── FLUXO PROFISSIONAL ── */}
        <Section className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="font-dm text-cyan-400 text-sm font-medium uppercase tracking-widest">Fluxo de produção</span>
              <h2 className="font-syne font-bold text-3xl md:text-4xl mt-3 text-white">Do upload ao take aprovado</h2>
            </div>
            <div className="flex flex-col md:flex-row items-start gap-4">
              {[
                { icon: Settings, label: 'Produção', desc: 'Upload do vídeo + roteiro SRT/CSV. Define personagens e atores.' },
                { icon: Users, label: 'Sessão', desc: 'Agenda data e hora. Atores recebem o convite automaticamente.' },
                { icon: Mic, label: 'Gravação ao vivo', desc: 'Atores gravam linha por linha com vídeo sincronizado.' },
                { icon: Headphones, label: 'Revisão', desc: 'Diretor ouve, edita trim, aprova ou rejeita com feedback.' },
                { icon: Layers, label: 'DAW Timeline', desc: 'Visão geral de todos os takes no eixo do tempo.' },
                { icon: Download, label: 'Export', desc: 'Download individual ou em lote dos takes aprovados.' },
              ].map(({ icon: Icon, label, desc }, i) => (
                <React.Fragment key={i}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex-1 flex flex-col items-center text-center"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
                      <Icon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <p className="font-syne font-semibold text-white text-sm mb-1">{label}</p>
                    <p className="font-dm text-xs text-slate-400 leading-relaxed">{desc}</p>
                  </motion.div>
                  {i < 5 && (
                    <div className="hidden md:flex items-center justify-center pt-5 flex-shrink-0">
                      <ChevronRight className="w-4 h-4 text-cyan-800" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </Section>

        {/* ── FEATURES PRO ── */}
        <Section className="py-24 px-6" id="features">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="font-dm text-cyan-400 text-sm font-medium uppercase tracking-widest">Recursos profissionais</span>
              <h2 className="font-syne font-bold text-3xl md:text-4xl mt-3 text-white">Tudo que um estúdio profissional precisa</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <p className="font-syne font-semibold text-cyan-400 mb-6 flex items-center gap-2">
                  <Headphones className="w-4 h-4" /> Para o diretor
                </p>
                <ul className="space-y-5">
                  {[
                    { icon: Monitor, title: 'Painel de revisão em tempo real', desc: 'Cada take chega automaticamente — ouve, edita trim por waveform, aprova ou rejeita com feedback para o ator.' },
                    { icon: Layers, title: 'DAW Timeline integrada', desc: 'Visão geral de todos os takes no eixo do tempo, organizados por faixa e personagem.' },
                    { icon: Wand2, title: 'Análise de qualidade por IA', desc: 'Score automático de qualidade e flags de ruído, clipping e timing para cada take.' },
                    { icon: FileText, title: 'Controle de roteiro', desc: 'Concede ou revoga acesso de cada ator ao controle do roteiro individualmente.' },
                    { icon: BarChart3, title: 'Relatórios de sessão PDF', desc: 'Export automático com todos os takes, aprovações e métricas de sessão.' },
                    { icon: Play, title: 'Múltiplos takes por linha', desc: 'Acumula takes por linha e marca o favorito — workflow idêntico ao estúdio físico.' },
                  ].map(({ icon: Icon, title, desc }, i) => (
                    <motion.li key={i} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.15)' }}>
                        <Icon className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <p className="font-dm font-medium text-white text-sm">{title}</p>
                        <p className="font-dm text-xs text-slate-400 mt-0.5">{desc}</p>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-syne font-semibold text-cyan-400 mb-6 flex items-center gap-2">
                  <Mic className="w-4 h-4" /> Para o ator
                </p>
                <ul className="space-y-5">
                  {[
                    { icon: Globe, title: 'Browser-only, qualquer lugar', desc: 'Chrome ou Edge — sem instalar nada. Funciona em PC, notebook ou Mac.' },
                    { icon: Monitor, title: 'Vídeo + roteiro sincronizados', desc: 'A linha ativa destaca automaticamente conforme o vídeo avança — igual ao estúdio presencial.' },
                    { icon: Radio, title: 'Waveform em tempo real', desc: 'Monitor de áudio com VU meter durante a gravação para automonitoramento de nível.' },
                    { icon: Mic, title: 'Qualquer microfone USB', desc: 'Interface de áudio profissional, microfone USB ou até o do fone de ouvido — todos funcionam.' },
                    { icon: Clock, title: 'Controle de playback', desc: 'O ator controla início, pausa e repetição da linha sem depender do diretor para cada take.' },
                    { icon: Award, title: 'Histórico completo', desc: 'Todos os takes ficam salvos — o ator pode ouvir sua evolução e o diretor pode revisar retroativamente.' },
                  ].map(({ icon: Icon, title, desc }, i) => (
                    <motion.li key={i} initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.15)' }}>
                        <Icon className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <p className="font-dm font-medium text-white text-sm">{title}</p>
                        <p className="font-dm text-xs text-slate-400 mt-0.5">{desc}</p>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Requisitos técnicos */}
            <div className="mt-16 glass-card rounded-2xl p-8">
              <p className="font-syne font-semibold text-white mb-6">Requisitos técnicos mínimos</p>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="font-dm text-xs text-cyan-400 uppercase tracking-widest mb-3">Diretor / Admin</p>
                  <ul className="space-y-2">
                    {['Chrome 110+ ou Edge 110+', '10 Mbps de upload estável', 'Microfone USB ou interface de áudio', 'Arquivo MP4/MOV + roteiro SRT/CSV'].map((r, i) => (
                      <li key={i} className="flex items-center gap-2 font-dm text-sm text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-dm text-xs text-cyan-400 uppercase tracking-widest mb-3">Ator</p>
                  <ul className="space-y-2">
                    {['Chrome 110+', '5 Mbps de upload', 'Fone com microfone embutido já funciona', 'Qualquer ambiente silencioso'].map((r, i) => (
                      <li key={i} className="flex items-center gap-2 font-dm text-sm text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── PLANOS ── */}
        <Section className="py-24 px-6" id="planos" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="font-dm text-cyan-400 text-sm font-medium uppercase tracking-widest">Planos profissionais</span>
              <h2 className="font-syne font-bold text-3xl md:text-4xl mt-3 text-white">Escale sem contratar técnicos ou alugar mais cabines</h2>
              <p className="font-dm text-slate-400 mt-3">Trial de 14 dias em qualquer plano — sem cartão</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  name: 'Studio', price: 297, highlight: false,
                  target: 'Estúdio pequeno / médio',
                  features: ['1 estúdio virtual', 'Até 20 usuários', 'Produções ilimitadas', 'Sessões ilimitadas', '50 GB de takes', 'DAW Timeline', 'Análise de qualidade IA', 'Videoconferência integrada', 'Onboarding guiado'],
                  cta: 'Começar trial',
                },
                {
                  name: 'Pro', price: 697, highlight: true,
                  target: 'Estúdio com múltiplos clientes',
                  features: ['Até 5 estúdios virtuais', 'Usuários ilimitados', 'Produções ilimitadas', '200 GB de takes', 'Export em lote', 'Relatórios de sessão PDF', 'Roles customizados', 'SLA 4h úteis', 'Onboarding personalizado'],
                  cta: 'Começar trial',
                },
                {
                  name: 'Enterprise', price: null, highlight: false,
                  target: 'Produtora / emissora / streaming',
                  features: ['Estúdios ilimitados', 'Usuários ilimitados', '500 GB+ de armazenamento', 'API de integração', 'White-label parcial', 'SLA 99,9% garantido', 'Gerente de conta dedicado', 'Treinamento da equipe'],
                  cta: 'Falar com especialista',
                },
              ].map(({ name, price, highlight, target, features, cta }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-3xl p-7 relative overflow-hidden ${highlight ? 'glow-cyan' : 'glass-card'}`}
                  style={highlight ? { background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.35)' } : {}}
                >
                  {highlight && <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)' }} />}
                  {highlight && <div className="absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-dm font-bold text-slate-900" style={{ background: '#38bdf8' }}>Popular</div>}
                  <p className="font-syne font-bold text-white text-lg mb-1">{name}</p>
                  <p className="font-dm text-xs text-slate-400 mb-4">{target}</p>
                  <div className="flex items-end gap-1 mb-6">
                    {price ? (
                      <>
                        <span className="font-syne font-bold text-3xl text-white">R$ {price}</span>
                        <span className="font-dm text-slate-400 text-sm mb-1">/mês</span>
                      </>
                    ) : (
                      <span className="font-syne font-bold text-2xl text-white">Sob consulta</span>
                    )}
                  </div>
                  <ul className="space-y-2.5 mb-8">
                    {features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2.5 font-dm text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={price ? '#trial' : 'mailto:contato@hubdub.com.br?subject=HubDub Enterprise'}
                    className={`block text-center font-dm font-semibold text-sm px-6 py-3 rounded-full transition-all hover:scale-105 ${highlight ? 'text-white' : 'text-cyan-400'}`}
                    style={highlight ? { background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' } : { border: '1px solid rgba(14,165,233,0.3)' }}
                  >
                    {cta}
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── CASOS DE USO ── */}
        <Section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="font-dm text-cyan-400 text-sm font-medium uppercase tracking-widest">Casos de uso</span>
              <h2 className="font-syne font-bold text-3xl md:text-4xl mt-3 text-white">Quem usa e como</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { title: 'Estúdio regional', body: 'Reduz custo operacional eliminando aluguel de cabine para sessões de voz. Atende clientes de qualquer cidade.', tag: 'Operação' },
                { title: 'Agência de localização', body: 'Conecta freelancers espalhados pelo país em sessões síncronas por projeto, sem deslocamento.', tag: 'Flexibilidade' },
                { title: 'Produtora multi-cliente', body: 'Usa o plano Pro para separar projetos e equipes em estúdios virtuais distintos dentro da mesma conta.', tag: 'Escala' },
                { title: 'Diretor freelancer', body: 'Monta seu próprio estúdio virtual com atores remotos e entrega produções sem depender de espaço físico.', tag: 'Independência' },
              ].map(({ title, body, tag }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card rounded-2xl p-5"
                >
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-dm text-cyan-400 mb-3" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>{tag}</span>
                  <p className="font-syne font-semibold text-white text-sm mb-2">{title}</p>
                  <p className="font-dm text-xs text-slate-400 leading-relaxed">{body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── TRIAL CTA ── */}
        <Section className="py-24 px-6" id="trial">
          <div className="max-w-3xl mx-auto text-center">
            <div className="rounded-3xl p-12 relative overflow-hidden glow-cyan" style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.2)' }}>
              <div className="absolute inset-0 mesh-cyan" />
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)' }} />
              <div className="relative">
                <span className="font-dm text-cyan-400 text-sm font-medium uppercase tracking-widest">Trial gratuito</span>
                <h2 className="font-syne font-bold text-3xl md:text-4xl mt-4 mb-4 text-white">14 dias para experimentar tudo</h2>
                <p className="font-dm text-slate-400 mb-8 leading-relaxed">
                  Todas as features do plano Studio desbloqueadas. Sem cartão de crédito. Sem compromisso.
                  Configure seu primeiro estúdio virtual em menos de 10 minutos.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="mailto:contato@hubdub.com.br?subject=Trial HubDub — Estudio Profissional"
                    className="font-dm font-semibold px-8 py-4 rounded-full text-white transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 4px 24px rgba(14,165,233,0.4)' }}
                  >
                    Começar trial grátis
                  </a>
                  <a
                    href="https://wa.me/55?text=Olá, quero saber mais sobre o HubDub para estúdios profissionais"
                    className="font-dm font-medium px-8 py-4 rounded-full transition-all hover:bg-white/5 text-slate-300"
                    style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    Falar pelo WhatsApp
                  </a>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-6 mt-10 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Sem cartão', '14 dias completos', 'Todas as features', 'Suporte incluso'].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 font-dm text-xs text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── FAQ ── */}
        <Section className="py-24 px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <span className="font-dm text-cyan-400 text-sm font-medium uppercase tracking-widest">Dúvidas frequentes</span>
              <h2 className="font-syne font-bold text-3xl mt-3 text-white">FAQ para estúdios</h2>
            </div>
            <div className="space-y-3">
              <FaqItem q="A qualidade do áudio gravado é profissional?" a="Sim. A gravação é feita direto no browser via Web Audio API, capturando o sinal bruto do microfone ou interface de áudio sem compressão adicional. O resultado é um arquivo WAV editável em qualquer DAW profissional." />
              <FaqItem q="Os arquivos de áudio ficam seguros? Quem tem acesso?" a="Os takes são armazenados com criptografia em repouso (AES-256). Apenas usuários do seu estúdio têm acesso. Nunca compartilhamos ou acessamos seu conteúdo. No Enterprise, oferecemos SLA de uptime e termos de confidencialidade específicos." />
              <FaqItem q="Posso integrar com minha DAW atual (Pro Tools, Logic, etc.)?" a="Sim. Os takes aprovados são exportáveis como arquivos WAV individuais ou em lote, prontos para importação em qualquer DAW. A DAW Timeline do HubDub é complementar ao seu fluxo de pós-produção, não substitui sua DAW de mixagem." />
              <FaqItem q="O que acontece se a internet cair durante uma sessão?" a="Os takes já gravados são salvos localmente e sincronizados quando a conexão retorna. A sessão pode ser reiniciada do ponto onde parou sem perder nenhum take aprovado." />
              <FaqItem q="Existe SLA de uptime garantido?" a="No plano Studio e Pro oferecemos 99,5% de uptime com monitoramento contínuo. O plano Enterprise inclui SLA 99,9% em contrato, com janelas de manutenção comunicadas com 72h de antecedência." />
            </div>
          </div>
        </Section>

        {/* ── FOOTER ── */}
        <footer className="py-12 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="font-syne font-bold text-white text-lg">HubDub</p>
              <p className="font-dm text-slate-400 text-sm mt-1">Plataforma profissional de dublagem remota</p>
            </div>
            <div className="flex items-center gap-6">
              <a href="/" className="font-dm text-sm text-slate-400 hover:text-white transition-colors">Página principal</a>
              <a href="/b2b/escolas" className="font-dm text-sm text-slate-400 hover:text-white transition-colors">Escolas de dublagem</a>
              <a href="mailto:contato@hubdub.com.br" className="font-dm text-sm text-slate-400 hover:text-white transition-colors">contato@hubdub.com.br</a>
            </div>
            <p className="font-dm text-xs text-slate-600">© {new Date().getFullYear()} HubDub. Todos os direitos reservados.</p>
          </div>
        </footer>

      </div>
    </>
  );
}

export default B2BEstudios;
