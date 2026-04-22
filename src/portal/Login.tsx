import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { firebaseService } from '../services/supabaseService';

export function Login({ onLogin, onBack }: { onLogin: (user: any) => void, onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await firebaseService.signIn(email, password);
      if (result.user) {
        onLogin(result.user);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Preencha o e-mail acima para redefinir a senha.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await firebaseService.resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de redefinição.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="w-full flex flex-col justify-center px-8 sm:px-16 md:px-24 relative bg-white">
        <button
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao site
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full mx-auto"
        >
          <div className="mb-10">
            <h2 className="text-2xl text-gray-900 mb-2 font-display tracking-tight">Portal do Aluno</h2>
            <p className="text-gray-500 text-sm">Acesse sua conta para continuar seus estudos.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
            {resetSent && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
                E-mail de redefinição enviado! Verifique sua caixa de entrada.
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm text-gray-600">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-500 transition-colors text-sm"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600">Senha</label>
                <button type="button" onClick={handleResetPassword} className="text-xs text-cyan-600 hover:text-cyan-700 transition-colors">Esqueceu a senha?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-500 transition-colors text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-6 text-sm rounded-xl bg-gray-900 hover:bg-gray-800 text-white transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Entrando...' : 'Entrar na Plataforma'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
