import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, TrendingUp, LogOut,
  Plus, ChevronRight, DollarSign, CheckCircle,
  Clock, AlertCircle, Search, X, Eye, EyeOff,
  CreditCard, Calendar, User, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Toaster, toast } from 'sonner';

interface Aluno {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  enrollment?: {
    module?: string;
    status?: string;
    progress?: number;
  };
  invoices: Array<{
    id: string;
    description?: string;
    amount?: string;
    dueDate?: string;
    due_date?: string;
    status?: string;
  }>;
}

interface ComissaoMes {
  mes: string;
  total: number;
  comissao: number;
  faturas: number;
}

export function VendedorPanel({ onLogout, currentUser }: { onLogout: () => void; currentUser: any }) {
  const [activeTab, setActiveTab] = useState<'inicio' | 'alunos' | 'comissoes'>('inicio');
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [percentual, setPercentual] = useState(10);
  const [meses, setMeses] = useState<ComissaoMes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [showCadastro, setShowCadastro] = useState(false);
  const [novoAluno, setNovoAluno] = useState({ full_name: '', email: '', password: '', module_title: '', module_slug: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isCriando, setIsCriando] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [alunosRes, comissoesRes] = await Promise.all([
        fetch('/api/hub/vendedor/alunos', { credentials: 'include' }),
        fetch('/api/hub/vendedor/comissoes', { credentials: 'include' }),
      ]);
      const alunosData = await alunosRes.json();
      const comissoesData = await comissoesRes.json();
      setAlunos(Array.isArray(alunosData) ? alunosData : []);
      setPercentual(comissoesData.percentual ?? 10);
      setMeses(comissoesData.meses ?? []);
    } catch {
      toast.error('Erro ao carregar dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCriarAluno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoAluno.full_name || !novoAluno.email || !novoAluno.password || !novoAluno.module_title) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setIsCriando(true);
    try {
      const res = await fetch('/api/hub/admin/students', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoAluno),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao criar aluno.');
      // Link vendedor to enrollment
      await fetch(`/api/hub/admin/students/${data.id}/enrollment`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: novoAluno.module_title,
          moduleSlug: novoAluno.module_slug,
          vendedorId: currentUser?.id,
        }),
      });
      toast.success(`Aluno ${novoAluno.full_name} cadastrado com sucesso!`);
      setNovoAluno({ full_name: '', email: '', password: '', module_title: '', module_slug: '' });
      setShowCadastro(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar.');
    } finally {
      setIsCriando(false);
    }
  };

  const filteredAlunos = alunos.filter(a =>
    (a.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const mesAtual = new Date().toISOString().slice(0, 7);
  const comissaoMesAtual = meses.find(m => m.mes === mesAtual);
  const totalFaturadoMes = comissaoMesAtual?.total ?? 0;
  const comissaoEstimadaMes = comissaoMesAtual?.comissao ?? 0;
  const alunosAtivos = alunos.filter(a => a.enrollment?.status === 'Ativo').length;
  const alunosPendentes = alunos.filter(a => {
    const pending = (a.invoices || []).some(i => i.status === 'Pendente');
    return pending;
  }).length;

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatMes = (mes: string) => {
    const [year, month] = mes.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const statusColor = (s?: string) => {
    if (s === 'Ativo') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (s === 'Pendente') return 'text-amber-700 bg-amber-50 border-amber-200';
    if (s === 'Inativo') return 'text-gray-500 bg-gray-100 border-gray-200';
    return 'text-gray-500 bg-gray-100 border-gray-200';
  };

  const invoiceStatusColor = (s?: string) => {
    if (s === 'Pago') return 'text-emerald-700 bg-emerald-50';
    if (s === 'Pendente') return 'text-amber-700 bg-amber-50';
    return 'text-gray-500 bg-gray-50';
  };

  const menuItems = [
    { id: 'inicio', label: 'Início', icon: LayoutDashboard },
    { id: 'alunos', label: 'Meus Alunos', icon: Users },
    { id: 'comissoes', label: 'Comissões', icon: TrendingUp },
  ] as const;

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex font-sans text-foreground">
      <Toaster theme="light" position="top-center" />

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex shrink-0">
        <div className="px-5 py-5 border-b border-gray-200">
          <span className="font-black text-lg tracking-tighter font-display text-gray-900 block leading-none">THE HUB</span>
          <span className="text-[10px] tracking-widest text-gray-400 uppercase">Portal do Vendedor</span>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 pt-3">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm text-left relative ${
                  isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-violet-500 rounded-full" />}
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
                <span className="flex-1">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
            <p className="text-xs font-semibold text-violet-600">{percentual}% de comissão</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" /> Sair da conta
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-5xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  {/* ── INÍCIO ── */}
                  {activeTab === 'inicio' && (
                    <div className="space-y-6">
                      <div>
                        <h1 className="text-2xl font-black text-gray-900 font-display">Olá, {currentUser?.fullName || currentUser?.displayName || 'Vendedor'} 👋</h1>
                        <p className="text-gray-500 text-sm mt-1">Acompanhe seus alunos e comissões em tempo real.</p>
                      </div>

                      {/* KPI Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                              <Users className="w-5 h-5 text-violet-600" />
                            </div>
                            <span className="text-xs text-gray-500 uppercase tracking-widest">Alunos</span>
                          </div>
                          <p className="text-3xl font-black text-gray-900">{alunos.length}</p>
                          <p className="text-xs text-gray-400 mt-1">{alunosAtivos} ativos</p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                              <AlertCircle className="w-5 h-5 text-amber-500" />
                            </div>
                            <span className="text-xs text-gray-500 uppercase tracking-widest">Pendentes</span>
                          </div>
                          <p className="text-3xl font-black text-gray-900">{alunosPendentes}</p>
                          <p className="text-xs text-gray-400 mt-1">faturas em aberto</p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                              <DollarSign className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="text-xs text-gray-500 uppercase tracking-widest">Faturado / mês</span>
                          </div>
                          <p className="text-3xl font-black text-gray-900">{formatCurrency(totalFaturadoMes)}</p>
                          <p className="text-xs text-gray-400 mt-1">em pagamentos recebidos</p>
                        </div>

                        <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 shadow-sm text-white">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                              <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xs text-violet-200 uppercase tracking-widest">Sua comissão</span>
                          </div>
                          <p className="text-3xl font-black">{formatCurrency(comissaoEstimadaMes)}</p>
                          <p className="text-xs text-violet-200 mt-1">{percentual}% sobre o faturado</p>
                        </div>
                      </div>

                      {/* Últimos alunos */}
                      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">Últimos alunos cadastrados</p>
                          <button onClick={() => setActiveTab('alunos')} className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1">
                            Ver todos <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                        {alunos.length === 0 ? (
                          <div className="py-10 text-center">
                            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">Nenhum aluno cadastrado ainda.</p>
                            <button onClick={() => setShowCadastro(true)} className="mt-3 text-violet-600 text-sm hover:underline">Cadastrar primeiro aluno →</button>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-50">
                            {alunos.slice(0, 5).map(aluno => (
                              <div key={aluno.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">
                                  {(aluno.full_name || aluno.email || '?')[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 truncate">{aluno.full_name || aluno.email}</p>
                                  <p className="text-xs text-gray-400 truncate">{aluno.enrollment?.module || '—'}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(aluno.enrollment?.status)}`}>
                                  {aluno.enrollment?.status || 'Sem matrícula'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── ALUNOS ── */}
                  {activeTab === 'alunos' && (
                    <div className="space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h1 className="text-2xl font-black text-gray-900 font-display">Meus Alunos</h1>
                          <p className="text-gray-500 text-sm">{alunos.length} aluno{alunos.length !== 1 ? 's' : ''} cadastrado{alunos.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button
                          onClick={() => setShowCadastro(true)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                          <Plus className="w-4 h-4" /> Novo Aluno
                        </button>
                      </div>

                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          placeholder="Buscar por nome ou email..."
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 transition-colors"
                        />
                      </div>

                      {filteredAlunos.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">Nenhum aluno encontrado.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredAlunos.map(aluno => {
                            const pendentes = aluno.invoices.filter(i => i.status === 'Pendente').length;
                            const pagos = aluno.invoices.filter(i => i.status === 'Pago').length;
                            return (
                              <div key={aluno.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <button
                                  onClick={() => setSelectedAluno(selectedAluno?.id === aluno.id ? null : aluno)}
                                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                                >
                                  <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-bold shrink-0">
                                    {(aluno.full_name || aluno.email || '?')[0].toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900">{aluno.full_name || '—'}</p>
                                    <p className="text-xs text-gray-400">{aluno.email}</p>
                                  </div>
                                  <div className="hidden sm:flex items-center gap-3">
                                    {pendentes > 0 && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                        {pendentes} pendente{pendentes > 1 ? 's' : ''}
                                      </span>
                                    )}
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(aluno.enrollment?.status)}`}>
                                      {aluno.enrollment?.status || 'Sem matrícula'}
                                    </span>
                                  </div>
                                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${selectedAluno?.id === aluno.id ? 'rotate-90' : ''}`} />
                                </button>

                                <AnimatePresence>
                                  {selectedAluno?.id === aluno.id && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden border-t border-gray-100"
                                    >
                                      <div className="p-5 space-y-5">
                                        {/* Info */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                          <div className="bg-gray-50 rounded-xl p-3">
                                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Módulo</p>
                                            <p className="text-sm text-gray-900">{aluno.enrollment?.module || '—'}</p>
                                          </div>
                                          <div className="bg-gray-50 rounded-xl p-3">
                                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Progresso</p>
                                            <p className="text-sm text-gray-900">{aluno.enrollment?.progress ?? 0}%</p>
                                          </div>
                                          <div className="bg-gray-50 rounded-xl p-3">
                                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Faturas pagas</p>
                                            <p className="text-sm text-emerald-700 font-semibold">{pagos}</p>
                                          </div>
                                          <div className="bg-gray-50 rounded-xl p-3">
                                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Faturas pend.</p>
                                            <p className="text-sm text-amber-700 font-semibold">{pendentes}</p>
                                          </div>
                                        </div>

                                        {/* Faturas */}
                                        {aluno.invoices.length > 0 && (
                                          <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Histórico financeiro</p>
                                            <div className="space-y-2">
                                              {aluno.invoices.map(inv => (
                                                <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                                                  <div className="flex items-center gap-3">
                                                    <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
                                                    <div>
                                                      <p className="text-sm text-gray-800">{inv.description || 'Mensalidade'}</p>
                                                      <p className="text-xs text-gray-400">Venc.: {inv.dueDate || inv.due_date || '—'}</p>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                    <span className="text-sm font-semibold text-gray-900">{inv.amount || '—'}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${invoiceStatusColor(inv.status)}`}>{inv.status}</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── COMISSÕES ── */}
                  {activeTab === 'comissoes' && (
                    <div className="space-y-5">
                      <div>
                        <h1 className="text-2xl font-black text-gray-900 font-display">Comissões</h1>
                        <p className="text-gray-500 text-sm">Histórico mensal de comissões baseado em faturas pagas.</p>
                      </div>

                      <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
                        <p className="text-violet-200 text-xs uppercase tracking-widest mb-1">Sua taxa de comissão</p>
                        <p className="text-5xl font-black">{percentual}%</p>
                        <p className="text-violet-200 text-sm mt-2">sobre o valor das faturas pagas dos seus alunos</p>
                      </div>

                      {meses.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                          <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 text-sm">Nenhuma comissão registrada ainda.</p>
                          <p className="text-gray-400 text-xs mt-1">Quando seus alunos pagarem faturas, aparecerá aqui.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {meses.map(mes => (
                            <div key={mes.mes} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-violet-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{formatMes(mes.mes)}</p>
                                    <p className="text-xs text-gray-400">{mes.faturas} fatura{mes.faturas !== 1 ? 's' : ''} paga{mes.faturas !== 1 ? 's' : ''}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-400">Total faturado</p>
                                  <p className="text-sm text-gray-700">{formatCurrency(mes.total)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-violet-500 font-medium">Sua comissão</p>
                                  <p className="text-lg font-black text-violet-700">{formatCurrency(mes.comissao)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Modal Cadastrar Aluno */}
      <AnimatePresence>
        {showCadastro && (
          <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900 font-display">Novo Aluno</h3>
                  <p className="text-gray-400 text-sm mt-0.5">Cadastrar como dublador no sistema</p>
                </div>
                <button onClick={() => setShowCadastro(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleCriarAluno} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5">Nome completo *</label>
                  <input
                    type="text"
                    value={novoAluno.full_name}
                    onChange={e => setNovoAluno(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="Nome do aluno"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={novoAluno.email}
                    onChange={e => setNovoAluno(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5">Senha inicial *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={novoAluno.password}
                      onChange={e => setNovoAluno(p => ({ ...p, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5">Módulo *</label>
                  <input
                    type="text"
                    value={novoAluno.module_title}
                    onChange={e => setNovoAluno(p => ({ ...p, module_title: e.target.value }))}
                    placeholder="Nome do módulo/curso"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCadastro(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCriando}
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCriando ? <><Loader2 className="w-4 h-4 animate-spin" /> Cadastrando...</> : 'Cadastrar Aluno'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
