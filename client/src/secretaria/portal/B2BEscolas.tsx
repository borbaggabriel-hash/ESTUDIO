import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  GraduationCap, BookOpen, Users, Mic, Monitor, CheckCircle2,
  ChevronDown, ChevronRight, ArrowRight, Shield,
  Award, Headphones, FileText, BarChart3,
  Calendar, DollarSign, X, Menu,
  TrendingUp, Layers, Settings
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

export function B2BEscolas() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Rubik, sans-serif', color: '#111827' }}>

      {/* ── NAV ── */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-[68px] flex items-center justify-between">
          <a href="/" className="font-black text-xl tracking-tight font-poppins text-gray-900">THE HUB</a>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#modalidades" className="text-sm font-medium text-gray-500 hover:text-[#6d28d9] transition-colors">Modalidades</a>
            <a href="#features" className="text-sm font-medium text-gray-500 hover:text-[#6d28d9] transition-colors">Plataforma</a>
            <a href="#planos" className="text-sm font-medium text-gray-500 hover:text-[#6d28d9] transition-colors">Planos</a>
            <a href="/b2b/estudios" className="text-sm font-medium text-gray-500 hover:text-[#6d28d9] transition-colors">Estúdios Profissionais →</a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <a href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">← Voltar</a>
            <a href="#piloto" className="bg-[#6d28d9] text-white font-bold rounded-full px-5 py-2.5 text-sm hover:bg-[#5b21b6] transition-all shadow-[0_4px_14px_rgba(109,40,217,0.3)]">
              Piloto gratuito
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
                <a href="#modalidades" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#6d28d9] py-3 border-b border-gray-50 transition-colors">Modalidades</a>
                <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#6d28d9] py-3 border-b border-gray-50 transition-colors">Plataforma</a>
                <a href="#planos" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#6d28d9] py-3 border-b border-gray-50 transition-colors">Planos</a>
                <a href="/b2b/estudios" className="text-sm font-medium text-gray-600 hover:text-[#6d28d9] py-3 border-b border-gray-50 transition-colors">Estúdios Profissionais →</a>
                <a href="#piloto" onClick={() => setMobileOpen(false)} className="mt-3 bg-[#6d28d9] text-white font-bold rounded-full px-5 py-3 text-sm text-center hover:bg-[#5b21b6] transition-all">Piloto gratuito</a>
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
                Compatível com exigências MEC
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-black leading-tight mb-6 text-gray-900"
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(2.2rem, 5vw, 3.75rem)', lineHeight: 1.08 }}
            >
              Transforme sua escola no primeiro curso de{' '}
              <span className="text-[#6d28d9]">dublagem remota</span>{' '}
              do Brasil.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-gray-500 mb-8 max-w-xl leading-relaxed"
            >
              HubDub é a plataforma SaaS de dublagem profissional que vira infraestrutura de ensino — seus alunos gravam, recebem direção e constroem portfolio, tudo sem precisar de estúdio físico.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <a href="#piloto" className="bg-[#6d28d9] text-white font-bold text-base px-8 py-4 rounded-full hover:bg-[#5b21b6] transition-all shadow-[0_8px_30px_rgba(109,40,217,0.35)] flex items-center justify-center gap-2 group">
                Começar piloto gratuito — 30 dias <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#modalidades" className="border-2 border-gray-200 text-gray-700 font-bold text-base px-8 py-4 rounded-full hover:border-[#6d28d9] hover:text-[#6d28d9] transition-all flex items-center justify-center">
                Ver modalidades
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-10 border-y border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-3 gap-4">
            <StatCard value={30} suffix=" dias" label="Piloto gratuito, sem cartão" delay={0.1} />
            <StatCard value={10} suffix=" min" label="Configuração inicial completa" delay={0.2} />
            <StatCard value={0} suffix=" instalação" label="Funciona 100% no browser" delay={0.3} />
          </div>
        </div>
      </section>

      {/* ── PROBLEMA ── */}
      <Section className="py-16 md:py-24 bg-white px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>O problema</p>
            <h2 className="font-black text-3xl md:text-5xl text-gray-900 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Seu aluno se forma pronto para o mercado de ontem</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: TrendingUp, title: 'O mercado migrou para o remoto', body: 'Mais de 60% das sessões profissionais de dublagem no Brasil já são conduzidas remotamente. O aluno sem essa experiência chega despreparado.' },
              { icon: DollarSign, title: 'Laboratório físico é caro e limitado', body: 'Manter uma cabine de gravação profissional custa R$80–300k na instalação e R$5–15k/mês em manutenção. Impossível para a maioria das escolas.' },
              { icon: Award, title: 'Competência digital é pré-requisito', body: 'Estúdios e agências exigem que o ator saiba operar em ambiente remoto: sincronização de vídeo, controle de take, comunicação com diretor a distância.' },
            ].map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-[#6d28d9]/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#6d28d9]" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-base">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── MODALIDADES ── */}
      <Section className="py-16 md:py-24 bg-gray-50 px-4 md:px-8" id="modalidades">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Duas formas de oferecer</p>
            <h2 className="font-black text-3xl md:text-5xl text-gray-900 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Escolha a modalidade certa para sua instituição</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Curso Livre */}
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#6d28d9]/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-[#6d28d9]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>Curso Livre</p>
                  <p className="text-sm text-gray-500">Para qualquer escola ou instrutor</p>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Nenhuma burocracia regulatória',
                  'Implementação imediata — em dias, não meses',
                  'Qualquer escola, qualquer cidade',
                  'Flexibilidade total de carga horária',
                  'Certificado emitido pela própria escola',
                  'Preço de acesso a partir de R$ 97/mês',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#6d28d9] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <a href="#piloto" className="inline-flex items-center gap-2 bg-[#6d28d9] text-white font-bold text-sm px-6 py-3 rounded-full hover:bg-[#5b21b6] transition-all">
                Começar agora <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>

            {/* Pós-graduação */}
            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-white border-2 border-[#6d28d9]/20 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#6d28d9]/10 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-[#6d28d9]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>Pós-graduação</p>
                  <p className="text-sm text-gray-500">Para instituições reconhecidas pelo MEC</p>
                </div>
              </div>
              <div className="mb-5 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">Ementa sugerida:</span> Tecnologia em Dublagem Remota — 360h</p>
              </div>
              <ul className="space-y-3 mb-4">
                {[
                  'Módulo 1 — Fundamentos de Dublagem (60h)',
                  'Módulo 2 — Tecnologia de Gravação Remota (80h)',
                  'Módulo 3 — Direção de Atores a Distância (60h)',
                  'Módulo 4 — Pós-produção e DAW (80h)',
                  'Módulo 5 — Projeto Prático com Cliente Real (80h)',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-[#6d28d9]/10 text-[#6d28d9] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {item}
                  </li>
                ))}
              </ul>
              <ul className="space-y-2 mb-8 pt-4 border-t border-gray-100">
                {[
                  'Carga horária 100% documentável e rastreável',
                  'Frequência e aprovação pelo painel admin',
                  'Portfolio de takes aprovados como TCC prático',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#6d28d9] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <a href="#piloto" className="inline-flex items-center gap-2 border-2 border-[#6d28d9] text-[#6d28d9] font-bold text-sm px-6 py-3 rounded-full hover:bg-[#6d28d9] hover:text-white transition-all">
                Conversar com especialista <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ── FLUXO PEDAGÓGICO ── */}
      <Section className="py-16 md:py-24 bg-white px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Como funciona</p>
            <h2 className="font-black text-3xl md:text-5xl text-gray-900 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Do zero ao take aprovado</h2>
          </div>
          <div className="flex flex-col md:flex-row items-start gap-4">
            {[
              { icon: Settings, label: 'Escola configura', desc: 'Cadastra professores, turmas e o vídeo de exercício em minutos.' },
              { icon: Users, label: 'Professor agenda', desc: 'Cria a sessão prática e convida os alunos com um link.' },
              { icon: Mic, label: 'Alunos gravam', desc: 'Acessam pelo browser, veem o roteiro sincronizado e gravam takes.' },
              { icon: Headphones, label: 'Feedback ao vivo', desc: 'Professor ouve, comenta e aprova direto na plataforma.' },
              { icon: Award, label: 'Portfolio gerado', desc: 'Takes aprovados ficam salvos no histórico permanente do aluno.' },
            ].map(({ icon: Icon, label, desc }, i) => (
              <React.Fragment key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex-1 flex flex-col items-center text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#6d28d9]/10 flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 text-[#6d28d9]" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm mb-1">{label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </motion.div>
                {i < 4 && (
                  <div className="hidden md:flex items-center justify-center pt-5 shrink-0">
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FEATURES ── */}
      <Section className="py-16 md:py-24 bg-gray-50 px-4 md:px-8" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>A plataforma</p>
            <h2 className="font-black text-3xl md:text-5xl text-gray-900 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Tudo que a instituição e o aluno precisam</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <p className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <Shield className="w-4 h-4 text-[#6d28d9]" /> Para a instituição
              </p>
              <ul className="space-y-5">
                {[
                  { icon: BarChart3, title: 'Painel administrativo completo', desc: 'Todos os alunos, matrículas, progresso e situação financeira em um só lugar.' },
                  { icon: DollarSign, title: 'Controle financeiro integrado', desc: 'Emissão de faturas, status de pagamento e histórico por aluno.' },
                  { icon: FileText, title: 'Comunicação centralizada', desc: 'Avisos e comunicados entregues diretamente no painel do aluno.' },
                  { icon: Headphones, title: 'Suporte rastreável', desc: 'Chamados dos alunos com histórico completo de atendimento.' },
                  { icon: TrendingUp, title: 'Painel de captadores', desc: 'Cada captador vê seus alunos e comissões em painel separado.' },
                  { icon: Calendar, title: 'Agenda de sessões', desc: 'Calendário visual com todas as sessões práticas marcadas.' },
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
                <GraduationCap className="w-4 h-4 text-[#6d28d9]" /> Para o aluno
              </p>
              <ul className="space-y-5">
                {[
                  { icon: Monitor, title: 'Sessão de gravação ao vivo', desc: 'Acessa pelo browser, vê o vídeo sincronizado, grava take por take.' },
                  { icon: FileText, title: 'Roteiro sincronizado', desc: 'A linha ativa destaca automaticamente conforme o vídeo avança.' },
                  { icon: Mic, title: 'Waveform em tempo real', desc: 'Monitor de áudio e VU meter durante a gravação para automonitoramento.' },
                  { icon: Layers, title: 'Histórico completo de evolução', desc: 'Todos os takes ficam salvos — o aluno acompanha sua evolução por sessão.' },
                  { icon: Award, title: 'Portfolio de takes aprovados', desc: 'Takes aprovados pelo professor compõem o portfolio oficial do aluno.' },
                  { icon: Calendar, title: 'Agenda e comunicados', desc: 'Visualiza sessões marcadas e recebe avisos da escola no painel.' },
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
        </div>
      </Section>

      {/* ── PLANOS ── */}
      <Section className="py-16 md:py-24 bg-white px-4 md:px-8" id="planos">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Planos para escolas</p>
            <h2 className="font-black text-3xl md:text-5xl text-gray-900 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Comece no plano certo para sua turma</h2>
            <p className="text-gray-500 mt-3">Todos os planos incluem 30 dias de piloto gratuito</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Solo', price: 97, highlight: false, target: 'Instrutor independente', features: ['1 estúdio virtual', 'Até 5 alunos', '3 produções ativas', 'Sessões ilimitadas', '5 GB de takes', 'DAW Timeline'] },
              { name: 'Studio', price: 297, highlight: true, target: 'Escola de dublagem', features: ['1 estúdio virtual', 'Até 20 alunos', 'Produções ilimitadas', 'Sessões ilimitadas', '50 GB de takes', 'Análise de qualidade IA', 'Onboarding guiado'] },
              { name: 'Pro', price: 697, highlight: false, target: 'Escola com múltiplas turmas', features: ['Até 5 estúdios virtuais', 'Alunos ilimitados', 'Produções ilimitadas', '200 GB de takes', 'Relatórios de sessão PDF', 'SLA 4h úteis', 'Onboarding personalizado'] },
            ].map(({ name, price, highlight, target, features }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-7 relative ${highlight ? 'bg-[#6d28d9] text-white shadow-[0_8px_30px_rgba(109,40,217,0.35)]' : 'bg-white border border-gray-200 shadow-sm'}`}
              >
                {highlight && <div className="absolute top-4 right-4 bg-white text-[#6d28d9] text-xs font-black px-3 py-1 rounded-full" style={{ fontFamily: 'Poppins, sans-serif' }}>Recomendado</div>}
                <p className="font-black text-lg mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>{name}</p>
                <p className={`text-xs mb-4 ${highlight ? 'text-white/70' : 'text-gray-500'}`}>{target}</p>
                <div className="flex items-end gap-1 mb-6">
                  <span className="font-black text-3xl" style={{ fontFamily: 'Poppins, sans-serif' }}>R$ {price}</span>
                  <span className={`text-sm mb-1 ${highlight ? 'text-white/70' : 'text-gray-500'}`}>/mês</span>
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
                  href="#piloto"
                  className={`block text-center font-bold text-sm px-6 py-3 rounded-full transition-all hover:scale-105 ${highlight ? 'bg-white text-[#6d28d9] hover:bg-gray-50' : 'border-2 border-[#6d28d9] text-[#6d28d9] hover:bg-[#6d28d9] hover:text-white'}`}
                >
                  Começar grátis
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CASOS DE USO ── */}
      <Section className="py-16 md:py-24 bg-gray-50 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Casos de uso</p>
            <h2 className="font-black text-3xl md:text-5xl text-gray-900 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Quem usa e como</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title: 'Escola de artes cênicas', body: 'Adiciona módulo de dublagem remota ao currículo existente sem reformar o espaço físico.', tag: 'Curso livre' },
              { title: 'Instituto de idiomas', body: 'Usa dublagem como método de imersão linguística — alunos dubam em inglês ou espanhol com direção ao vivo.', tag: 'Inovação pedagógica' },
              { title: 'Pós em Comunicação', body: 'Instituição MEC-credenciada inclui módulo prático de tecnologia de dublagem na grade de pós-graduação.', tag: 'Pós-graduação' },
              { title: 'Academia de voz', body: 'Professor independente cria turma virtual e oferece curso de dublagem totalmente online com certificado.', tag: 'Instrutor solo' },
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

      {/* ── PILOTO CTA ── */}
      <Section className="py-16 md:py-24 bg-white px-4 md:px-8" id="piloto">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-[#6d28d9] rounded-3xl p-12 shadow-[0_20px_60px_rgba(109,40,217,0.3)]">
            <p className="text-xs font-black uppercase tracking-widest text-white/70 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Piloto gratuito</p>
            <h2 className="font-black text-3xl md:text-4xl text-white mb-4 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>30 dias para provar que funciona</h2>
            <p className="text-white/80 mb-8 leading-relaxed">Sem cartão de crédito. Sem compromisso. Fazemos o onboarding juntos e acompanhamos a primeira turma.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="mailto:contato@hubdub.com.br?subject=Piloto HubDub — Escola" className="bg-white text-[#6d28d9] font-bold px-8 py-4 rounded-full hover:bg-gray-50 transition-all text-sm">
                Quero o piloto gratuito
              </a>
              <a href="https://wa.me/55?text=Olá, quero saber mais sobre o HubDub para escolas" className="border-2 border-white/30 text-white font-bold px-8 py-4 rounded-full hover:border-white transition-all text-sm">
                Falar pelo WhatsApp
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 pt-6 border-t border-white/20">
              {['Sem cartão', 'Sem compromisso', 'Onboarding incluso', 'Suporte direto'].map((item, i) => (
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
      <Section className="py-16 md:py-24 bg-gray-50 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Dúvidas frequentes</p>
            <h2 className="font-black text-3xl text-gray-900 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>FAQ para instituições</h2>
          </div>
          <div className="space-y-3">
            <FaqItem q="A plataforma é compatível com o que o MEC exige para pós-graduação?" a="Sim. O HubDub registra presença, carga horária, atividades e progresso de cada aluno em formato documentável. As sessões práticas contam como horas de laboratório. Podemos fornecer relatórios no formato exigido pela instituição." />
            <FaqItem q="Os alunos precisam comprar equipamento especial?" a="Não. Um computador com microfone (pode ser o do fone de ouvido comum) e conexão de 5 Mbps é suficiente. Não há instalação de software — tudo funciona no Chrome ou Edge." />
            <FaqItem q="Como funciona a integração com o currículo atual?" a="O HubDub não substitui nada — é uma camada de laboratório prático. O professor continua com suas aulas teóricas normalmente e usa a plataforma para as sessões de gravação." />
            <FaqItem q="É possível personalizar com a marca da escola?" a="No plano Pro e Enterprise é possível adicionar logo e nome da instituição. Para pós-graduações MEC, oferecemos configuração personalizada." />
            <FaqItem q="O que acontece com os dados dos alunos após o cancelamento?" a="Os dados ficam disponíveis por 90 dias após o cancelamento para exportação. Nunca vendemos ou compartilhamos dados de alunos com terceiros." />
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
            <a href="/b2b/estudios" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Estúdios profissionais</a>
            <a href="mailto:contato@hubdub.com.br" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">contato@hubdub.com.br</a>
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} HubDub. Todos os direitos reservados.</p>
        </div>
      </footer>

    </div>
  );
}

export default B2BEscolas;
