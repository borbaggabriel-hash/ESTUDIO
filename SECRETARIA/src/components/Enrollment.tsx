import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, User, Mail, Phone, BookOpen, CheckCircle2, Mic, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';

interface EnrollmentProps {
  isOpen: boolean;
  onClose: () => void;
  modules: any[];
  initialModule?: string;
  onEnroll: (data: any) => void;
}

export const Enrollment: React.FC<EnrollmentProps> = ({ isOpen, onClose, modules, initialModule, onEnroll }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    module: initialModule || '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, module: initialModule || '' }));
      setIsSuccess(false);
    }
  }, [isOpen, initialModule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Saving to Supabase via App.tsx callback
      await onEnroll(formData);
      setIsSuccess(true);
      
      // Reset form after some time and close
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({ name: '', email: '', phone: '', module: '', message: '' });
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Enrollment error:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[90vh] flex flex-col"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 md:top-6 md:right-6 p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-colors z-50"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <div className="grid md:grid-cols-5 h-full overflow-y-auto custom-scrollbar">
              {/* Left Side - Info */}
              <div className="hidden md:flex md:col-span-2 relative overflow-hidden flex-col justify-between p-6 md:p-12 text-white md:min-h-full text-center md:text-left items-center md:items-start">
                <div className="absolute inset-0 z-0">
                  <img 
                    src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1000&auto=format&fit=crop" 
                    className="w-full h-full object-cover scale-110 blur-[1px] md:blur-[2px]"
                    alt="Studio"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 to-black/90 md:from-blue-700/90 md:to-blue-900/90 mix-blend-multiply" />
                  <div className="absolute inset-0 bg-black/40 md:bg-black/20" />
                </div>

                <div className="relative z-10 flex flex-col items-center md:items-start">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 md:mb-8 border border-white/20">
                    <Mic className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <h2 className="text-2xl md:text-4xl font-black font-display leading-[1.1] mb-4 md:mb-6 tracking-tight">
                    Sua voz, <br/>
                    <span className="text-blue-200 md:text-blue-200 neon-text-blue">sua marca.</span>
                  </h2>
                  <p className="font-medium text-blue-50/80 leading-relaxed text-sm md:text-lg max-w-[280px] md:max-w-none">
                    O mercado de dublagem cresce a cada dia. Comece hoje sua preparação.
                  </p>
                </div>
                
                <div className="relative z-10 flex flex-col items-center md:items-start space-y-4 md:space-y-6 mt-8 md:mt-12 hidden sm:flex">
                  <div className="flex items-center gap-3 md:gap-4 group">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-blue-400 group-hover:text-black transition-all duration-300">
                      <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">Consultoria de Carreira</span>
                  </div>
                  <div className="flex items-center gap-3 md:gap-4 group">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-blue-400 group-hover:text-black transition-all duration-300">
                      <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">Acesso ao Portal</span>
                  </div>
                </div>
              </div>

              {/* Right Side - Form */}
              <div className="col-span-full md:col-span-3 p-6 md:p-12 bg-[#0a0a0a] md:border-l border-white/5">
                {isSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center py-12"
                  >
                    <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-10 h-10 text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-4 font-display">Solicitação Enviada!</h3>
                    <p className="text-gray-400 leading-relaxed">Recebemos seu interesse. Um de nossos consultores entrará em contato via WhatsApp ou E-mail em breve.</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1 group-focus-within:text-blue-400 transition-colors">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          required
                          type="text"
                          placeholder="Como quer ser chamado?"
                          className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-5 pl-12 pr-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-blue-500/30 focus:bg-white/[0.04] transition-all duration-300"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1 group-focus-within:text-blue-400 transition-colors">E-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          required
                          type="email"
                          placeholder="seu@email.com"
                          className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-5 pl-12 pr-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-blue-500/30 focus:bg-white/[0.04] transition-all duration-300"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1 group-focus-within:text-blue-400 transition-colors">WhatsApp</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          required
                          type="tel"
                          placeholder="(00) 00000-0000"
                          className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-5 pl-12 pr-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-blue-500/30 focus:bg-white/[0.04] transition-all duration-300"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1 group-focus-within:text-blue-400 transition-colors">Módulo de Interesse</label>
                      <div className="relative">
                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-blue-400 transition-colors" />
                        <select
                          required
                          className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-5 pl-12 pr-10 text-white appearance-none focus:outline-none focus:border-blue-500/30 focus:bg-white/[0.04] transition-all duration-300"
                          value={formData.module}
                          onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                        >
                          <option value="" disabled className="bg-[#0a0a0a]">Selecione um módulo</option>
                          {modules.map((m, idx) => (
                            <option key={m.slug || m.title || idx} value={m.title} className="bg-[#0a0a0a]">{m.title}</option>
                          ))}
                          <option value="Formação Completa" className="bg-[#0a0a0a]">Formação Completa (Todos os Módulos)</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                      </div>
                    </div>

                    <div className="pt-6">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-8 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(37,99,235,0.2)] hover:shadow-[0_20px_50px_rgba(37,99,235,0.4)] transition-all duration-500 relative overflow-hidden group flex items-center justify-center neon-glow-blue"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        
                        <div className="relative z-10 flex items-center justify-center gap-3">
                          {isSubmitting ? (
                            <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <span className="leading-none">Enviar Solicitação</span>
                              <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
                            </>
                          )}
                        </div>
                      </Button>
                    </div>

                    <p className="text-[9px] text-center text-gray-600 uppercase tracking-[0.3em] font-black leading-loose">
                      Ao enviar, você concorda com nossos <br/>
                      <span className="text-gray-400 hover:text-blue-400 cursor-pointer transition-colors hover:neon-text-blue">termos de privacidade</span>.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
