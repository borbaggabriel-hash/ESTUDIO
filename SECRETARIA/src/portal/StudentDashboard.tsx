import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, CreditCard,
  HelpCircle, LogOut, Bell,
  Clock, Calendar, AlertCircle,
  CheckCircle, MessageSquare,
  PartyPopper, Send, CheckCheck,
  User
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { firebaseService } from '../services/supabaseService';

export function StudentDashboard({ onLogout, onHome, data, studentData, onRefreshProfile }: any) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [agendaItems, setAgendaItems] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);

  const profile = studentData?.profile;
  const uid = studentData?.uid;

  useEffect(() => {
    if (!uid) return;
    firebaseService.getStudentMessages(uid).then(msgs => setMessages((msgs as any[]) || []));
    firebaseService.getStudentInvoices(uid).then(invs => setInvoices((invs as any[]) || []));
    firebaseService.getAgendaItems(uid).then(items => setAgendaItems((items as any[]) || []));
    firebaseService.getNotices().then(n => setNotices((n as any[]) || []));
  }, [uid]);

  const unreadCount = messages.filter((m: any) => !m.read).length;

  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'mensagens', label: 'Mensagens', icon: MessageSquare, badge: unreadCount },
    { id: 'financeiro', label: 'Financeiro', icon: CreditCard },
    { id: 'suporte', label: 'Suporte', icon: HelpCircle },
    { id: 'perfil', label: 'Meu Perfil', icon: User },
  ];

  const mobileNavItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'mensagens', label: 'Mensagens', icon: MessageSquare, badge: unreadCount },
    { id: 'financeiro', label: 'Financeiro', icon: CreditCard },
    { id: 'suporte', label: 'Suporte', icon: HelpCircle },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView setActiveTab={setActiveTab} data={data} studentData={studentData} messages={messages} invoices={invoices} agendaItems={agendaItems} notices={notices} />;
      case 'mensagens':
        return <MensagensView messages={messages} setMessages={setMessages} uid={uid} />;
      case 'financeiro':
        return <FinanceiroView invoices={invoices} setInvoices={setInvoices} onPay={() => { setIsCelebrating(true); setTimeout(() => setIsCelebrating(false), 3000); }} />;
      case 'agenda':
        return <AgendaView agendaItems={agendaItems} />;
      case 'suporte':
        return <SuporteView uid={uid} profile={profile} />;
      case 'perfil':
        return <PerfilView uid={uid} profile={profile} studentData={studentData} onRefreshProfile={onRefreshProfile} />;
      default:
        return <DashboardView setActiveTab={setActiveTab} data={data} studentData={studentData} messages={messages} invoices={invoices} agendaItems={agendaItems} notices={notices} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex text-foreground font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex relative z-20 shrink-0">
        <div className="px-5 py-5 flex items-center gap-3 cursor-pointer border-b border-gray-200" onClick={onHome}>
          <div>
            <span className="font-black text-lg tracking-tighter font-display text-gray-900 block leading-none">THE HUB</span>
            <span className="text-[10px] tracking-widest text-gray-400 uppercase">Portal do Aluno</span>
          </div>
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
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-cyan-500 rounded-full" />}
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
                <span className="flex-1">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-sm"
          >
            <LogOut className="w-5 h-5" /> Sair da conta
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#f4f5f7]">

        <AnimatePresence>
          {isCelebrating && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
            >
              <motion.div
                initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.5, opacity: 0 }}
                className="bg-gradient-to-br from-green-400 to-emerald-600 p-8 rounded-3xl text-center shadow-[0_0_100px_rgba(16,185,129,0.4)]"
              >
                <PartyPopper className="w-20 h-20 text-white mx-auto mb-4" />
                <h2 className="text-3xl font-black text-white font-display mb-2">Pagamento Confirmado!</h2>
                <p className="text-green-50 font-medium">Sua matrícula está ativa. Bons estudos!</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 relative z-10 shrink-0 shadow-sm">
          <button onClick={onHome} className="flex items-center gap-2">
            <span className="font-black text-base font-display text-gray-900">THE HUB</span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('mensagens')} className="relative p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-500 rounded-full"></span>}
            </button>
            <button onClick={() => setActiveTab('perfil')} className="w-8 h-8 rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors">
              <User className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 relative z-10">
          <div className="max-w-5xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] flex items-center justify-around px-1 h-16">
        {mobileNavItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-xl transition-all flex-1 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}
            >
              {isActive && <motion.div layoutId="mobileActiveTab" className="absolute inset-0 bg-gray-100 rounded-xl" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
              <div className="relative">
                <Icon className="w-5 h-5 relative z-10" />
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-cyan-600 text-white text-[9px] font-bold flex items-center justify-center z-20">{item.badge}</span>
                )}
              </div>
              <span className="text-[10px] font-medium relative z-10 leading-none">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        {/* Sair */}
        <button
          onClick={onLogout}
          className="relative flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-xl transition-all flex-1 text-gray-400 hover:text-red-500"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Sair</span>
        </button>
      </nav>
    </div>
  );
}

