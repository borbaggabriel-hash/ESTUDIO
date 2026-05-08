import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Mic, Monitor, CheckCircle2, ChevronDown, ChevronRight,
  ArrowRight, Shield, Clock, Headphones, FileText,
  BarChart3, DollarSign, X, Menu, Layers, Settings,
  Download, Users, Wand2, Award
} from 'lucide-react';

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
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.4 }}
      className="flex flex-col items-center gap-1 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm"
    >
      <span className="font-black text-4xl text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>{count}{suffix}</span>
      <span className="text-sm text-gray-500 text-center">{label}</span>
    </motion.div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-900 font-semibold pr-4 text-sm">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
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
            <p className="px-6 pb-5 text-gray-500 text-sm leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ children, className = '', id = '', style }: { children: React.ReactNode; className?: string; id?: string; style?: React.CSSProperties }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
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
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Rubik, sans-serif', color: '#111827' }}>

      {/* ── NAV ── */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-[68px] flex items-center justify-between">
          <a href="/" className="font-black text-xl tracking-tight text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
            HubDub
          </a>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#custo" className="text-sm font-medium text-gray-500 hover:text-[#6d28d9] transition-colors">Custo vs. Cabine</a>
            <a href="#features" className="text-sm font-medium text-gray-500 hover:text-[#6d28d9] transition-colors">Plataforma</a>
            <a href="#planos" className="text-sm font-medium text-gray-500 hover:text-[#6d28d9] transition-colors">Planos</a>
            <a href="/b2b/escolas" className="text-sm font-medium text-gray-500 hover:text-[#6d28d9] transition-colors">Escolas de Dublagem →</a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <a href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">← Voltar</a>
            <a href="#trial" className="bg-[#6d28d9] text-white font-bold rounded-full px-5 py-2.5 text-sm hover:bg-[#5b21b6] transition-all shadow-[0_4px_14px_rgba(109,40,217,0.3)]">
              Trial 14 dias grátis
            </a>
          </div>
          <button onClick={() => setMobileOpen(v => !v)} className="md:hidden p-2 text-gray-700">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden overflow-hidden bg-white border-t border-gray-100">
              <nav className="flex flex-col px-6 py-4 gap-1">
                <a href="#custo" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#6d28d9] py-3 border-b border-gray-50 transition-colors">Custo vs. Cabine</a>
                <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#6d28d9] py-3 border-b border-gray-50 transition-colors">Plataforma</a>
                <a href="#planos" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#6d28d9] py-3 border-b border-gray-50 transition-colors">Planos</a>
                <a href="/b2b/escolas" className="text-sm font-medium text-gray-600 hover:text-[#6d28d9] py-3 border-b border-gray-50 transition-colors">Escolas de Dublagem →</a>
                <a href="#trial" onClick={() => setMobileOpen(false)} className="mt-3 bg-[#6d28d9] text-white font-bold rounded-full px-5 py-3 text-sm text-center hover:bg-[#5b21b6] transition-all">Trial 14 dias grátis</a>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── HERO ── */}
      <section className="pt-[68px] bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <span className="inline-block bg-[#6d28d9]/10 text-[#6d28d9] text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Por menos que 1h de aluguel de cabine por mês
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-black leading-tight mb-6 text-gray-900"
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(2.2rem, 5vw, 3.75rem)', lineHeight: 1.08 }}
            >
              Seu estúdio de dublagem{' '}
              <span className="text-[#6d28d9]">sem paredes.</span>{' '}
              Sessões profissionais, de qualquer lugar.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-gray-500 mb-8 max-w-xl leading-relaxed"
            >
              HubDub substitui a cabine física, a DAW de aprovação e o sistema de gestão do seu estúdio. Diretor, atores e técnicos na mesma sala virtual, em tempo real.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <a href="#trial" className="bg-[#6d28d9] text-white font-bold text-base px-8 py-4 rounded-full hover:bg-[#5b21b6] transition-all shadow-[0_8px_30px_rgba(109,40,217,0.35)] flex items-center justify-center gap-2 group">
                Começar trial gratuito — 14 dias <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#custo" className="border-2 border-gray-200 text-gray-700 font-bold text-base px-8 py-4 rounded-full hover:border-[#6d28d9] hover:text-[#6d28d9] transition-all flex items-center justify-center">
                Ver comparativo de custo
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-10 border-y border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-3 gap-4">
            <StatCard value={14} suffix=" dias" label="Trial grátis, sem cartão" delay={0.1} />
            <StatCard value={297} suffix="R$" label="vs R$300–1500/h de cabine" delay={0.2} />
            <StatCard value={10} suffix=" min" label="Para configurar o primeiro estúdio" delay={0.3} />
          </div>
        </div>
      </section>

      {/* ── CUSTO vs CABINE ── */}
      <Section className="py-16 md:py-24 bg-white px-4 md:px-8" id="custo">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>O custo real</p>
            <h2 className="font-black text-3xl md:text-5xl text-gray-900 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>O que você paga hoje vs. o que vai pagar</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Custo atual */}
            <div className="bg-white border-2 border-red-100 rounded-2xl p-8 shadow-sm">
              <p className="font-black text-red-500 mb-6 text-base" style={{ fontFamily: 'Poppins, sans-serif' }}>Modelo tradicional</p>
              <div className="space-y-4">
                {[
                  { item: 'Aluguel de cabine de gravação', cost: 'R$ 300–1.500/h' },
                  { item: 'Software DAW profissional', cost: 'R$ 2.000–8.000/ano' },
                  { item: 'Plataforma de videoconferência', cost: 'R$ 80–350/mês' },
                  { item: 'Sistema de gestão de projetos', cost: 'R$ 200–600/mês' },
                  { item: 'Deslocamento de atores', cost: 'Variável' },
                  { item: 'Técnico de gravação presencial', cost: 'R$ 80–150/h' },
                ].map(({ item, cost }, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <span className="text-gray-500">{item}</span>
                    <span className="text-red-500 font-semibold">{cost}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 flex items-center justify-between border-t border-gray-100">
                <span className="text-gray-700 font-semibold text-sm">Custo por sessão (estimativa)</span>
                <span className="font-black text-red-500 text-xl" style={{ fontFamily: 'Poppins, sans-serif' }}>R$ 500–2.500</span>
              </div>
            </div>

            {/* HubDub */}
            <div className="bg-[#6d28d9] rounded-2xl p-8 shadow-[0_8px_30px_rgba(109,40,217,0.3)]">
              <p className="font-black text-white mb-6 text-base" style={{ fontFamily: 'Poppins, sans-serif' }}>Com HubDub Studio</p>
              <div className="space-y-4">
                {[
                  { item: 'Sala de gravação remota', cost: 'Incluso' },
                  { item: 'DAW Timeline integrada', cost: 'Incluso' },
                  { item: 'Videoconferência integrada', cost: 'Incluso' },
                  { item: 'Gestão de produções e atores', cost: 'Incluso' },
                  { item: 'Análise de qualidade por IA', cost: 'Incluso' },
                  { item: 'Painel admin + financeiro', cost: 'Incluso' },
                ].map(({ item, cost }, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-white/10 pb-3 last:border-0 last:pb-0">
                    <span className="text-white/80">{item}</span>
                    <span className="text-white font-semibold">{cost}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 flex items-center justify-between border-t border-white/20">
                <span className="text-white/80 font-semibold text-sm">Custo mensal total</span>
                <span className="font-black text-white text-xl" style={{ fontFamily: 'Poppins, sans-serif' }}>R$ 297/mês</span>
              </div>
            </div>
          </div>

          <div className="text-center bg-gray-50 border border-gray-200 rounded-2xl px-8 py-6">
            <p className="font-black text-2xl text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Uma única sessão presencial já paga{' '}
              <span className="text-[#6d28d9]">o plano inteiro do mês.</span>
            </p>
          </div>
        </div>
      </Section>

      {/* ── FLUXO ── */}
      <Section className="py-16 md:py-24 bg-gray-50 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Fluxo de produção</p>
            <h2 className="font-black text-3xl md:text-5xl text-gray-900 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Do upload ao take aprovado</h2>
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
                  transition={{ delay: i * 0.07 }}
                  className="flex-1 flex flex-col items-center text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#6d28d9]/10 flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 text-[#6d28d9]" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm mb-1">{label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </motion.div>
                {i < 5 && (
                  <div className="hidden md:flex items-center justify-center pt-5 shrink-0">
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FEATURES ── */}
      <Section className="py-16 md:py-24 bg-white px-4 md:px-8" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Recursos profissionais</p>
            <h2 className="font-black text-3xl md:text-5xl text-gray-900 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Tudo que um estúdio profissional precisa</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <p className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <Headphones className="w-4 h-4 text-[#6d28d9]" /> Para o diretor
              </p>
              <ul className="space-y-5">
                {[
                  { icon: Monitor, title: 'Painel de revisão em tempo real', desc: 'Cada take chega automaticamente — ouve, edita trim por waveform, aprova ou rejeita com feedback.' },
                  { icon: Layers, title: 'DAW Timeline integrada', desc: 'Visão geral de todos os takes no eixo do tempo, organizados por faixa e personagem.' },
                  { icon: Wand2, title: 'Análise de qualidade por IA', desc: 'Score automático e flags de ruído, clipping e timing para cada take.' },
                  { icon: FileText, title: 'Controle de roteiro por ator', desc: 'Concede ou revoga acesso de cada ator ao roteiro individualmente.' },
                  { icon: BarChart3, title: 'Relatórios de sessão PDF', desc: 'Export automático com todos os takes, aprovações e métricas da sessão.' },
                  { icon: Award, title: 'Múltiplos takes por linha', desc: 'Acumula takes e marca o favorito — workflow idêntico ao estúdio físico.' },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[#6d28d9]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-[#6d28d9]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <Mic className="w-4 h-4 text-[#6d28d9]" /> Para o ator
              </p>
              <ul className="space-y-5">
                {[
                  { icon: Monitor, title: 'Browser-only, qualquer lugar', desc: 'Chrome ou Edge — sem instalar nada. Funciona em PC, notebook ou Mac.' },
                  { icon: FileText, title: 'Vídeo + roteiro sincronizados', desc: 'A linha ativa destaca automaticamente conforme o vídeo avança.' },
                  { icon: Mic, title: 'Waveform em tempo real', desc: 'Monitor de áudio com VU meter durante a gravação para automonitoramento.' },
                  { icon: Shield, title: 'Qualquer microfone USB', desc: 'Interface profissional, USB ou fone de ouvido — todos compatíveis.' },
                  { icon: Clock, title: 'Controle de playback', desc: 'O ator controla início, pausa e repetição sem depender do diretor.' },
                  { icon: Award, title: 'Histórico completo', desc: 'Todos os takes salvos — o ator acompanha sua evolução e o diretor pode revisar retroativamente.' },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[#6d28d9]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-[#6d28d9]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          {/* Requisitos técnicos */}
          <div className="mt-12 bg-gray-50 border border-gray-200 rounded-2xl p-8">
            <p className="font-bold text-gray-900 mb-6 text-sm uppercase tracking-widest" style={{ fontFamily: 'Poppins, sans-serif' }}>Requisitos técnicos mínimos</p>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Diretor / Admin</p>
                <ul className="space-y-2">
                  {['Chrome 110+ ou Edge 110+', '10 Mbps de upload estável', 'Microfone USB ou interface de áudio', 'Arquivo MP4/MOV + roteiro SRT/CSV'].map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-[#6d28d9] shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Ator</p>
                <ul className="space-y-2">
                  {['Chrome 110+', '5 Mbps de upload', 'Fone com microfone embutido já funciona', 'Qualquer ambiente silencioso'].map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-[#6d28d9] shrink-0" />
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
      <Section className="py-16 md:py-24 bg-gray-50 px-4 md:px-8" id="planos">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Planos profissionais</p>
            <h2 className="font-black text-3xl md:text-5xl text-gray-900 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Escale sem contratar técnicos ou alugar mais cabines</h2>
            <p className="text-gray-500 mt-3">Trial de 14 dias em qualquer plano — sem cartão</p>
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
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-7 relative ${highlight ? 'bg-[#6d28d9] text-white shadow-[0_8px_30px_rgba(109,40,217,0.35)]' : 'bg-white border border-gray-200 shadow-sm'}`}
              >
                {highlight && (
                  <div className="absolute top-4 right-4 bg-white text-[#6d28d9] text-xs font-black px-3 py-1 rounded-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Popular
                  </div>
                )}
                <p className="font-black text-lg mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>{name}</p>
                <p className={`text-xs mb-4 ${highlight ? 'text-white/70' : 'text-gray-500'}`}>{target}</p>
                <div className="flex items-end gap-1 mb-6">
                  {price ? (
                    <>
                      <span className="font-black text-3xl" style={{ fontFamily: 'Poppins, sans-serif' }}>R$ {price}</span>
                      <span className={`text-sm mb-1 ${highlight ? 'text-white/70' : 'text-gray-500'}`}>/mês</span>
                    </>
                  ) : (
                    <span className="font-black text-2xl" style={{ fontFamily: 'Poppins, sans-serif' }}>Sob consulta</span>
                  )}
                </div>
                <ul className="space-y-2.5 mb-8">
                  {features.map((f, j) => (
                    <li key={j} className={`flex items-center gap-2.5 text-sm ${highlight ? 'text-white/90' : 'text-gray-600'}`}>
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${highlight ? 'text-white' : 'text-[#6d28d9]'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={price ? '#trial' : 'mailto:contato@hubdub.com.br?subject=HubDub Enterprise'}
                  className={`block text-center font-bold text-sm px-6 py-3 rounded-full transition-all hover:scale-105 ${highlight ? 'bg-white text-[#6d28d9] hover:bg-gray-50' : 'border-2 border-[#6d28d9] text-[#6d28d9] hover:bg-[#6d28d9] hover:text-white'}`}
                >
                  {cta}
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CASOS DE USO ── */}
      <Section className="py-16 md:py-24 bg-white px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Casos de uso</p>
            <h2 className="font-black text-3xl md:text-5xl text-gray-900 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Quem usa e como</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title: 'Estúdio regional', body: 'Reduz custo operacional eliminando aluguel de cabine para sessões de voz. Atende clientes de qualquer cidade.', tag: 'Operação' },
              { title: 'Agência de localização', body: 'Conecta freelancers espalhados pelo país em sessões síncronas por projeto, sem deslocamento.', tag: 'Flexibilidade' },
              { title: 'Produtora multi-cliente', body: 'Usa o plano Pro para separar projetos e equipes em estúdios virtuais distintos dentro da mesma conta.', tag: 'Escala' },
              { title: 'Diretor freelancer', body: 'Monta seu próprio estúdio virtual com atores remotos e entrega produções sem depender de espaço físico.', tag: 'Independência' },
            ].map(({ title, body, tag }, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <span className="inline-block bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full mb-3">{tag}</span>
                <p className="font-bold text-gray-900 text-sm mb-2">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── TRIAL CTA ── */}
      <Section className="py-16 md:py-24 bg-gray-50 px-4 md:px-8" id="trial">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-[#6d28d9] rounded-3xl p-12 shadow-[0_20px_60px_rgba(109,40,217,0.3)]">
            <p className="text-xs font-black uppercase tracking-widest text-white/70 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Trial gratuito</p>
            <h2 className="font-black text-3xl md:text-4xl text-white mb-4 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>14 dias para experimentar tudo</h2>
            <p className="text-white/80 mb-8 leading-relaxed">Todas as features do plano Studio desbloqueadas. Sem cartão de crédito. Configure seu primeiro estúdio virtual em menos de 10 minutos.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="mailto:contato@hubdub.com.br?subject=Trial HubDub — Estudio Profissional" className="bg-white text-[#6d28d9] font-bold px-8 py-4 rounded-full hover:bg-gray-50 transition-all text-sm">
                Começar trial grátis
              </a>
              <a href="https://wa.me/55?text=Olá, quero saber mais sobre o HubDub para estúdios profissionais" className="border-2 border-white/30 text-white font-bold px-8 py-4 rounded-full hover:border-white transition-all text-sm">
                Falar pelo WhatsApp
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 pt-6 border-t border-white/20">
              {['Sem cartão', '14 dias completos', 'Todas as features', 'Suporte incluso'].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-white/70">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white/70" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section className="py-16 md:py-24 bg-white px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Dúvidas frequentes</p>
            <h2 className="font-black text-3xl text-gray-900 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>FAQ para estúdios</h2>
          </div>
          <div className="space-y-3">
            <FaqItem q="A qualidade do áudio gravado é profissional?" a="Sim. A gravação é feita direto no browser via Web Audio API, capturando o sinal bruto do microfone ou interface de áudio sem compressão adicional. O resultado é um arquivo WAV editável em qualquer DAW profissional." />
            <FaqItem q="Os arquivos de áudio ficam seguros? Quem tem acesso?" a="Os takes são armazenados com criptografia em repouso (AES-256). Apenas usuários do seu estúdio têm acesso. Nunca compartilhamos ou acessamos seu conteúdo. No Enterprise, oferecemos SLA de uptime e termos de confidencialidade específicos." />
            <FaqItem q="Posso integrar com minha DAW atual (Pro Tools, Logic, etc.)?" a="Sim. Os takes aprovados são exportáveis como arquivos WAV individuais ou em lote, prontos para importação em qualquer DAW. A DAW Timeline do HubDub é complementar ao seu fluxo de pós-produção." />
            <FaqItem q="O que acontece se a internet cair durante uma sessão?" a="Os takes já gravados são salvos localmente e sincronizados quando a conexão retorna. A sessão pode ser reiniciada do ponto onde parou sem perder nenhum take aprovado." />
            <FaqItem q="Existe SLA de uptime garantido?" a="No plano Studio e Pro oferecemos 99,5% de uptime com monitoramento contínuo. O plano Enterprise inclui SLA 99,9% em contrato, com janelas de manutenção comunicadas com 72h de antecedência." />
          </div>
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <footer className="py-10 border-t border-gray-100 bg-white px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-black text-gray-900 text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>HubDub</p>
            <p className="text-gray-500 text-sm mt-1">Plataforma profissional de dublagem remota</p>
          </div>
          <div className="flex items-center gap-6">
            <a href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Página principal</a>
            <a href="/b2b/escolas" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Escolas de dublagem</a>
            <a href="mailto:contato@hubdub.com.br" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">contato@hubdub.com.br</a>
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} HubDub. Todos os direitos reservados.</p>
        </div>
      </footer>

    </div>
  );
}

export default B2BEstudios;
