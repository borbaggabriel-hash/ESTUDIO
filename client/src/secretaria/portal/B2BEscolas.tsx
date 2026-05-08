import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  GraduationCap, BookOpen, Users, Mic, Monitor, CheckCircle2,
  ChevronDown, ChevronRight, ArrowRight, Star, Zap, Shield,
  Award, Clock, Globe, Headphones, FileText, BarChart3,
  MessageSquare, Calendar, DollarSign, X, Menu, Play,
  TrendingUp, Layers, Settings
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
      <span className="font-syne text-4xl font-bold text-amber-400">{count}{suffix}</span>
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
          <ChevronDown className="w-5 h-5 text-amber-400 shrink-0" />
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

export function B2BEscolas() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <style>{fonts}</style>
      <style>{`
        .font-syne { font-family: 'Syne', sans-serif; }
        .font-dm { font-family: 'DM Sans', sans-serif; }
        .mesh-amber { background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(217,119,6,0.18) 0%, transparent 70%); }
        .mesh-violet { background: radial-gradient(ellipse 60% 40% at 80% 100%, rgba(124,58,237,0.12) 0%, transparent 60%); }
        .glass-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); backdrop-filter: blur(12px); }
        .glow-amber { box-shadow: 0 0 32px rgba(217,119,6,0.2); }
        .badge-mec { background: linear-gradient(135deg, rgba(217,119,6,0.15), rgba(217,119,6,0.05)); border: 1px solid rgba(217,119,6,0.3); }
      `}</style>

      <div className="min-h-screen font-dm" style={{ backgroundColor: '#020817', color: '#f1f5f9' }}>

        {/* ── NAV ── */}
        <nav className="fixed top-0 w-full z-50" style={{ background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="font-syne font-bold text-xl text-white">HubDub</span>
              <span className="text-xs font-dm px-2 py-0.5 rounded-full text-amber-400" style={{ background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.25)' }}>Escolas</span>
            </a>
            <div className="hidden md:flex items-center gap-8">
              <a href="#modalidades" className="text-sm text-slate-400 hover:text-white transition-colors font-dm">Modalidades</a>
              <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors font-dm">Plataforma</a>
              <a href="#planos" className="text-sm text-slate-400 hover:text-white transition-colors font-dm">Planos</a>
              <a href="/b2b/estudios" className="text-sm text-slate-400 hover:text-amber-400 transition-colors font-dm">→ Estúdios Profissionais</a>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <a href="/" className="text-sm text-slate-400 hover:text-white transition-colors font-dm">← Voltar</a>
              <a href="#piloto" className="font-dm font-semibold text-sm px-5 py-2.5 rounded-full transition-all" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 4px 20px rgba(217,119,6,0.35)' }}>
                Piloto gratuito
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
                  <a href="#modalidades" onClick={() => setMobileOpen(false)} className="text-sm text-slate-300 font-dm">Modalidades</a>
                  <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm text-slate-300 font-dm">Plataforma</a>
                  <a href="#planos" onClick={() => setMobileOpen(false)} className="text-sm text-slate-300 font-dm">Planos</a>
                  <a href="/b2b/estudios" className="text-sm text-slate-400 font-dm">→ Estúdios Profissionais</a>
                  <a href="#piloto" onClick={() => setMobileOpen(false)} className="font-dm font-semibold text-sm px-5 py-3 rounded-full text-center" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>Piloto gratuito</a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* ── HERO ── */}
        <section className="relative pt-32 pb-24 px-6 overflow-hidden">
          <div className="absolute inset-0 mesh-amber" />
          <div className="absolute inset-0 mesh-violet" />
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(217,119,6,0.5), transparent)' }} />

          <div className="relative max-w-5xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="badge-mec inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-dm text-amber-300 mb-8">
                <Award className="w-4 h-4" />
                Compatível com exigências MEC para cursos livres e pós-graduação
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-syne font-bold leading-tight mb-6"
              style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}
            >
              Transforme sua escola no{' '}
              <span style={{ background: 'linear-gradient(135deg, #d97706, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                primeiro curso de dublagem remota
              </span>{' '}
              do Brasil
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="font-dm text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              HubDub é a plataforma SaaS de dublagem profissional que vira infraestrutura de ensino — 
              seus alunos gravam, recebem direção e constroem portfolio, tudo sem precisar de estúdio físico.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <a href="#piloto" className="font-dm font-semibold px-8 py-4 rounded-full text-white transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 4px 24px rgba(217,119,6,0.4)' }}>
                Começar piloto gratuito — 30 dias
              </a>
              <a href="#modalidades" className="font-dm font-medium px-8 py-4 rounded-full transition-all hover:bg-white/5 text-slate-300" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                Ver modalidades <ChevronRight className="inline w-4 h-4" />
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="grid grid-cols-3 gap-8 mt-20 pt-12"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <StatCard value={30} suffix=" dias" label="Piloto gratuito, sem cartão" delay={0.1} />
              <StatCard value={0} suffix=" instalação" label="Funciona 100% no browser" delay={0.2} />
              <StatCard value={100} suffix="%" label="Compatível com MEC" delay={0.3} />
            </motion.div>
          </div>
        </section>

        {/* ── PROBLEMA ── */}
        <Section className="py-24 px-6" id="problema">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="font-dm text-amber-400 text-sm font-medium uppercase tracking-widest">O problema do mercado</span>
              <h2 className="font-syne font-bold text-3xl md:text-4xl mt-3 text-white">Seu aluno se forma pronto para o mercado de ontem</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Globe, title: 'O mercado migrou para o remoto', body: 'Mais de 60% das sessões profissionais de dublagem no Brasil já são conduzidas remotamente. O aluno sem essa experiência chega despreparado ao mercado de trabalho.' },
                { icon: DollarSign, title: 'Laboratório físico é caro e limitado', body: 'Manter uma cabine de gravação profissional custa R$80–300k na instalação e R$5–15k/mês em manutenção. Impossível para a maioria das escolas.' },
                { icon: TrendingUp, title: 'Competência digital é pré-requisito', body: 'Estúdios e agências exigem que o ator saiba operar em ambiente remoto: sincronização de vídeo, controle de take, comunicação com diretor a distância.' },
              ].map(({ icon: Icon, title, body }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card rounded-2xl p-6"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.2)' }}>
                    <Icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="font-syne font-semibold text-white mb-2">{title}</h3>
                  <p className="font-dm text-sm text-slate-400 leading-relaxed">{body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── MODALIDADES ── */}
        <Section className="py-24 px-6" id="modalidades">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="font-dm text-amber-400 text-sm font-medium uppercase tracking-widest">Duas formas de oferecer</span>
              <h2 className="font-syne font-bold text-3xl md:text-4xl mt-3 text-white">Escolha a modalidade certa para sua instituição</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Curso Livre */}
              <motion.div
                initial={{ opacity: 0, x: -32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="glass-card rounded-3xl p-8 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #d97706, #fbbf24)' }} />
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.25)' }}>
                    <BookOpen className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-syne font-bold text-white text-lg">Curso Livre</p>
                    <p className="font-dm text-sm text-slate-400">Para qualquer escola ou instrutor</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    'Nenhuma burocracia regulatória',
                    'Implementação imediata — em dias, não meses',
                    'Qualquer escola, qualquer cidade',
                    'Flexibilidade total de carga horária',
                    'Certificado de conclusão emitido pela própria escola',
                    'Preço de acesso acessível (a partir de R$ 97/mês)',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 font-dm text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#piloto" className="inline-flex items-center gap-2 font-dm font-semibold text-sm px-6 py-3 rounded-full text-white transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                  Começar agora <ArrowRight className="w-4 h-4" />
                </a>
              </motion.div>

              {/* Pós-graduação */}
              <motion.div
                initial={{ opacity: 0, x: 32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="glass-card rounded-3xl p-8 relative overflow-hidden"
                style={{ border: '1px solid rgba(124,58,237,0.3)' }}
              >
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }} />
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
                    <GraduationCap className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <p className="font-syne font-bold text-white text-lg">Pós-graduação</p>
                    <p className="font-dm text-sm text-slate-400">Para instituições reconhecidas pelo MEC</p>
                  </div>
                </div>

                <div className="mb-4 px-4 py-3 rounded-xl font-dm text-sm text-violet-300" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                  <strong className="text-violet-200">Ementa sugerida:</strong> Tecnologia em Dublagem Remota — 360h
                </div>

                <ul className="space-y-3 mb-4">
                  {[
                    'Módulo 1 — Fundamentos de Dublagem (60h)',
                    'Módulo 2 — Tecnologia de Gravação Remota (80h)',
                    'Módulo 3 — Direção de Atores a Distância (60h)',
                    'Módulo 4 — Pós-produção e DAW (80h)',
                    'Módulo 5 — Projeto Prático com Cliente Real (80h)',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 font-dm text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-violet-300" style={{ background: 'rgba(124,58,237,0.15)' }}>{i + 1}</div>
                      {item}
                    </li>
                  ))}
                </ul>
                <ul className="space-y-2 mb-8 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {[
                    'Carga horária 100% documentável e rastreável na plataforma',
                    'Frequência e aprovação controladas pelo painel admin',
                    'Portfolio de takes aprovados como TCC prático',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 font-dm text-sm text-violet-300">
                      <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#piloto" className="inline-flex items-center gap-2 font-dm font-semibold text-sm px-6 py-3 rounded-full text-white transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                  Conversar com especialista <ArrowRight className="w-4 h-4" />
                </a>
              </motion.div>
            </div>
          </div>
        </Section>

        {/* ── FLUXO PEDAGÓGICO ── */}
        <Section className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="font-dm text-amber-400 text-sm font-medium uppercase tracking-widest">Como funciona na prática</span>
              <h2 className="font-syne font-bold text-3xl md:text-4xl mt-3 text-white">Do zero ao take aprovado</h2>
            </div>
            <div className="flex flex-col md:flex-row items-start gap-4">
              {[
                { icon: Settings, label: 'Escola configura', desc: 'Cadastra professores, turmas e o vídeo de exercício' },
                { icon: Users, label: 'Professor/Diretor', desc: 'Agenda a sessão prática e convida os alunos' },
                { icon: Mic, label: 'Alunos gravam', desc: 'Acessam pelo browser, veem o roteiro sincronizado e gravam takes' },
                { icon: Headphones, label: 'Feedback em tempo real', desc: 'Professor ouve, comenta e aprova direto na plataforma' },
                { icon: Award, label: 'Portfolio gerado', desc: 'Todos os takes aprovados ficam salvos no histórico do aluno' },
              ].map(({ icon: Icon, label, desc }, i) => (
                <React.Fragment key={i}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex-1 flex flex-col items-center text-center"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.2)' }}>
                      <Icon className="w-6 h-6 text-amber-400" />
                    </div>
                    <p className="font-syne font-semibold text-white text-sm mb-1">{label}</p>
                    <p className="font-dm text-xs text-slate-400 leading-relaxed">{desc}</p>
                  </motion.div>
                  {i < 4 && (
                    <div className="hidden md:flex items-center justify-center pt-5 flex-shrink-0">
                      <ChevronRight className="w-5 h-5 text-amber-600" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </Section>

        {/* ── FEATURES ── */}
        <Section className="py-24 px-6" id="features">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="font-dm text-amber-400 text-sm font-medium uppercase tracking-widest">A plataforma</span>
              <h2 className="font-syne font-bold text-3xl md:text-4xl mt-3 text-white">Tudo que a instituição e o aluno precisam</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <p className="font-syne font-semibold text-amber-400 mb-6 flex items-center gap-2"><Shield className="w-4 h-4" /> Para a instituição</p>
                <ul className="space-y-5">
                  {[
                    { icon: BarChart3, title: 'Painel administrativo completo', desc: 'Todos os alunos, matrículas, progresso e situação financeira em um só lugar.' },
                    { icon: DollarSign, title: 'Controle financeiro integrado', desc: 'Emissão de faturas, status de pagamento e histórico por aluno.' },
                    { icon: MessageSquare, title: 'Comunicação centralizada', desc: 'Avisos e comunicados entregues diretamente no painel do aluno.' },
                    { icon: Headphones, title: 'Suporte rastreável', desc: 'Chamados dos alunos com histórico completo de atendimento.' },
                    { icon: TrendingUp, title: 'Painel de captadores/vendedores', desc: 'Cada captador vê seus alunos e comissões em painel separado.' },
                    { icon: Calendar, title: 'Agenda de sessões', desc: 'Calendário visual com todas as sessões práticas marcadas.' },
                  ].map(({ icon: Icon, title, desc }, i) => (
                    <motion.li key={i} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.15)' }}>
                        <Icon className="w-4 h-4 text-amber-400" />
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
                <p className="font-syne font-semibold text-amber-400 mb-6 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Para o aluno</p>
                <ul className="space-y-5">
                  {[
                    { icon: Monitor, title: 'Sessão de gravação ao vivo', desc: 'Acessa pelo browser, vê o vídeo sincronizado, grava take por take.' },
                    { icon: FileText, title: 'Roteiro sincronizado', desc: 'A linha ativa destaca automaticamente conforme o vídeo avança.' },
                    { icon: Mic, title: 'Waveform em tempo real', desc: 'Monitor de áudio e VU meter durante a gravação para automonitoramento.' },
                    { icon: Layers, title: 'Histórico completo de evolução', desc: 'Todos os takes ficam salvos — o aluno acompanha sua evolução por sessão.' },
                    { icon: Award, title: 'Portfolio de takes aprovados', desc: 'Takes aprovados pelo professor compõem o portfolio oficial do aluno.' },
                    { icon: Calendar, title: 'Agenda e comunicados', desc: 'Visualiza sessões marcadas e recebe avisos da escola no painel.' },
                  ].map(({ icon: Icon, title, desc }, i) => (
                    <motion.li key={i} initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.15)' }}>
                        <Icon className="w-4 h-4 text-amber-400" />
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
          </div>
        </Section>

        {/* ── PLANOS ── */}
        <Section className="py-24 px-6" id="planos" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="font-dm text-amber-400 text-sm font-medium uppercase tracking-widest">Planos para escolas</span>
              <h2 className="font-syne font-bold text-3xl md:text-4xl mt-3 text-white">Comece no plano certo para o tamanho da sua turma</h2>
              <p className="font-dm text-slate-400 mt-3">Todos os planos incluem 30 dias de piloto gratuito</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  name: 'Solo', price: 97, highlight: false,
                  target: 'Instrutor independente',
                  features: ['1 estúdio virtual', 'Até 5 alunos', '3 produções ativas', 'Sessões ilimitadas', '5 GB de takes', 'DAW Timeline'],
                },
                {
                  name: 'Studio', price: 297, highlight: true,
                  target: 'Escola de dublagem',
                  features: ['1 estúdio virtual', 'Até 20 alunos', 'Produções ilimitadas', 'Sessões ilimitadas', '50 GB de takes', 'Análise de qualidade IA', 'Onboarding guiado'],
                },
                {
                  name: 'Pro', price: 697, highlight: false,
                  target: 'Escola com múltiplas turmas',
                  features: ['Até 5 estúdios virtuais', 'Alunos ilimitados', 'Produções ilimitadas', '200 GB de takes', 'Relatórios de sessão PDF', 'SLA 4h úteis', 'Onboarding personalizado'],
                },
              ].map(({ name, price, highlight, target, features }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-3xl p-7 relative overflow-hidden ${highlight ? 'glow-amber' : 'glass-card'}`}
                  style={highlight ? { background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.35)' } : {}}
                >
                  {highlight && <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #d97706, #fbbf24)' }} />}
                  {highlight && <div className="absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-dm font-bold text-amber-900" style={{ background: '#fbbf24' }}>Recomendado</div>}
                  <p className="font-syne font-bold text-white text-lg mb-1">{name}</p>
                  <p className="font-dm text-xs text-slate-400 mb-4">{target}</p>
                  <div className="flex items-end gap-1 mb-6">
                    <span className="font-syne font-bold text-3xl text-white">R$ {price}</span>
                    <span className="font-dm text-slate-400 text-sm mb-1">/mês</span>
                  </div>
                  <ul className="space-y-2.5 mb-8">
                    {features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2.5 font-dm text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a href="#piloto" className={`block text-center font-dm font-semibold text-sm px-6 py-3 rounded-full transition-all hover:scale-105 ${highlight ? 'text-white' : 'text-amber-400'}`} style={highlight ? { background: 'linear-gradient(135deg, #d97706, #b45309)' } : { border: '1px solid rgba(217,119,6,0.3)' }}>
                    Começar grátis
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
              <span className="font-dm text-amber-400 text-sm font-medium uppercase tracking-widest">Casos de uso</span>
              <h2 className="font-syne font-bold text-3xl md:text-4xl mt-3 text-white">Quem usa e como</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { title: 'Escola de artes cênicas', body: 'Adiciona módulo de dublagem remota ao currículo existente sem reformar o espaço físico.', tag: 'Curso livre' },
                { title: 'Instituto de idiomas', body: 'Usa dublagem como método de imersão linguística — alunos dubam em inglês ou espanhol com direção ao vivo.', tag: 'Inovação pedagógica' },
                { title: 'Pós em Comunicação', body: 'Institição MEC-credenciada inclui módulo prático de tecnologia de dublagem na grade de pós-graduação.', tag: 'Pós-graduação' },
                { title: 'Academia de voz', body: 'Professor independente cria turma virtual e oferece curso de dublagem totalmente online com certificado.', tag: 'Instrutor solo' },
              ].map(({ title, body, tag }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card rounded-2xl p-5"
                >
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-dm text-amber-400 mb-3" style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)' }}>{tag}</span>
                  <p className="font-syne font-semibold text-white text-sm mb-2">{title}</p>
                  <p className="font-dm text-xs text-slate-400 leading-relaxed">{body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── PILOTO CTA ── */}
        <Section className="py-24 px-6" id="piloto">
          <div className="max-w-3xl mx-auto text-center">
            <div className="glass-card rounded-3xl p-12 relative overflow-hidden" style={{ border: '1px solid rgba(217,119,6,0.2)' }}>
              <div className="absolute inset-0 mesh-amber" />
              <div className="relative">
                <span className="font-dm text-amber-400 text-sm font-medium uppercase tracking-widest">Piloto gratuito</span>
                <h2 className="font-syne font-bold text-3xl md:text-4xl mt-4 mb-4 text-white">30 dias para provar que funciona</h2>
                <p className="font-dm text-slate-400 mb-8 leading-relaxed">
                  Sem cartão de crédito. Sem compromisso. Fazemos o onboarding com você, configuramos o ambiente e acompanhamos a primeira turma.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="mailto:contato@hubdub.com.br?subject=Piloto HubDub — Escola"
                    className="font-dm font-semibold px-8 py-4 rounded-full text-white transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 4px 24px rgba(217,119,6,0.4)' }}
                  >
                    Quero o piloto gratuito
                  </a>
                  <a
                    href="https://wa.me/55?text=Olá, quero saber mais sobre o HubDub para escolas"
                    className="font-dm font-medium px-8 py-4 rounded-full transition-all hover:bg-white/5 text-slate-300"
                    style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    Falar pelo WhatsApp
                  </a>
                </div>
                <div className="flex items-center justify-center gap-8 mt-10 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Sem cartão', 'Sem compromisso', 'Onboarding incluso', 'Suporte direto'].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 font-dm text-xs text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
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
              <span className="font-dm text-amber-400 text-sm font-medium uppercase tracking-widest">Dúvidas frequentes</span>
              <h2 className="font-syne font-bold text-3xl mt-3 text-white">FAQ para instituições</h2>
            </div>
            <div className="space-y-3">
              <FaqItem q="A plataforma é compatível com o que o MEC exige para pós-graduação?" a="Sim. O HubDub registra presença, carga horária, atividades e progresso de cada aluno em formato documentável. As sessões práticas contam como horas de laboratório. Podemos fornecer relatórios no formato exigido pela instituição." />
              <FaqItem q="Os alunos precisam comprar equipamento especial?" a="Não. Um computador com microfone (pode ser o do fone de ouvido comum) e conexão de 5 Mbps é suficiente. Não há instalação de software — tudo funciona no Chrome ou Edge." />
              <FaqItem q="Como funciona a integração com o currículo atual?" a="O HubDub não substitui nada — é uma camada de laboratório prático. O professor continua com suas aulas teóricas normalmente e usa a plataforma para as sessões de gravação, exatamente como usaria um laboratório de informática." />
              <FaqItem q="É possível personalizar a plataforma com a marca da escola?" a="No plano Pro e Enterprise é possível adicionar logo e nome da instituição. Para pós-graduações MEC, oferecemos configuração personalizada." />
              <FaqItem q="O que acontece com os dados dos alunos após o cancelamento?" a="Os dados ficam disponíveis por 90 dias após o cancelamento para exportação. Nunca vendemos ou compartilhamos dados de alunos com terceiros." />
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
              <a href="/b2b/estudios" className="font-dm text-sm text-slate-400 hover:text-white transition-colors">Estúdios profissionais</a>
              <a href="mailto:contato@hubdub.com.br" className="font-dm text-sm text-slate-400 hover:text-white transition-colors">contato@hubdub.com.br</a>
            </div>
            <p className="font-dm text-xs text-slate-600">© {new Date().getFullYear()} HubDub. Todos os direitos reservados.</p>
          </div>
        </footer>

      </div>
    </>
  );
}

export default B2BEscolas;