function DashboardView({ setActiveTab, data, studentData, messages, invoices, agendaItems, notices }: any) {
  const profile = studentData?.profile;
  const enrollments = studentData?.enrollments || [];
  const totalProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((acc: number, curr: any) => acc + (curr.progress || 0), 0) / enrollments.length)
    : 0;
  const mainEnrollment = enrollments[0];
  const unreadMessages = (messages || []).filter((m: any) => !m.read).length;
  const pendingInvoices = (invoices || []).filter((inv: any) => inv.status === 'Pendente').length;
  const noticesList = notices || [];
  const today = new Date().toISOString().split('T')[0];
  const nextEvent = (agendaItems || []).find((i: any) => i.date >= today);

  const activeModule = data?.modules?.find((m: any) => m.title === mainEnrollment?.module || m.slug === mainEnrollment?.module_slug);
  const lessons = activeModule?.details?.lessons || [];
  const completedLessons = mainEnrollment ? Math.floor((mainEnrollment.progress || 0) / (100 / Math.max(lessons.length, 1))) : 0;
  const nextLesson = lessons[completedLessons];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-white border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{greeting},</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 font-display mb-2">
              {profile?.full_name || 'Aluno'}
            </h2>
            <p className="text-gray-500 text-sm md:text-base">
              Acompanhe sua jornada acadêmica por aqui.
            </p>
          </div>
          <div className="bg-gray-50 px-5 py-4 rounded-2xl border border-gray-200 shrink-0">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Módulo Atual</p>
            <p className="text-gray-900 text-sm font-medium">{mainEnrollment?.module || 'Sem matrícula'}</p>
          </div>
        </div>
      </div>

      {/* Quadro de Avisos */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <p className="text-sm text-gray-900">Quadro de Avisos</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Comunicados da escola</p>
          </div>
        </div>

        {noticesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-3">
              <Bell className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-gray-600 text-sm">Nenhum aviso no momento.</p>
            <p className="text-gray-400 text-xs mt-1">Comunicados da escola aparecerão aqui.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {noticesList.slice(0, 5).map((n: any) => {
              const date = n.created_at ? new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
              return (
                <div key={n.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-2 h-2 rounded-full mt-2 shrink-0 bg-cyan-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                    {date && <p className="text-[10px] text-gray-400 mt-1.5">{date}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MensagensView({ messages, setMessages, uid }: any) {
  const handleMarkRead = async (id: string) => {
    await firebaseService.markStudentMessageRead(id);
    setMessages((prev: any[]) => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-900 mb-2 font-display">Mensagens</h2>
        <p className="text-gray-500 text-sm">Comunicados e avisos da sua escola.</p>
      </div>
      {messages.length === 0 ? (
        <div className="bg-white border border-gray-200 shadow-sm p-12 rounded-2xl flex flex-col items-center justify-center text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-600">Nenhuma mensagem ainda.</p>
          <p className="text-gray-400 text-sm mt-1">Quando a escola enviar um aviso, ele aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg: any) => (
            <div key={msg.id} className={`bg-white border border-gray-200 shadow-sm p-5 rounded-2xl transition-all ${!msg.read ? 'border-l-4 border-l-cyan-500' : 'opacity-75'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${!msg.read ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="text-gray-900 text-sm">{msg.title}</h4>
                    {!msg.read && <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600 text-xs border border-cyan-200">Nova</span>}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{msg.body}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">{formatDate(msg.created_at)}</p>
                    {!msg.read && (
                      <button
                        onClick={() => handleMarkRead(msg.id)}
                        className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
                      >
                        Marcar como lida
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function FinanceiroView({ invoices, setInvoices, onPay }: any) {
  const formatDate = (val: string) => val || '—';
  const pending = invoices.find((inv: any) => inv.status === 'Pendente');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl text-gray-900 mb-2 font-display">Financeiro</h2>
        <p className="text-gray-500 text-sm">Gerencie suas mensalidades e histórico de pagamentos.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-amber-50 border border-amber-300 shadow-sm p-6 rounded-2xl flex flex-col justify-center">
          <p className="text-sm text-amber-600 mb-1">Próximo Vencimento</p>
          {pending ? (
            <>
              <h3 className="text-3xl text-gray-900 mb-2">{pending.amount}</h3>
              <p className="text-sm text-amber-700 mb-6">Vence em {formatDate(pending.due_date)}</p>
              <Button onClick={onPay} className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl">
                Pagar Agora
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-3xl text-green-600 mb-2">Em dia</h3>
              <p className="text-sm text-gray-500">Nenhuma fatura pendente.</p>
            </>
          )}
        </div>
        <div className="md:col-span-2 bg-white border border-gray-200 shadow-sm p-6 rounded-2xl">
          <h4 className="text-base text-gray-900 mb-5">Histórico de Faturas</h4>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CreditCard className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-gray-500">Nenhuma fatura registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      inv.status === 'Pago' ? 'bg-green-100 text-green-600' :
                      inv.status === 'Pendente' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {inv.status === 'Pago' ? <CheckCircle className="w-5 h-5" /> :
                       inv.status === 'Pendente' ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-gray-900 text-sm">{inv.description}</p>
                      <p className="text-xs text-gray-500">Vencimento: {formatDate(inv.due_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                    <span className="text-gray-900">{inv.amount}</span>
                    {inv.status === 'Pago' ? (
                      <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs border border-green-200">Pago</span>
                    ) : inv.status === 'Pendente' ? (
                      <Button onClick={onPay} size="sm" className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg">Pagar</Button>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs">A Vencer</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AgendaView({ agendaItems }: any) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const todayStr = now.toISOString().split('T')[0];
  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const monthStr = `${viewYear}-${pad(viewMonth + 1)}`;

  const eventsByDay: Record<number, any[]> = {};
  agendaItems.forEach((item: any) => {
    if (item.date?.startsWith(monthStr)) {
      const d = parseInt(item.date.split('-')[2], 10);
      if (!eventsByDay[d]) eventsByDay[d] = [];
      eventsByDay[d].push(item);
    }
  });

  const monthEvents = agendaItems
    .filter((i: any) => i.date?.startsWith(monthStr))
    .sort((a: any, b: any) => a.date.localeCompare(b.date));

  const typeColor = (type: string) => {
    switch (type) {
      case 'Aula':  return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Prova': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Banca': return 'bg-purple-50 text-purple-700 border-purple-200';
      default:      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const dotColor = (type: string) => {
    switch (type) {
      case 'Aula':  return 'bg-cyan-500';
      case 'Prova': return 'bg-orange-400';
      case 'Banca': return 'bg-purple-400';
      default:      return 'bg-blue-400';
    }
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-900 mb-2 font-display">Agenda</h2>
        <p className="text-gray-500 text-sm">Calendário e compromissos da sua turma.</p>
      </div>

      {/* Calendar */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            ‹
          </button>
          <span className="text-sm text-gray-900 tracking-wide">
            {MONTHS_PT[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            ›
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-[10px] text-gray-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 p-2 gap-0.5">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
            const isToday = dateStr === todayStr;
            const events = eventsByDay[day] || [];
            return (
              <div
                key={day}
                className={`relative flex flex-col items-center py-2.5 min-h-[40px] rounded-lg transition-colors ${
                  isToday ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`text-sm leading-none ${isToday ? 'text-white' : 'text-gray-700'}`}>{day}</span>
                {events.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {events.slice(0, 3).map((ev: any, i: number) => (
                      <span key={i} className={`w-1 h-1 rounded-full ${isToday ? 'bg-cyan-400' : dotColor(ev.type)}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month event list */}
      <div>
        <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3">
          Compromissos — {MONTHS_PT[viewMonth]}
        </h3>
        {monthEvents.length === 0 ? (
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-8 text-center">
            <p className="text-gray-400 text-sm">Nenhum compromisso neste mês.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl divide-y divide-gray-100 overflow-hidden">
            {monthEvents.map((item: any) => {
              const d = new Date(item.date + 'T12:00:00');
              const isPast = item.date < todayStr;
              return (
                <div key={item.id} className={`flex items-center gap-4 px-5 py-3.5 ${isPast ? 'opacity-50' : 'hover:bg-gray-50'} transition-colors`}>
                  <div className="w-10 shrink-0 text-center">
                    <span className="text-lg text-gray-900 leading-none block">{d.getDate()}</span>
                    <span className="text-[10px] text-gray-400 uppercase">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                  </div>
                  <div className="w-px h-8 bg-gray-200 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{item.title}</p>
                    {item.description && <p className="text-xs text-gray-400 truncate">{item.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.time && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{item.time}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${typeColor(item.type)}`}>{item.type}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SuporteView({ uid, profile }: { uid: string; profile: any }) {
  const [subject, setSubject] = useState('Dúvida sobre aulas');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!uid) return;
    firebaseService.getSupportTickets(uid).then(t => setTickets((t as any[]) || []));
  }, [uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSending(true);
    try {
      await firebaseService.createSupportTicket(uid, {
        subject,
        message,
        email: profile?.email || '',
        name: profile?.full_name || 'Aluno'
      });
      const updated = await firebaseService.getSupportTickets(uid);
      setTickets((updated as any[]) || []);
      setMessage('');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } finally {
      setIsSending(false);
    }
  };

  const statusColor = (s: string) => s === 'Resolvido' ? 'text-green-700 bg-green-50' : s === 'Em Análise' ? 'text-amber-700 bg-amber-50' : 'text-blue-700 bg-blue-50';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl text-gray-900 mb-2 font-display">Suporte ao Aluno</h2>
        <p className="text-gray-500 text-sm">Precisa de ajuda? Nossa equipe está pronta para te atender.</p>
      </div>
      <div className="flex flex-col gap-6">
        <div className="bg-white border border-gray-200 shadow-sm p-6 rounded-2xl">
          <h3 className="text-base text-gray-900 mb-5">Abrir um Chamado</h3>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Assunto</label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-500 transition-colors appearance-none"
              >
                <option>Dúvida sobre aulas</option>
                <option>Problema técnico na plataforma</option>
                <option>Questões financeiras</option>
                <option>Agendamento de reposição</option>
                <option>Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Mensagem</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 h-32 focus:outline-none focus:border-gray-500 transition-colors resize-none"
                placeholder="Descreva seu problema ou dúvida em detalhes..."
                required
              />
            </div>
            <Button type="submit" disabled={isSending} className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-6">
              {sent ? <><CheckCheck className="w-4 h-4 mr-2" /> Enviado!</> : isSending ? 'Enviando...' : <><Send className="w-4 h-4 mr-2" /> Enviar Chamado</>}
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 shadow-sm p-6 rounded-2xl">
            <h4 className="text-base text-gray-900 mb-4">Meus Chamados</h4>
            {tickets.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Nenhum chamado aberto.</p>
            ) : (
              <div className="space-y-3">
                {tickets.map((t: any) => (
                  <div key={t.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm text-gray-900">{t.subject}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(t.status)}`}>{t.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{t.message}</p>
                    {t.admin_reply && (
                      <div className="mt-3 p-3 rounded-lg bg-cyan-50 border border-cyan-200">
                        <p className="text-xs text-cyan-700 mb-1">Resposta da escola:</p>
                        <p className="text-xs text-gray-700">{t.admin_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PerfilView({ uid, profile, studentData, onRefreshProfile }: { uid: string; profile: any; studentData: any; onRefreshProfile?: () => void }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });
  const [isSavingPw, setIsSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await firebaseService.updateStudentProfile(uid, { full_name: form.full_name, phone: form.phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onRefreshProfile?.();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    setIsSavingPw(true);
    setPwMsg(null);
    try {
      await firebaseService.changePassword(pwForm.newPassword);
      setPwMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      setPwForm({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.message || 'Erro ao alterar senha.' });
    } finally {
      setIsSavingPw(false);
    }
  };

  const memberSince = profile?.created_at
    ? new Date(profile.created_at?.seconds ? profile.created_at.seconds * 1000 : profile.created_at)
        .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : null;

  const enrollment = studentData?.enrollments?.[0];

  const infoRows = [
    { label: 'Nome', value: form.full_name || profile?.full_name || '—' },
    { label: 'E-mail', value: profile?.email || '—' },
    { label: 'Telefone', value: form.phone || profile?.phone || '—' },
    { label: 'Módulo', value: enrollment?.module || '—' },
    { label: 'Status', value: profile?.status || 'Ativo', badge: true },
    ...(memberSince ? [{ label: 'Membro desde', value: memberSince }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-900 mb-1 font-display">Meu Perfil</h2>
        <p className="text-gray-500 text-sm">Gerencie suas informações pessoais.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="bg-white border border-gray-200 shadow-sm p-6 rounded-2xl flex flex-col items-center text-center">
          <h3 className="text-base text-gray-900 mb-0.5">{profile?.full_name || 'Aluno'}</h3>
          <p className="text-sm text-cyan-600 mb-5">Aluno Ativo</p>
          <div className="w-full space-y-3 text-left">
            {infoRows.map(row => (
              <div key={row.label} className="flex items-center justify-between text-sm border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <span className="text-gray-500">{row.label}</span>
                {(row as any).badge
                  ? <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs border border-green-200">{row.value}</span>
                  : <span className="text-gray-900 text-xs text-right max-w-[60%] truncate">{row.value}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Edit Form */}
        <div className="md:col-span-2 space-y-5">
          <div className="bg-white border border-gray-200 shadow-sm p-6 rounded-2xl">
            <h3 className="text-base text-gray-900 mb-5">Editar Informações</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-500 transition-colors"
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">WhatsApp / Telefone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-500 transition-colors"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">E-mail</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed"
                />
              </div>
              <div className="pt-1">
                <Button type="submit" disabled={isSaving} className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-4">
                  {saved ? <><CheckCircle className="w-4 h-4 mr-2 inline" /> Salvo!</> : isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>

          {/* Password Change */}
          <div className="bg-white border border-gray-200 shadow-sm p-6 rounded-2xl">
            <h3 className="text-base text-gray-900 mb-5">Alterar Senha</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">Nova Senha</label>
                <input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-500 transition-colors"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-500 transition-colors"
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                />
              </div>
              {pwMsg && (
                <p className={`text-sm ${pwMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{pwMsg.text}</p>
              )}
              <div className="pt-1">
                <Button type="submit" disabled={isSavingPw} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200 rounded-xl py-4">
                  {isSavingPw ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
