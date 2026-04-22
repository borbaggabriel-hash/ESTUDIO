import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Shield, ArrowLeft, ChevronRight } from 'lucide-react';

interface SecretariaProps {
  onStudentLogin: () => void;
  onAdminLogin: () => void;
  onBack: () => void;
}

export function Secretaria({ onStudentLogin, onAdminLogin, onBack }: SecretariaProps) {
  return (
    <div className="min-h-screen bg-[#f4f5f7] text-gray-900 font-sans flex flex-col relative overflow-hidden">
      {/* Subtle background accents */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-100/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none" />

      {/* Back button */}
      <div className="relative z-10 p-6 md:p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao site
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center mb-12 text-center"
        >
          <h1 className="text-5xl md:text-6xl font-black font-display tracking-tighter mb-3 text-gray-900">
            THE HUB
          </h1>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-16 bg-gray-200" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Secretaria Digital</span>
            <div className="h-px w-16 bg-gray-200" />
          </div>
          <p className="text-gray-500 text-base md:text-lg max-w-md">
            Acesse o portal do aluno ou o painel administrativo da escola.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl">
          {/* Student card */}
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onClick={onStudentLogin}
            className="group relative p-8 md:p-10 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-cyan-300 hover:bg-cyan-50/50 transition-all text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-cyan-200/60 transition-colors" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-gray-900 font-display mb-2">
                Portal do Aluno
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Acompanhe seu progresso, acesse suas aulas, veja mensagens da escola e gerencie seu financeiro.
              </p>
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                Entrar como aluno <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.button>

          {/* Admin card */}
          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onClick={onAdminLogin}
            className="group relative p-8 md:p-10 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-200/60 transition-colors" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                <Shield className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-gray-900 font-display mb-2">
                Painel Administrativo
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Gerencie alunos, matrículas, conteúdo do site, mensagens e configurações da plataforma.
              </p>
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                Entrar como admin <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.button>
        </div>

        {/* Footer info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 text-xs text-gray-400 text-center"
        >
          Primeiro acesso? Suas credenciais são fornecidas pela escola.
        </motion.p>
      </div>
    </div>
  );
}
