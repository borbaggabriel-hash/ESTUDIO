import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Lock, Save, LogOut, Settings, Image as ImageIcon, 
  Users, GraduationCap, Search, Plus, Trash2, 
  LayoutDashboard, TrendingUp, BookOpen, Activity,
  MoreVertical, Edit3, Shield, Database, Bell,
  MessageSquare, ChevronDown, CheckCircle2, XCircle,
  AlertCircle, ChevronRight, ClipboardList, Award,
  HelpCircle, CreditCard, Headphones, Calendar,
  Megaphone, Send, Radio, ChevronLeft, UserCheck, X, Clapperboard, Building2, Power, Tag, Globe, Clock, BarChart2, Film
} from 'lucide-react';
import { Button } from './ui/button';

import { firebaseService } from '../services/supabaseService';
import { getRoleLabel, getStatusLabel } from '../utils/roleLabels';
import { initialSiteData } from '../data';

export function AdminPanel({ data, onSave, onClose }: any) {
  const [auth, setAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [draft, setDraft] = useState(data);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchStudent, setSearchStudent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: () => void, title: string, desc: string} | null>(null);
  const [isSeedingDb, setIsSeedingDb] = useState(false);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ full_name: '', email: '', password: '', module_title: '', module_slug: '' });
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentSubTab, setStudentSubTab] = useState<Record<string, string>>({});
  const [studentMessages, setStudentMessages] = useState<Record<string, any[]>>({});
  const [studentInvoices, setStudentInvoices] = useState<Record<string, any[]>>({});
  const [newMessage, setNewMessage] = useState<Record<string, { title: string; body: string }>>({});
  const [newInvoice, setNewInvoice] = useState<Record<string, { description: string; amount: string; due_date: string; status: string }>>({});
  const [studentProgress, setStudentProgress] = useState<Record<string, { module_title: string; module_slug: string; status: string; validity: string; enrolled_by: string }>>({})
  const [studentEnrollments, setStudentEnrollments] = useState<Record<string, any | null>>({});
  const [studentAgenda, setStudentAgenda] = useState<Record<string, any[]>>({});
  const [newAgendaItem, setNewAgendaItem] = useState<Record<string, { title: string; date: string; time: string; description: string; type: string }>>({});
  const [studentSupport, setStudentSupport] = useState<Record<string, any[]>>({});
  const [allSupportTickets, setAllSupportTickets] = useState<any[]>([]);
  const [supportReply, setSupportReply] = useState<Record<string, string>>({});
  const [directors, setDirectors] = useState<any[]>([]);
  const [showDirectors, setShowDirectors] = useState(false);
  const [diretores, setDiretores] = useState<any[]>([]);
  const [showDiretores, setShowDiretores] = useState(true);
  const [showAddDiretor, setShowAddDiretor] = useState(false);
  const [diretorSearch, setDiretorSearch] = useState('');
  const [diretorSearchResults, setDiretorSearchResults] = useState<any[]>([]);
  const [diretorCandidate, setDiretorCandidate] = useState<any | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [notices, setNotices] = useState<any[]>([]);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeSegment, setNoticeSegment] = useState<'todos' | 'modulo' | 'status'>('todos');
  const [noticeModule, setNoticeModule] = useState('');
  const [noticeStatusSeg, setNoticeStatusSeg] = useState('Ativo');
  const [noticeScheduledAt, setNoticeScheduledAt] = useState('');
  const [isCreatingNotice, setIsCreatingNotice] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryPwd, setRecoveryPwd] = useState('');
  const [recoveryPwdConfirm, setRecoveryPwdConfirm] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [newVendedor, setNewVendedor] = useState({ full_name: '', email: '', password: '', percentual: '10' });
  const [isCreatingVendedor, setIsCreatingVendedor] = useState(false);
  const [vendedorSearch, setVendedorSearch] = useState('');
  const [supportStatusFilter, setSupportStatusFilter] = useState<string>('todos');
  const [supportCategoryFilter, setSupportCategoryFilter] = useState<string>('todos');
  const [supportPriorityFilter, setSupportPriorityFilter] = useState<string>('todos');
  const [showCannedResponses, setShowCannedResponses] = useState<string | null>(null);
  const [enrollmentView, setEnrollmentView] = useState<'table' | 'kanban'>('table');
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [adminStudios, setAdminStudios] = useState<any[]>([]);
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [studioMembers, setStudioMembers] = useState<any[]>([]);
  const [studioSubTab, setStudioSubTab] = useState('geral');
  const [studioEditDraft, setStudioEditDraft] = useState<any>({});
  const [studioSearch, setStudioSearch] = useState('');
  const [studioActivity, setStudioActivity] = useState<{ productions: any[]; sessions: any[] }>({ productions: [], sessions: [] });
  const [siteSubTab, setSiteSubTab] = useState('banners');
  const [adminStats, setAdminStats] = useState<any>(null);

  const handleSeedDatabase = async () => {
    const confirmed = window.confirm(
      'Isso vai sobrescrever banners, módulos, learnings, depoimentos, FAQs e configurações no Supabase com os dados padrão do currículo.\n\nContinuar?'
    );
    if (!confirmed) return;
    setIsSeedingDb(true);
    try {
      await firebaseService.seedDatabase({
        banners: initialSiteData.banners,
        modules: initialSiteData.modules,
        learnings: initialSiteData.learnings,
        testimonials: initialSiteData.testimonials,
        faqs: initialSiteData.faqs,
        settings: initialSiteData.settings as Record<string, unknown>
      });
      toast.success('Banco de dados inicializado com o currículo completo.');
    } catch (error) {
      console.error('Seed error:', error);
      toast.error('Erro ao inicializar banco de dados. Verifique o console.');
    } finally {
      setIsSeedingDb(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const user = await firebaseService.getCurrentUser();
      if (user && user.role === 'platform_owner') {
        setAuth(true);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (auth) {
      loadAdminData();
    }
  }, [auth]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [students, enrollments, activity, siteData, tickets, dirs, dirs2, vends] = await Promise.all([
        firebaseService.getAllStudents(),
        firebaseService.getAllEnrollments(),
        firebaseService.getAllActivity(),
        firebaseService.getSiteData(),
        firebaseService.getAllSupportTickets(),
        firebaseService.getDirectors(),
        firebaseService.getDiretores(),
        fetch('/api/hub/admin/vendedores', { credentials: 'include' }).then(r => r.json()).catch(() => []),
      ]);
      setAllSupportTickets((tickets as any[]) || []);
      setDirectors((dirs as any[]) || []);
      setDiretores((dirs2 as any[]) || []);
      setVendedores(Array.isArray(vends) ? vends : []);

      setDraft((prev: any) => ({
        ...prev,
        ...siteData,
        students: students?.map((s: any) => ({
          ...s,
          name: s.full_name || s.name || 'Sem Nome',
          avatar: s.avatar_url || s.avatar || `https://i.pravatar.cc/150?u=${s.id}`
        })) || [],
        enrollments: enrollments || [],
        recentActivity: (activity || []).filter(Boolean).map((a: any) => ({
          id: a.id,
          user: a.student_id,
          action: a.activity_type,
          target: a.description,
          time: a.created_at ? new Date(a.created_at?.seconds ? a.created_at.seconds * 1000 : a.created_at).toLocaleString() : '—',
          avatar: "https://i.pravatar.cc/150?u=" + a.student_id
        })) || []
      }));
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.error('Erro ao carregar dados do painel.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await firebaseService.signIn(email, pwd);
      const user = result.user;
      if (user) {
        // Check if user is owner
        const profile = await firebaseService.getStudentProfile(user.id);
        if (profile?.role === 'owner' || user.email === 'borbaggabriel@gmail.com' || user.email === 'borba.costelinha@gmail.com') {
          setAuth(true);
          toast.success('Acesso concedido ao painel administrativo.');
        } else {
          await firebaseService.signOut();
          toast.error('Acesso negado. Apenas administradores podem acessar esta área.');
        }
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      toast.error(error.message || 'Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await firebaseService.signOut();
      setAuth(false);
      onClose();
      toast.success('Sessão encerrada com sucesso.');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Erro ao encerrar sessão.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (section: string, index: number, field: string, value: any) => {
    const newDraft = { ...draft };
    newDraft[section][index][field] = value;
    setDraft(newDraft);
  };

  const handleDetailsChange = (moduleIndex: number, detailsField: 'lessons' | 'methodology', value: string[]) => {
    const newDraft = { ...draft };
    newDraft.modules[moduleIndex] = {
      ...newDraft.modules[moduleIndex],
      details: {
        ...(newDraft.modules[moduleIndex].details || {}),
        [detailsField]: value,
      },
    };
    setDraft(newDraft);
  };

  const handleSettingChange = (field: string, value: string) => {
    setDraft({
      ...draft,
      settings: { ...draft.settings, [field]: value }
    });
  };

  const handleAdd = (section: string, defaultItem: any) => {
    const newDraft = { ...draft };
    if (!newDraft[section]) newDraft[section] = [];
    const tempId = `temp-${Date.now()}`;
    const itemWithId = { ...defaultItem, id: defaultItem.id || tempId };
    newDraft[section].push(itemWithId);
    setDraft(newDraft);
    toast.success('Item adicionado com sucesso.');
  };

  const handleMove = (section: string, index: number, dir: -1 | 1) => {
    const arr = [...(draft[section] || [])];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setDraft((prev: any) => ({ ...prev, [section]: arr }));
  };

  const handleDelete = (section: string, index: number) => {
    const item = draft[section][index];
      setConfirmModal({
        isOpen: true,
        title: 'Confirmar Exclusão',
        desc: 'Tem certeza que deseja remover este item? Esta ação não pode ser desfeita.',
        action: async () => {
          setIsLoading(true);
          try {
            const isTemp = typeof item.id === 'string' && item.id.startsWith('temp-');
            if (item.id && !isTemp) {
              if (section === 'banners') await firebaseService.deleteBanner(item.id);
              if (section === 'teachers') await firebaseService.deleteTeacher(item.id);
              if (section === 'enrollments') await firebaseService.deleteEnrollment(item.id);
              if (section === 'modules') await firebaseService.deleteModule(item.id);
              if (section === 'learnings') await firebaseService.deleteLearning(item.id);
              if (section === 'testimonials') await firebaseService.deleteTestimonial(item.id);
              if (section === 'faqs') await firebaseService.deleteFAQ(item.id);
            }
            const newDraft = { ...draft };
            newDraft[section].splice(index, 1);
            setDraft(newDraft);
            toast.success('Item removido com sucesso.');
          } catch (error) {
            console.error('Failed to delete item:', error);
            toast.error('Erro ao remover item.');
          } finally {
            setIsLoading(false);
            setConfirmModal(null);
          }
        }
      });
  };

  const handleSave = async () => {
    setIsLoading(true);
    console.log('=== INICIANDO SAVE ===');
    console.log('Dados a salvar:', JSON.stringify(draft, null, 2));
    
    try {
      // Save Settings
      console.log('Salvando settings...', draft.settings);
      await firebaseService.updateSettings(draft.settings);
      console.log('✓ Settings salvos');

      // Save Banners
      console.log(`Salvando ${draft.banners?.length || 0} banners...`);
      for (const banner of draft.banners) {
        if (typeof banner.id === 'string' && banner.id.startsWith('temp-')) {
          const { id, ...bannerData } = banner;
          console.log('Criando novo banner:', bannerData);
          await firebaseService.createBanner(bannerData);
        } else if (banner.id) {
          console.log('Atualizando banner:', banner.id);
          await firebaseService.updateBanner(banner.id, banner);
        }
      }
      console.log('✓ Banners salvos');

      // Save Modules
      if (draft.modules) {
        console.log(`Salvando ${draft.modules.length} modules...`);
        for (const module of draft.modules) {
          if (typeof module.id === 'string' && module.id.startsWith('temp-')) {
            const { id, ...moduleData } = module;
            console.log('Criando novo module:', moduleData);
            await firebaseService.createModule(moduleData);
          } else if (module.id) {
            console.log('Atualizando module:', module.id);
            await firebaseService.updateModule(module.id, module);
          }
        }
        console.log('✓ Modules salvos');
      }

      // Save Learnings
      if (draft.learnings) {
        console.log(`Salvando ${draft.learnings.length} learnings...`);
        for (const learning of draft.learnings) {
          if (typeof learning.id === 'string' && learning.id.startsWith('temp-')) {
            const { id, ...learningData } = learning;
            console.log('Criando novo learning:', learningData);
            await firebaseService.createLearning(learningData);
          } else if (learning.id) {
            console.log('Atualizando learning:', learning.id);
            await firebaseService.updateLearning(learning.id, learning);
          }
        }
        console.log('✓ Learnings salvos');
      }

      // Save Testimonials
      if (draft.testimonials) {
        console.log(`Salvando ${draft.testimonials.length} testimonials...`);
        for (const testimonial of draft.testimonials) {
          const testimonialData = {
            ...testimonial,
            text: testimonial.text ?? testimonial.content ?? '',
            avatar: testimonial.avatar ?? testimonial.imageUrl ?? ''
          };

          delete testimonialData.content;
          delete testimonialData.imageUrl;

          if (typeof testimonial.id === 'string' && testimonial.id.startsWith('temp-')) {
            const { id, ...testimonialCreateData } = testimonialData;
            console.log('Criando novo testimonial:', testimonialData);
            await firebaseService.createTestimonial(testimonialCreateData);
          } else if (testimonial.id) {
            console.log('Atualizando testimonial:', testimonial.id);
            await firebaseService.updateTestimonial(testimonial.id, testimonialData);
          }
        }
        console.log('✓ Testimonials salvos');
      }

      // Save FAQs
      if (draft.faqs) {
        console.log(`Salvando ${draft.faqs.length} FAQs...`);
        for (const faq of draft.faqs) {
          if (typeof faq.id === 'string' && faq.id.startsWith('temp-')) {
            const { id, ...faqData } = faq;
            console.log('Criando novo FAQ:', faqData);
            await firebaseService.createFAQ(faqData);
          } else if (faq.id) {
            console.log('Atualizando FAQ:', faq.id);
            await firebaseService.updateFAQ(faq.id, faq);
          }
        }
        console.log('✓ FAQs salvos');
      }

      // Save Teachers
      if (draft.teachers) {
        console.log(`Salvando ${draft.teachers.length} teachers...`);
        for (const teacher of draft.teachers) {
          if (typeof teacher.id === 'string' && teacher.id.startsWith('temp-')) {
            const { id, ...teacherData } = teacher;
            console.log('Criando novo teacher:', teacherData);
            await firebaseService.createTeacher(teacherData);
          } else if (teacher.id) {
            console.log('Atualizando teacher:', teacher.id);
            await firebaseService.updateTeacher(teacher.id, teacher);
          }
        }
        console.log('✓ Teachers salvos');
      }

      // Save Students (Profiles)
      if (draft.students) {
        console.log(`Salvando ${draft.students.length} students...`);
        for (const student of draft.students) {
          if (student.id) {
            const profileToSave = { ...student };
            // Map back to DB fields
            if (profileToSave.name) profileToSave.full_name = profileToSave.name;
            if (profileToSave.avatar) profileToSave.avatar_url = profileToSave.avatar;
            
            // Clean up temporary fields before saving
            delete profileToSave.name;
            delete profileToSave.avatar;
            delete profileToSave.id;
            
            console.log('Atualizando student profile:', student.id, profileToSave);
            await firebaseService.updateStudentProfile(student.id, profileToSave);
          }
        }
        console.log('✓ Students salvos');
      }

      console.log('=== SAVE COMPLETO ===');
      const refreshedSiteData = await firebaseService.getSiteData();
      onSave(refreshedSiteData ? {
        ...draft,
        ...refreshedSiteData,
        students: draft.students || [],
        enrollments: draft.enrollments || [],
        recentActivity: draft.recentActivity || []
      } : draft);
      toast.success('Todas as alterações foram salvas e publicadas.');
    } catch (error) {
      console.error('=== ERRO NO SAVE ===', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
      toast.error('Erro ao salvar alterações. Verifique o console.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTab = async (tab: string) => {
    setIsLoading(true);
    try {
      if (tab === 'settings' || tab === 'promocao') {
        await firebaseService.updateSettings(draft.settings);
      } else if (tab === 'banners') {
        for (const banner of draft.banners || []) {
          if (typeof banner.id === 'string' && banner.id.startsWith('temp-')) {
            const { id, ...d } = banner; await firebaseService.createBanner(d);
          } else if (banner.id) { await firebaseService.updateBanner(banner.id, banner); }
        }
      } else if (tab === 'modules') {
        for (const module of draft.modules || []) {
          if (typeof module.id === 'string' && module.id.startsWith('temp-')) {
            const { id, ...d } = module; await firebaseService.createModule(d);
          } else if (module.id) { await firebaseService.updateModule(module.id, module); }
        }
      } else if (tab === 'learnings') {
        for (const learning of draft.learnings || []) {
          if (typeof learning.id === 'string' && learning.id.startsWith('temp-')) {
            const { id, ...d } = learning; await firebaseService.createLearning(d);
          } else if (learning.id) { await firebaseService.updateLearning(learning.id, learning); }
        }
      } else if (tab === 'testimonials') {
        for (const testimonial of draft.testimonials || []) {
          const td = { ...testimonial, text: testimonial.text ?? testimonial.content ?? '', avatar: testimonial.avatar ?? testimonial.imageUrl ?? '' };
          delete td.content; delete td.imageUrl;
          if (typeof testimonial.id === 'string' && testimonial.id.startsWith('temp-')) {
            const { id, ...d } = td; await firebaseService.createTestimonial(d);
          } else if (testimonial.id) { await firebaseService.updateTestimonial(testimonial.id, td); }
        }
      } else if (tab === 'faqs') {
        for (const faq of draft.faqs || []) {
          if (typeof faq.id === 'string' && faq.id.startsWith('temp-')) {
            const { id, ...d } = faq; await firebaseService.createFAQ(d);
          } else if (faq.id) { await firebaseService.updateFAQ(faq.id, faq); }
        }
      } else if (tab === 'teachers') {
        for (const teacher of draft.teachers || []) {
          if (typeof teacher.id === 'string' && teacher.id.startsWith('temp-')) {
            const { id, ...d } = teacher; await firebaseService.createTeacher(d);
          } else if (teacher.id) { await firebaseService.updateTeacher(teacher.id, teacher); }
        }
      }
      const refreshedSiteData = await firebaseService.getSiteData();
      onSave(refreshedSiteData ? { ...draft, ...refreshedSiteData, students: draft.students || [], enrollments: draft.enrollments || [], recentActivity: draft.recentActivity || [] } : draft);
      toast.success('Alterações publicadas com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar aba:', error);
      toast.error('Erro ao publicar alterações. Verifique o console.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.full_name || !newStudent.email || !newStudent.password || !newStudent.module_title) {
      toast.error('Preencha todos os campos.');
      return;
    }
    setIsLoading(true);
    try {
      await firebaseService.createStudentAccount(newStudent);
      toast.success(`Conta criada para ${newStudent.email}. Aluno pode fazer login agora.`);
      setNewStudent({ full_name: '', email: '', password: '', module_title: '', module_slug: '' });
      setIsCreatingStudent(false);
      await loadAdminData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadStudentPortalData = async (uid: string) => {
    if (studentMessages[uid] !== undefined) return;
    try {
      const [msgs, invs, enrollment] = await Promise.all([
        firebaseService.getStudentMessages(uid),
        firebaseService.getStudentInvoices(uid),
        firebaseService.getStudentEnrollmentByUid(uid)
      ]);
      setStudentMessages(prev => ({ ...prev, [uid]: (msgs as any[]) || [] }));
      setStudentInvoices(prev => ({ ...prev, [uid]: (invs as any[]) || [] }));
      setStudentEnrollments(prev => ({ ...prev, [uid]: enrollment ?? null }));
      if (enrollment) {
        setStudentProgress(prev => ({
          ...prev,
          [uid]: { module_title: enrollment.module || '', module_slug: enrollment.module_slug || '', status: enrollment.status || 'Ativo', validity: enrollment.validity || '', enrolled_by: enrollment.enrolled_by || '' }
        }));
      }
    } catch {
      setStudentMessages(prev => ({ ...prev, [uid]: [] }));
      setStudentInvoices(prev => ({ ...prev, [uid]: [] }));
      setStudentEnrollments(prev => ({ ...prev, [uid]: null }));
    }
  };

  const handleSendMessage = async (uid: string) => {
    const msg = newMessage[uid];
    if (!msg?.title || !msg?.body) { toast.error('Preencha título e mensagem.'); return; }
    setIsLoading(true);
    try {
      await firebaseService.createStudentMessage(uid, msg);
      const msgs = await firebaseService.getStudentMessages(uid);
      setStudentMessages(prev => ({ ...prev, [uid]: (msgs as any[]) || [] }));
      setNewMessage(prev => ({ ...prev, [uid]: { title: '', body: '' } }));
      toast.success('Mensagem enviada ao aluno.');
    } catch { toast.error('Erro ao enviar mensagem.'); }
    finally { setIsLoading(false); }
  };

  const handleDeleteStudentMessage = async (uid: string, msgId: string) => {
    await firebaseService.deleteStudentMessage(msgId);
    setStudentMessages(prev => ({ ...prev, [uid]: prev[uid].filter(m => m.id !== msgId) }));
    toast.success('Mensagem removida.');
  };

  const handleAddInvoice = async (uid: string) => {
    const inv = newInvoice[uid];
    if (!inv?.description || !inv?.amount || !inv?.due_date) { toast.error('Preencha todos os campos da fatura.'); return; }
    setIsLoading(true);
    try {
      await firebaseService.createStudentInvoice(uid, { ...inv, status: inv.status || 'Pendente' });
      const invs = await firebaseService.getStudentInvoices(uid);
      setStudentInvoices(prev => ({ ...prev, [uid]: (invs as any[]) || [] }));
      setNewInvoice(prev => ({ ...prev, [uid]: { description: '', amount: '', due_date: '', status: 'Pendente' } }));
      toast.success('Fatura adicionada.');
    } catch { toast.error('Erro ao adicionar fatura.'); }
    finally { setIsLoading(false); }
  };

  const handleUpdateInvoiceStatus = async (uid: string, invId: string, status: string) => {
    await firebaseService.updateStudentInvoiceStatus(invId, status);
    setStudentInvoices(prev => ({ ...prev, [uid]: prev[uid].map(i => i.id === invId ? { ...i, status } : i) }));
    toast.success('Status da fatura atualizado.');
  };

  const handleDeleteInvoice = async (uid: string, invId: string) => {
    await firebaseService.deleteStudentInvoice(invId);
    setStudentInvoices(prev => ({ ...prev, [uid]: prev[uid].filter(i => i.id !== invId) }));
    toast.success('Fatura removida.');
  };

  const handleLoadAgendaAndSupport = async (uid: string) => {
    if (studentAgenda[uid] !== undefined) return;
    try {
      const [agenda, support] = await Promise.all([
        firebaseService.getAgendaItems(uid),
        firebaseService.getSupportTickets(uid)
      ]);
      setStudentAgenda(prev => ({ ...prev, [uid]: (agenda as any[]) || [] }));
      setStudentSupport(prev => ({ ...prev, [uid]: (support as any[]) || [] }));
    } catch {
      setStudentAgenda(prev => ({ ...prev, [uid]: [] }));
      setStudentSupport(prev => ({ ...prev, [uid]: [] }));
    }
  };

  const handleAddAgendaItem = async (uid: string) => {
    const item = newAgendaItem[uid];
    if (!item?.title || !item?.date || !item?.time) { toast.error('Preencha título, data e hora.'); return; }
    setIsLoading(true);
    try {
      await firebaseService.createAgendaItem(uid, { ...item, type: item.type || 'Aula' });
      const updated = await firebaseService.getAgendaItems(uid);
      setStudentAgenda(prev => ({ ...prev, [uid]: (updated as any[]) || [] }));
      setNewAgendaItem(prev => ({ ...prev, [uid]: { title: '', date: '', time: '', description: '', type: 'Aula' } }));
      toast.success('Evento adicionado à agenda do aluno.');
    } catch { toast.error('Erro ao adicionar evento.'); }
    finally { setIsLoading(false); }
  };

  const handleDeleteAgendaItem = async (uid: string, id: string) => {
    await firebaseService.deleteAgendaItem(id);
    setStudentAgenda(prev => ({ ...prev, [uid]: prev[uid].filter(i => i.id !== id) }));
    toast.success('Evento removido.');
  };

  const handleReplySupportTicket = async (ticketId: string, studentId: string, status: string) => {
    const reply = supportReply[ticketId] || '';
    setIsLoading(true);
    try {
      await firebaseService.updateSupportTicket(ticketId, { status, admin_reply: reply });
      const updated = await firebaseService.getAllSupportTickets();
      setAllSupportTickets((updated as any[]) || []);
      const studentUpdated = await firebaseService.getSupportTickets(studentId);
      setStudentSupport(prev => ({ ...prev, [studentId]: (studentUpdated as any[]) || [] }));
      setSupportReply(prev => ({ ...prev, [ticketId]: '' }));
      toast.success('Ticket atualizado.');
    } catch { toast.error('Erro ao atualizar ticket.'); }
    finally { setIsLoading(false); }
  };

  const handleDeleteStudent = async (uid: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este aluno? Esta ação removerá o perfil do banco de dados e não pode ser desfeita.')) return;
    try {
      await firebaseService.deleteStudent(uid);
      setDraft((prev: any) => ({ ...prev, students: (prev.students || []).filter((s: any) => s.id !== uid) }));
      setSelectedStudentId(null);
      toast.success('Aluno excluído com sucesso.');
    } catch {
      toast.error('Erro ao excluir aluno.');
    }
  };

  useEffect(() => {
    if (auth) firebaseService.getNotices().then(n => setNotices((n as any[]) || []));
  }, [auth]);

  useEffect(() => {
    if (auth && activeTab === 'estudios' && adminStudios.length === 0) {
      loadAdminStudios();
    }
  }, [auth, activeTab]);

  useEffect(() => {
    if (!selectedStudioId || activeTab !== 'estudios' || studioSubTab !== 'atividade') return;
    Promise.all([
      fetch(`/api/studios/${selectedStudioId}/productions`, { credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`/api/studios/${selectedStudioId}/sessions`, { credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([prods, sess]) => {
      setStudioActivity({ productions: Array.isArray(prods) ? prods : [], sessions: Array.isArray(sess) ? sess : [] });
    });
  }, [selectedStudioId, activeTab, studioSubTab]);

  useEffect(() => {
    if (auth && activeTab === 'dashboard') {
      fetch('/api/hub/admin/stats', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setAdminStats(d); })
        .catch(() => {});
    }
  }, [auth, activeTab]);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeBody.trim()) { toast.error('Preencha título e mensagem.'); return; }
    setIsCreatingNotice(true);
    try {
      const created = await firebaseService.createNotice({
        title: noticeTitle,
        body: noticeBody,
        ...(noticeSegment !== 'todos' && { segment: noticeSegment }),
        ...(noticeSegment === 'modulo' && { moduleFilter: noticeModule }),
        ...(noticeSegment === 'status' && { statusFilter: noticeStatusSeg }),
        ...(noticeScheduledAt && { scheduledAt: noticeScheduledAt }),
      } as any);
      setNotices(prev => [created, ...prev]);
      setNoticeTitle('');
      setNoticeBody('');
      setNoticeScheduledAt('');
      setNoticeSegment('todos');
      setNoticeModule('');
      toast.success('Aviso publicado!');
    } catch {
      toast.error('Erro ao publicar aviso.');
    } finally {
      setIsCreatingNotice(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await firebaseService.deleteNotice(id);
      setNotices(prev => prev.filter(n => n.id !== id));
      toast.success('Aviso removido.');
    } catch {
      toast.error('Erro ao remover aviso.');
    }
  };

  const loadAdminStudios = async () => {
    try {
      const list = await firebaseService.getAdminStudios();
      setAdminStudios((list as any[]) || []);
    } catch { toast.error('Erro ao carregar estúdios.'); }
  };

  const handleSelectStudio = async (studioId: string) => {
    const studio = adminStudios.find((s: any) => s.id === studioId);
    setSelectedStudioId(studioId);
    setStudioSubTab('geral');
    setStudioEditDraft({
      name: studio?.name || '',
      description: studio?.description || '',
      isActive: studio?.isActive !== false,
      maxMembers: studio?.profile?.maxMembers ?? null,
      maxProductions: studio?.profile?.maxProductions ?? null,
      maxSessions: studio?.profile?.maxSessions ?? null,
    });
    try {
      const members = await firebaseService.getAdminStudioMembers(studioId);
      setStudioMembers((members as any[]) || []);
    } catch { toast.error('Erro ao carregar membros.'); }
  };

  const handleSaveStudio = async () => {
    if (!selectedStudioId) return;
    setIsLoading(true);
    try {
      await firebaseService.updateAdminStudio(selectedStudioId, studioEditDraft);
      setAdminStudios(prev => prev.map((s: any) =>
        s.id === selectedStudioId ? { ...s, ...studioEditDraft } : s
      ));
      toast.success('Estúdio atualizado.');
    } catch { toast.error('Erro ao salvar estúdio.'); }
    finally { setIsLoading(false); }
  };

  const handleToggleStudioActive = async (studioId: string, isActive: boolean) => {
    try {
      await firebaseService.updateAdminStudio(studioId, { isActive });
      setAdminStudios(prev => prev.map((s: any) => s.id === studioId ? { ...s, isActive } : s));
      setStudioEditDraft((prev: any) => ({ ...prev, isActive }));
      toast.success(isActive ? 'Estúdio ativado.' : 'Estúdio desativado.');
    } catch { toast.error('Erro ao alterar status do estúdio.'); }
  };

  const handleUpdateMemberRole = async (studioId: string, membershipId: string, roles: string[]) => {
    try {
      await firebaseService.updateAdminStudioMemberRole(studioId, membershipId, roles);
      setStudioMembers(prev => prev.map((m: any) =>
        m.id === membershipId ? { ...m, studioRoles: roles, role: roles[0] } : m
      ));
      toast.success('Role atualizado.');
    } catch { toast.error('Erro ao atualizar role.'); }
  };

  const handleRemoveStudioMember = async (studioId: string, membershipId: string) => {
    if (!window.confirm('Remover este membro do estúdio?')) return;
    try {
      await firebaseService.removeAdminStudioMember(studioId, membershipId);
      setStudioMembers(prev => prev.filter((m: any) => m.id !== membershipId));
      toast.success('Membro removido.');
    } catch { toast.error('Erro ao remover membro.'); }
  };

  const handleSaveStudentProgress = async (uid: string) => {
    const prog = studentProgress[uid];
    if (!prog?.module_title) { toast.error('Selecione um módulo.'); return; }
    setIsLoading(true);
    try {
      await firebaseService.upsertStudentEnrollment(uid, { ...prog, enrolled_by: prog.enrolled_by || email || 'Admin' });
      const updated = await firebaseService.getStudentEnrollmentByUid(uid);
      setStudentEnrollments(prev => ({ ...prev, [uid]: updated ?? null }));
      toast.success('Matrícula salva.');
    } catch { toast.error('Erro ao salvar matrícula.'); }
    finally { setIsLoading(false); }
  };

  const handleEnrollmentStatusChange = async (index: number, id: string, status: string) => {
    try {
      await firebaseService.updateEnrollmentStatus(id, status);
      handleChange('enrollments', index, 'status', status);
      toast.success('Status da matrícula atualizado.');
    } catch (error) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const tabGroups = [
    {
      label: 'SECRETARIA',
      tabs: [
        { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
        { id: 'students', label: 'Alunos', icon: GraduationCap },
        { id: 'enrollments', label: 'Matrículas', icon: ClipboardList },
        { id: 'suporte', label: 'Suporte', icon: Headphones },
        { id: 'comunicados', label: 'Comunicados', icon: Bell },
      ],
    },
    {
      label: 'ESTÚDIO',
      tabs: [
        { id: 'estudios', label: 'Estúdios', icon: Building2 },
        { id: 'vendedores', label: 'Vendedores', icon: TrendingUp },
      ],
    },
    {
      label: 'SITE',
      tabs: [
        { id: 'site', label: 'Site', icon: Globe },
      ],
    },
    {
      label: 'SISTEMA',
      tabs: [
        { id: 'settings', label: 'Configurações', icon: Settings },
      ],
    },
  ];

  if (!auth) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex">
        <Toaster theme="light" position="top-center" />
        <div className="w-full flex flex-col justify-center px-8 sm:px-16 md:px-24 relative">
          <button
            onClick={onClose}
            className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar ao site
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full mx-auto"
          >
            <div className="mb-10">
              <h2 className="text-2xl text-gray-900 mb-2 font-display tracking-tight">Painel Administrativo</h2>
              <p className="text-gray-500 text-sm">Acesse com suas credenciais de administrador.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm text-gray-600">E-mail</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@email.com"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-500 transition-colors text-sm"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-gray-600">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
                  <input
                    type="password"
                    value={pwd}
                    onChange={e => setPwd(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-500 transition-colors text-sm"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-6 text-sm rounded-xl bg-gray-900 hover:bg-gray-800 text-white transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Autenticando...' : 'Entrar no Painel'}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => setShowRecovery(v => !v)}
              className="mt-6 text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              {showRecovery ? 'Cancelar recuperação' : 'Não consigo acessar minha conta'}
            </button>

            {showRecovery && (
              <div className="mt-6 p-5 rounded-xl bg-gray-50 border border-gray-200 text-left">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-4">Redefinir acesso — borbaggabriel@gmail.com</p>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={recoveryPwd}
                    onChange={e => setRecoveryPwd(e.target.value)}
                    placeholder="Nova senha (mínimo 6 caracteres)"
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 transition-colors text-sm"
                  />
                  <input
                    type="password"
                    value={recoveryPwdConfirm}
                    onChange={e => setRecoveryPwdConfirm(e.target.value)}
                    placeholder="Confirmar nova senha"
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 transition-colors text-sm"
                  />
                  <button
                    type="button"
                    disabled={isResetting || recoveryPwd.length < 6 || recoveryPwd !== recoveryPwdConfirm}
                    onClick={async () => {
                      if (recoveryPwd !== recoveryPwdConfirm) { toast.error('As senhas não coincidem.'); return; }
                      setIsResetting(true);
                      try {
                        await firebaseService.resetAdminAccess('borbaggabriel@gmail.com', recoveryPwd);
                        toast.success('Conta admin redefinida! Faça login agora.');
                        setEmail('borbaggabriel@gmail.com');
                        setPwd(recoveryPwd);
                        setShowRecovery(false);
                        setRecoveryPwd('');
                        setRecoveryPwdConfirm('');
                      } catch (err: any) {
                        toast.error(err.message || 'Erro ao redefinir acesso.');
                      } finally {
                        setIsResetting(false);
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-700 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResetting ? 'Redefinindo...' : 'Redefinir e Preparar Login'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  const filteredStudents = draft.students?.filter((s: any) =>
    (s.name ?? '').toLowerCase().includes(searchStudent.toLowerCase()) ||
    (s.email ?? '').toLowerCase().includes(searchStudent.toLowerCase())
  ) || [];

  return (
    <div className="fixed inset-0 z-[100] bg-[#f4f5f7] flex overflow-hidden font-sans">
      <Toaster theme="light" position="top-right" />

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 p-8 rounded-3xl max-w-sm w-full shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500 mb-6">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl text-gray-900 mb-2">{confirmModal.title}</h3>
              <p className="text-gray-500 mb-8">{confirmModal.desc}</p>
              <div className="flex gap-4">
                <Button onClick={() => setConfirmModal(null)} variant="outline" className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl">
                  Cancelar
                </Button>
                <Button onClick={confirmModal.action} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl">
                  Excluir
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Loading Overlay */}
      {isLoading && !confirmModal && (
        <div className="fixed inset-0 z-[150] bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-[10px]">Sincronizando Dados...</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col shrink-0 relative z-20 shadow-sm">
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {/* Acesso rápido à plataforma de estúdios */}
          <button
            onClick={async () => {
              setIsLoading(true);
              try {
                const res = await fetch('/api/studios', { credentials: 'include' });
                if (!res.ok) { window.location.href = '/hub-dub/login'; return; }
                const studios: any[] = await res.json();
                if (studios.length === 1) {
                  window.location.href = `/hub-dub/studio/${studios[0].id}/dashboard`;
                } else {
                  window.location.href = '/hub-dub/studios';
                }
              } catch {
                window.location.href = '/hub-dub/login';
              } finally {
                setIsLoading(false);
              }
            }}
            className="w-full group flex items-center gap-3 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white px-4 py-3.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-violet-200 mb-3"
          >
            <Clapperboard className="w-5 h-5 shrink-0" />
            <div className="text-left flex-1">
              <p className="text-[10px] text-violet-200 uppercase tracking-wider leading-none mb-0.5">Plataforma</p>
              <p className="text-sm font-semibold leading-none">Acessar ESTUDIO</p>
            </div>
            <ChevronRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </button>

          {tabGroups.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <div className="h-px bg-gray-100 mx-1 my-2" />}
              <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{group.label}</p>
              {group.tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium relative group ${isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gray-100 border border-gray-200 rounded-xl"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-700'}`} />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <Button onClick={handleLogout} variant="outline" className="w-full border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-red-600 rounded-xl py-6">
            <LogOut className="w-4 h-4 mr-2" /> Sair do Painel
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-[#f4f5f7]">
        {/* Ambient Background */}
        

        <div className="flex-1 overflow-y-auto p-8 md:p-12 relative z-10">
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              
              {/* DASHBOARD TAB */}
              {activeTab === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-3xl font-normal text-gray-900 mb-2 font-display tracking-tight">Visão Geral</h3>
                    <p className="text-muted-foreground">Métricas e status atual da sua plataforma de dublagem.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <button onClick={() => setActiveTab('students')} className="glass-panel p-6 rounded-3xl border-gray-100 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden group text-left hover:border-gray-200 transition-colors">
                      <div className="mb-4">
                        <p className="text-sm text-black">Total de Alunos</p>
                        <h4 className="text-5xl text-black mt-1">{adminStats?.totalStudents ?? draft.students?.length ?? '—'}</h4>
                      </div>
                      <p className="text-xs text-black">{adminStats ? `${adminStats.activeStudios} estúdio(s) ativo(s)` : 'Carregando...'}</p>
                    </button>

                    <button onClick={() => setActiveTab('enrollments')} className="glass-panel p-6 rounded-3xl border-gray-100 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden group text-left hover:border-gray-200 transition-colors">
                      <div className="mb-4">
                        <p className="text-sm text-black">Matrículas Pendentes</p>
                        <h4 className="text-5xl text-black mt-1">{adminStats?.pendingEnrollments ?? '—'}</h4>
                      </div>
                      <p className="text-xs text-black">{!adminStats ? 'Carregando...' : `${adminStats.totalEnrollments ?? 0} matrícula(s) no total`}</p>
                    </button>

                    <button onClick={() => setActiveTab('suporte')} className="glass-panel p-6 rounded-3xl border-gray-100 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden group text-left hover:border-gray-200 transition-colors">
                      <div className="mb-4">
                        <p className="text-sm text-black">Tickets Abertos</p>
                        <h4 className="text-5xl text-black mt-1">{adminStats?.openSupportTickets ?? '—'}</h4>
                      </div>
                      <p className="text-xs text-black">{!adminStats ? 'Carregando...' : adminStats.openSupportTickets > 0 ? 'Aguardando resposta' : 'Tudo resolvido'}</p>
                    </button>

                    <button onClick={() => setActiveTab('estudios')} className="glass-panel p-6 rounded-3xl border-gray-100 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden group text-left hover:border-gray-200 transition-colors">
                      <div className="mb-4">
                        <p className="text-sm text-black">Produções</p>
                        <h4 className="text-5xl text-black mt-1">{adminStats?.totalProductions ?? '—'}</h4>
                      </div>
                      <p className="text-xs text-black">{adminStats?.totalSessions ?? 0} sessão(ões) gravadas</p>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 glass-panel p-8 rounded-3xl border-gray-100">
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-xl text-gray-900 font-display">Crescimento de Alunos</h4>
                        <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm text-muted-foreground focus:outline-none">
                          <option>Últimos 6 meses</option>
                          <option>Este ano</option>
                        </select>
                      </div>
                      <div className="h-64 flex items-end justify-between gap-2">
                        {(adminStats?.enrollmentsByMonth?.length > 0
                          ? adminStats.enrollmentsByMonth
                          : [{month:'Jan',count:0},{month:'Fev',count:0},{month:'Mar',count:0},{month:'Abr',count:0},{month:'Mai',count:0},{month:'Jun',count:0}]
                        ).map((item: any, i: number) => {
                          const maxCount = Math.max(...(adminStats?.enrollmentsByMonth || [{count:1}]).map((x: any) => x.count), 1);
                          const pct = Math.max(Math.round((item.count / maxCount) * 100), 4);
                          return (
                            <div key={i} className="w-full flex flex-col items-center gap-2 group">
                              <span className="text-xs font-bold text-gray-600">{item.count || ''}</span>
                              <div className="w-full bg-gray-100 rounded-t-lg relative overflow-hidden h-52 flex items-end">
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: `${pct}%` }}
                                  transition={{ duration: 0.8, delay: i * 0.08 }}
                                  className="w-full bg-gradient-to-t from-cyan-500/20 to-cyan-400 rounded-t-lg group-hover:from-cyan-400/40 group-hover:to-cyan-300 transition-colors"
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{item.month}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="glass-panel p-8 rounded-3xl border-gray-100 flex flex-col">
                      <h4 className="text-xl text-gray-900 mb-6 font-display">Atividade Recente</h4>
                      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                        {!adminStats && <p className="text-sm text-gray-400 italic">Carregando atividade...</p>}
                        {(adminStats?.recentActivity || []).length === 0 && adminStats && (
                          <p className="text-sm text-gray-400 italic">Nenhuma atividade recente.</p>
                        )}
                        {(adminStats?.recentActivity || []).map((activity: any) => {
                          const who = activity.userName || 'Sistema';
                          // Mapa de ações conhecidas → frase em pt-BR (fallback quando não há details)
                          const ACTION_VERBS: Record<string, string> = {
                            CREATE_STUDIO: 'criou um estúdio',
                            CREATE_STUDIO_WITH_ADMIN: 'criou um estúdio com admin',
                            UPDATE_STUDIO: 'atualizou um estúdio',
                            DELETE_STUDIO: 'excluiu um estúdio',
                            CREATE_USER: 'criou um usuário',
                            UPDATE_USER: 'atualizou um usuário',
                            DELETE_USER: 'excluiu um usuário',
                            UPDATE_ROLE: 'alterou uma função',
                            CREATE_PRODUCTION: 'criou uma produção',
                            UPDATE_PRODUCTION: 'atualizou uma produção',
                            DELETE_PRODUCTION: 'excluiu uma produção',
                            CREATE_SESSION: 'criou uma sessão',
                            DELETE_SESSION: 'excluiu uma sessão',
                            APPROVE_TAKE: 'aprovou um take',
                            REJECT_TAKE: 'rejeitou um take',
                          };
                          // Detalhe vem em pt-BR pronto ("Criou estudio X com admin Y") — usa direto;
                          // senão tenta o mapa; senão humaniza o verbo bruto.
                          const detail = activity.details as string | null;
                          const fallback = ACTION_VERBS[activity.action] || (activity.action || '').toLowerCase().replace(/_/g, ' ');
                          // Se details começa com verbo conjugado (Criou, Excluiu...), usa direto em minúsculo após o nome
                          const phrase = detail
                            ? detail.charAt(0).toLowerCase() + detail.slice(1)
                            : fallback;
                          const initial = (who[0] || '?').toUpperCase();
                          return (
                            <div key={activity.id} className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 text-violet-600 flex items-center justify-center shrink-0 text-xs font-bold">
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm text-gray-900 leading-snug">
                                  <span className="font-semibold">{who}</span>{' '}
                                  <span className="text-gray-700">{phrase}</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">{activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ENROLLMENTS TAB */}
              {activeTab === 'enrollments' && (
                <motion.div
                  key="enrollments"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-3xl font-normal text-gray-900 mb-1 font-display tracking-tight">Matrículas</h3>
                      <p className="text-muted-foreground text-sm">Pipeline de conversão de interessados.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* View toggle */}
                      <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
                        <button
                          onClick={() => setEnrollmentView('table')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${enrollmentView === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <ClipboardList className="w-3.5 h-3.5" /> Lista
                        </button>
                        <button
                          onClick={() => setEnrollmentView('kanban')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${enrollmentView === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <BarChart2 className="w-3.5 h-3.5" /> Kanban
                        </button>
                      </div>
                      {/* CSV export */}
                      <button
                        onClick={() => {
                          const rows = draft.enrollments || [];
                          if (!rows.length) { toast.error('Nenhuma matrícula para exportar.'); return; }
                          const header = ['Nome', 'Email', 'Telefone', 'Módulo', 'Status', 'Data', 'Notas'];
                          // RFC 4180 escape: wrap each value in quotes and double-up any inner quote
                          const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                          const csv = [
                            header.map(escape).join(','),
                            ...rows.map((e: any) => [e.name, e.email, e.phone, e.module, e.status, e.date, e.notes].map(escape).join(',')),
                          ].join('\n');
                          const a = document.createElement('a');
                          a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                          a.download = `matriculas-${new Date().toISOString().slice(0,10)}.csv`;
                          a.click();
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
                        title="Exportar CSV"
                      >
                        <TrendingUp className="w-3.5 h-3.5" /> CSV
                      </button>
                    </div>
                  </div>

                  {/* Conversion KPIs */}
                  {(() => {
                    const enrs = draft.enrollments || [];
                    const total = enrs.length;
                    const stages = [
                      { label: 'Pendentes', status: 'Pendente', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
                      { label: 'Contatados', status: 'Contatado', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
                      { label: 'Matriculados', status: 'Matriculado', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
                      { label: 'Desistiram', status: 'Desistiu', color: 'bg-red-100 text-red-600', dot: 'bg-red-400' },
                    ];
                    const matriculados = enrs.filter((e: any) => e.status === 'Matriculado').length;
                    const convRate = total > 0 ? Math.round((matriculados / total) * 100) : 0;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {stages.map(s => {
                          const count = enrs.filter((e: any) => e.status === s.status).length;
                          return (
                            <div key={s.status} className={`p-4 rounded-2xl ${s.color} text-center cursor-pointer`} onClick={() => setEnrollmentView('table')}>
                              <div className="flex items-center justify-center gap-1.5 mb-1">
                                <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                              </div>
                              <p className="text-3xl font-bold">{count}</p>
                              <p className="text-[10px] font-semibold uppercase tracking-wider mt-1 opacity-70">{s.label}</p>
                            </div>
                          );
                        })}
                        <div className="p-4 rounded-2xl bg-violet-100 text-violet-700 text-center">
                          <p className="text-3xl font-bold">{convRate}%</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mt-1 opacity-70">Conversão</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* TABLE VIEW */}
                  {enrollmentView === 'table' && (
                    <div className="glass-panel rounded-3xl border-gray-100 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-white/[0.02] border-b border-gray-100">
                              <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Interessado</th>
                              <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Curso</th>
                              <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Contato</th>
                              <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                              <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Notas</th>
                              <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {draft.enrollments && draft.enrollments.length > 0 ? (
                              draft.enrollments.map((enrollment: any, index: number) => (
                                <tr key={enrollment.id || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                  <td className="p-5">
                                    <div className="text-gray-900 font-medium">{enrollment.name}</div>
                                    <div className="text-xs text-muted-foreground">{enrollment.email}</div>
                                    <div className="text-xs text-gray-400">{enrollment.date}</div>
                                  </td>
                                  <td className="p-5">
                                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">
                                      {enrollment.module || '—'}
                                    </span>
                                  </td>
                                  <td className="p-5 text-sm text-gray-500">{enrollment.phone}</td>
                                  <td className="p-5">
                                    <select
                                      value={enrollment.status}
                                      onChange={e => handleEnrollmentStatusChange(index, enrollment.id, e.target.value)}
                                      className={`border rounded-lg font-bold text-xs focus:ring-1 focus:ring-gray-400 px-2 py-1 cursor-pointer ${
                                        enrollment.status === 'Matriculado' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                        enrollment.status === 'Contatado' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                        enrollment.status === 'Desistiu' ? 'bg-red-50 border-red-200 text-red-600' :
                                        'bg-gray-50 border-gray-200 text-gray-700'
                                      }`}
                                    >
                                      <option value="Pendente">Pendente</option>
                                      <option value="Contatado">Contatado</option>
                                      <option value="Matriculado">Matriculado</option>
                                      <option value="Desistiu">Desistiu</option>
                                    </select>
                                  </td>
                                  <td className="p-5 min-w-[180px]">
                                    <input
                                      type="text"
                                      value={enrollment.notes || ''}
                                      onChange={e => handleChange('enrollments', index, 'notes', e.target.value)}
                                      onBlur={async e => {
                                        if (!enrollment.id) return;
                                        try {
                                          await fetch(`/api/hub/admin/enrollments/${enrollment.id}`, {
                                            method: 'PATCH', credentials: 'include',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ notes: e.target.value }),
                                          });
                                        } catch {}
                                      }}
                                      placeholder="Anotação..."
                                      className="w-full bg-transparent border-b border-gray-200 focus:border-gray-400 text-xs text-gray-700 py-1 outline-none transition-colors placeholder:text-gray-300"
                                    />
                                  </td>
                                  <td className="p-5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => {
                                          const msg = `Olá ${enrollment.name}, vi seu interesse no curso de dublagem (${enrollment.module}). Podemos conversar?`;
                                          window.open(`https://wa.me/${(enrollment.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                        }}
                                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-green-600 transition-colors"
                                        title="WhatsApp"
                                      >
                                        <MessageSquare className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete('enrollments', index)}
                                        className="p-2 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remover"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} className="p-12 text-center">
                                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                    <ClipboardList className="w-12 h-12 opacity-20" />
                                    <p>Nenhuma solicitação de matrícula.</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* KANBAN VIEW */}
                  {enrollmentView === 'kanban' && (() => {
                    const enrs: any[] = draft.enrollments || [];
                    const cols = [
                      { status: 'Pendente', label: 'Pendente', headerCls: 'bg-gray-100 text-gray-600', dotCls: 'bg-gray-400' },
                      { status: 'Contatado', label: 'Contatado', headerCls: 'bg-blue-100 text-blue-700', dotCls: 'bg-blue-400' },
                      { status: 'Matriculado', label: 'Matriculado', headerCls: 'bg-emerald-100 text-emerald-700', dotCls: 'bg-emerald-500' },
                      { status: 'Desistiu', label: 'Desistiu', headerCls: 'bg-red-100 text-red-600', dotCls: 'bg-red-400' },
                    ];
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {cols.map(col => {
                          const cards = enrs.filter(e => e.status === col.status);
                          return (
                            <div
                              key={col.status}
                              className="flex flex-col gap-2"
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => {
                                e.preventDefault();
                                if (!draggingId) return;
                                const idx = enrs.findIndex(e => e.id === draggingId);
                                if (idx === -1) return;
                                handleEnrollmentStatusChange(idx, draggingId, col.status);
                                setDraggingId(null);
                              }}
                            >
                              {/* Column header */}
                              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${col.headerCls}`}>
                                <div className={`w-2 h-2 rounded-full ${col.dotCls}`} />
                                <span className="text-xs font-bold uppercase tracking-wider">{col.label}</span>
                                <span className="ml-auto text-xs font-bold opacity-60">{cards.length}</span>
                              </div>
                              {/* Cards */}
                              <div className="flex flex-col gap-2 min-h-[80px]">
                                {cards.map((enrollment: any) => {
                                  const idx = enrs.findIndex(e => e.id === enrollment.id);
                                  return (
                                    <div
                                      key={enrollment.id}
                                      draggable
                                      onDragStart={() => setDraggingId(enrollment.id)}
                                      onDragEnd={() => setDraggingId(null)}
                                      className={`glass-panel p-4 rounded-2xl border-gray-100 cursor-grab active:cursor-grabbing transition-all select-none ${draggingId === enrollment.id ? 'opacity-40 scale-95' : 'hover:border-gray-200'}`}
                                    >
                                      <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">{enrollment.name}</p>
                                          <p className="text-xs text-gray-500 truncate">{enrollment.email}</p>
                                        </div>
                                        <button
                                          onClick={() => {
                                            const msg = `Olá ${enrollment.name}, vi seu interesse no curso de dublagem (${enrollment.module}). Podemos conversar?`;
                                            window.open(`https://wa.me/${(enrollment.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                          }}
                                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors shrink-0"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      {enrollment.module && (
                                        <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold mb-2">{enrollment.module}</span>
                                      )}
                                      <input
                                        type="text"
                                        value={enrollment.notes || ''}
                                        onChange={e => handleChange('enrollments', idx, 'notes', e.target.value)}
                                        onClick={ev => ev.stopPropagation()}
                                        onBlur={async e => {
                                          if (!enrollment.id) return;
                                          try {
                                            await fetch(`/api/hub/admin/enrollments/${enrollment.id}`, {
                                              method: 'PATCH', credentials: 'include',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ notes: e.target.value }),
                                            });
                                          } catch {}
                                        }}
                                        placeholder="Anotação..."
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:border-gray-400 outline-none transition-colors placeholder:text-gray-300 mt-1"
                                      />
                                    </div>
                                  );
                                })}
                                {cards.length === 0 && (
                                  <div className="flex items-center justify-center h-16 rounded-2xl border-2 border-dashed border-gray-100 text-xs text-gray-300">
                                    Arraste aqui
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </motion.div>
              )}

              {/* STUDENTS TAB — Portal do Aluno */}
              {activeTab === 'students' && (
                <motion.div
                  key="students"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {/* Header — visible only on list view */}
                  {!selectedStudentId && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-3xl font-normal text-gray-900 mb-2 font-display tracking-tight">Alunos</h3>
                        <p className="text-muted-foreground">Clique em um aluno para gerenciar seu portal completo.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            value={searchStudent}
                            onChange={e => setSearchStudent(e.target.value)}
                            placeholder="Buscar aluno..."
                            className="bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors w-full md:w-64"
                          />
                        </div>
                        <Button
                          onClick={() => setIsCreatingStudent(v => !v)}
                          className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl whimsy-hover shrink-0"
                        >
                          <Plus className="w-4 h-4 mr-2" /> Novo Aluno
                        </Button>
                      </div>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {selectedStudentId ? (
                      /* ── STUDENT DETAIL PAGE ── */
                      (() => {
                        const student = draft.students?.find((s: any) => s.id === selectedStudentId);
                        const uid = selectedStudentId;
                        const subTab = studentSubTab[uid] || 'resumo';
                        const msgs = studentMessages[uid] || [];
                        const invs = studentInvoices[uid] || [];
                        const prog = studentProgress[uid];
                        const savedEnrollment = studentEnrollments[uid];
                        return (
                          <motion.div
                            key="detail"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                          >
                            {/* Top bar */}
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <button
                                onClick={() => setSelectedStudentId(null)}
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-900 transition-colors font-medium"
                              >
                                <ChevronLeft className="w-4 h-4" /> Voltar para alunos
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(uid)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-bold transition-colors"
                              >
                                <Trash2 className="w-4 h-4" /> Excluir Aluno
                              </button>
                            </div>

                            {/* Student info card */}
                            <div className="glass-panel p-6 rounded-3xl border-gray-100 space-y-4">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-violet-600 font-bold text-lg shrink-0">
                                  {(student?.name || student?.email || '?')[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-2xl font-normal text-gray-900 font-display tracking-tight">{student?.name}</h3>
                                  <p className="text-muted-foreground text-sm mt-0.5">{student?.email}</p>
                                  {(student?.lastLoginAt || student?.lastSignInTime) && (
                                    <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                      <Clock className="w-3 h-3" />
                                      Último acesso: {new Date(student.lastLoginAt ?? student.lastSignInTime).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                                  (student?.status || 'Ativo') === 'Ativo' ? 'bg-gray-100 text-gray-700 border border-gray-200'
                                  : (student?.status) === 'Formado' ? 'bg-gray-100 text-gray-700 border border-gray-200'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {student?.status || 'Ativo'}
                                </span>
                              </div>
                              {/* Quick-actions */}
                              <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                                <button
                                  onClick={() => { navigator.clipboard.writeText(student?.email ?? ''); toast.success('Email copiado!'); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
                                >
                                  <Send className="w-3 h-3" /> Copiar Email
                                </button>
                                {student?.phone && (
                                  <button
                                    onClick={() => window.open(`https://wa.me/${(student.phone || '').replace(/\D/g, '')}`, '_blank')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold transition-colors"
                                  >
                                    <MessageSquare className="w-3 h-3" /> WhatsApp
                                  </button>
                                )}
                                <button
                                  onClick={() => setStudentSubTab(p => ({ ...p, [uid]: 'agenda' }))}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold transition-colors"
                                >
                                  <Calendar className="w-3 h-3" /> Agenda
                                </button>
                                <button
                                  onClick={() => setStudentSubTab(p => ({ ...p, [uid]: 'financeiro' }))}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-semibold transition-colors"
                                >
                                  <CreditCard className="w-3 h-3" /> Financeiro
                                </button>
                                <button
                                  onClick={() => setStudentSubTab(p => ({ ...p, [uid]: 'suporte' }))}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-semibold transition-colors"
                                >
                                  <Headphones className="w-3 h-3" /> Suporte
                                </button>
                              </div>
                            </div>

                            {/* Sub-tabs panel */}
                            <div className="glass-panel rounded-3xl border-gray-100 overflow-hidden">
                              <div className="flex gap-1 px-5 pt-4 border-b border-gray-100 overflow-x-auto">
                                {[
                                  { id: 'resumo', label: 'Resumo', icon: LayoutDashboard },
                                  { id: 'matricula', label: 'Matrícula', icon: BookOpen },
                                  { id: 'mensagens', label: 'Mensagens', icon: MessageSquare },
                                  { id: 'financeiro', label: 'Financeiro', icon: CreditCard },
                                  { id: 'agenda', label: 'Agenda', icon: Calendar },
                                  { id: 'suporte', label: 'Suporte', icon: Headphones },
                                ].map(t => (
                                  <button
                                    key={t.id}
                                    onClick={() => setStudentSubTab(p => ({ ...p, [uid]: t.id }))}
                                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${subTab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                  >
                                    <t.icon className="w-4 h-4" /> {t.label}
                                  </button>
                                ))}
                              </div>

                              <div className="p-6 space-y-4">
                                {/* RESUMO */}
                                {subTab === 'resumo' && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                                        <p className="text-2xl font-bold text-gray-900">{msgs.length}</p>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-1">Mensagens</p>
                                      </div>
                                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                                        <p className="text-2xl font-bold text-gray-900">{invs.length}</p>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-1">Faturas</p>
                                      </div>
                                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                                        <p className="text-2xl font-bold text-gray-900">{prog?.module_title ? 1 : 0}</p>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-1">Matrículas</p>
                                      </div>
                                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                                        <p className="text-2xl font-bold text-gray-900">{student?.status === 'Ativo' ? '✓' : '—'}</p>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-1">Status</p>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      {savedEnrollment && (
                                        <div className="p-4 rounded-2xl bg-violet-50 border border-violet-100">
                                          <p className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">Módulo Atual</p>
                                          <p className="text-sm font-medium text-gray-900">{savedEnrollment.module}</p>
                                          <p className="text-xs text-gray-500 mt-1">Status: {savedEnrollment.status}</p>
                                          {savedEnrollment.validity && (
                                            <p className="text-xs text-gray-500">Vigência: {new Date(savedEnrollment.validity).toLocaleDateString('pt-BR')}</p>
                                          )}
                                        </div>
                                      )}
                                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Dados do Aluno</p>
                                        <p className="text-sm text-gray-700">{student?.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{student?.email}</p>
                                        {student?.phone && <p className="text-xs text-gray-500">{student.phone}</p>}
                                        <p className="text-xs text-gray-400 mt-2">ID: <span className="font-mono">{uid.slice(0,12)}...</span></p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* MATRÍCULA */}
                                {subTab === 'matricula' && (
                                  <div className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Módulo</label>
                                        <select
                                          value={prog?.module_title || ''}
                                          onChange={e => {
                                            const mod = draft.modules?.find((m: any) => m.title === e.target.value);
                                            setStudentProgress(p => ({ ...p, [uid]: { ...p[uid], module_title: e.target.value, module_slug: mod?.slug || '', status: p[uid]?.status || 'Ativo', validity: p[uid]?.validity || '', enrolled_by: p[uid]?.enrolled_by || '' } }));
                                          }}
                                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all appearance-none"
                                        >
                                          <option value="" className="bg-white">Selecione</option>
                                          {draft.modules?.map((m: any, i: number) => (
                                            <option key={`${m.slug || m.title}-${i}`} value={m.title} className="bg-white">{m.title}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</label>
                                        <select
                                          value={prog?.status || 'Ativo'}
                                          onChange={e => setStudentProgress(p => ({ ...p, [uid]: { ...p[uid], status: e.target.value, module_title: p[uid]?.module_title || '', module_slug: p[uid]?.module_slug || '', validity: p[uid]?.validity || '', enrolled_by: p[uid]?.enrolled_by || '' } }))}
                                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all appearance-none"
                                        >
                                          <option className="bg-white" value="Ativo">Ativo</option>
                                          <option className="bg-white" value="Inativo">Inativo</option>
                                          <option className="bg-white" value="Trancado">Trancado</option>
                                          <option className="bg-white" value="Formado">Formado</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vigência</label>
                                        <input
                                          type="date"
                                          value={prog?.validity || ''}
                                          onChange={e => setStudentProgress(p => ({ ...p, [uid]: { ...p[uid], validity: e.target.value, module_title: p[uid]?.module_title || '', module_slug: p[uid]?.module_slug || '', status: p[uid]?.status || 'Ativo', enrolled_by: p[uid]?.enrolled_by || '' } }))}
                                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all"
                                        />
                                      </div>
                                    </div>
                                    <Button onClick={() => handleSaveStudentProgress(uid)} disabled={isLoading} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl whimsy-hover">
                                      {isLoading ? 'Salvando...' : savedEnrollment ? 'Atualizar Matrícula' : 'Adicionar Matrícula'}
                                    </Button>

                                    {savedEnrollment && (
                                      <div className="space-y-2 pt-2">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Matrícula Registrada</p>
                                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                            <div>
                                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">ID</p>
                                              <p className="text-xs text-gray-900 font-mono truncate">{savedEnrollment.id}</p>
                                            </div>
                                            <div>
                                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Módulo</p>
                                              <p className="text-xs text-gray-900 truncate">{savedEnrollment.module}</p>
                                            </div>
                                            <div>
                                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Data de Matrícula</p>
                                              <p className="text-xs text-gray-900">{savedEnrollment?.createdAt ? new Date(savedEnrollment.createdAt).toLocaleDateString('pt-BR') : savedEnrollment?.updatedAt ? new Date(savedEnrollment.updatedAt).toLocaleDateString('pt-BR') : '—'}</p>
                                            </div>
                                            <div>
                                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Vigência</p>
                                              <p className="text-xs text-gray-900">{savedEnrollment.validity ? new Date(savedEnrollment.validity).toLocaleDateString('pt-BR') : '—'}</p>
                                            </div>
                                            <div>
                                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Status</p>
                                              <p className="text-xs text-gray-900">{savedEnrollment.status}</p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* MENSAGENS */}
                                {subTab === 'mensagens' && (
                                  <div className="space-y-4">
                                    <div className="space-y-3">
                                      <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Título</label>
                                        <input
                                          type="text"
                                          value={newMessage[uid]?.title || ''}
                                          onChange={e => setNewMessage(p => ({ ...p, [uid]: { ...p[uid], title: e.target.value, body: p[uid]?.body || '' } }))}
                                          placeholder="Ex: Lembrete da próxima aula"
                                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mensagem</label>
                                        <textarea
                                          value={newMessage[uid]?.body || ''}
                                          onChange={e => setNewMessage(p => ({ ...p, [uid]: { ...p[uid], body: e.target.value, title: p[uid]?.title || '' } }))}
                                          placeholder="Escreva o aviso para o aluno..."
                                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all resize-none h-24"
                                        />
                                      </div>
                                      <Button onClick={() => handleSendMessage(uid)} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl whimsy-hover">
                                        Enviar Mensagem
                                      </Button>
                                    </div>
                                    {msgs.length > 0 && (
                                      <div className="space-y-2 mt-4">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Histórico de Mensagens</p>
                                        {msgs.map((msg: any) => (
                                          <div key={msg.id} className="flex items-start gap-3 p-4 rounded-xl bg-gray-100 border border-gray-100">
                                            <div className="flex-1">
                                              <p className="text-sm text-gray-900">{msg.title}</p>
                                              <p className="text-xs text-gray-400 mt-1">{msg.body}</p>
                                            </div>
                                            <button onClick={() => handleDeleteStudentMessage(uid, msg.id)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* FINANCEIRO */}
                                {subTab === 'financeiro' && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                      <input
                                        type="text"
                                        value={newInvoice[uid]?.description || ''}
                                        onChange={e => setNewInvoice(p => ({ ...p, [uid]: { ...p[uid], description: e.target.value, amount: p[uid]?.amount || '', due_date: p[uid]?.due_date || '', status: p[uid]?.status || 'Pendente' } }))}
                                        placeholder="Descrição (ex: Mensalidade Jun/25)"
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all md:col-span-2"
                                      />
                                      <input
                                        type="text"
                                        value={newInvoice[uid]?.amount || ''}
                                        onChange={e => setNewInvoice(p => ({ ...p, [uid]: { ...p[uid], amount: e.target.value, description: p[uid]?.description || '', due_date: p[uid]?.due_date || '', status: p[uid]?.status || 'Pendente' } }))}
                                        placeholder="Valor (R$ 450,00)"
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all"
                                      />
                                      <input
                                        type="date"
                                        value={newInvoice[uid]?.due_date || ''}
                                        onChange={e => setNewInvoice(p => ({ ...p, [uid]: { ...p[uid], due_date: e.target.value, description: p[uid]?.description || '', amount: p[uid]?.amount || '', status: p[uid]?.status || 'Pendente' } }))}
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all"
                                      />
                                    </div>
                                    <Button onClick={() => handleAddInvoice(uid)} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl whimsy-hover">
                                      <Plus className="w-4 h-4 mr-2" /> Adicionar Fatura
                                    </Button>
                                    {invs.length > 0 && (
                                      <div className="space-y-2 mt-2">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Faturas do Aluno</p>
                                        {invs.map((inv: any) => (
                                          <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-gray-100 border border-gray-100">
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm text-gray-900 truncate">{inv.description}</p>
                                              <p className="text-xs text-gray-400">{inv.amount} · Vence {inv.due_date}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              <select
                                                value={inv.status}
                                                onChange={e => handleUpdateInvoiceStatus(uid, inv.id, e.target.value)}
                                                className={`bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold appearance-none focus:outline-none ${inv.status === 'Pago' ? 'text-gray-700' : inv.status === 'Pendente' ? 'text-gray-700' : 'text-gray-400'}`}
                                              >
                                                <option className="bg-white" value="Pendente">Pendente</option>
                                                <option className="bg-white" value="Pago">Pago</option>
                                                <option className="bg-white" value="A Vencer">A Vencer</option>
                                                <option className="bg-white" value="Vencido">Vencido</option>
                                              </select>
                                              <button onClick={() => handleDeleteInvoice(uid, inv.id)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* AGENDA */}
                                {subTab === 'agenda' && (
                                  <div className="space-y-4">
                                    <p className="text-sm text-gray-400">Adicione aulas e eventos à agenda do aluno. Ele verá no Portal do Aluno.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                      <input
                                        type="text"
                                        value={newAgendaItem[uid]?.title || ''}
                                        onChange={e => setNewAgendaItem(p => ({ ...p, [uid]: { ...p[uid], title: e.target.value, date: p[uid]?.date || '', time: p[uid]?.time || '', description: p[uid]?.description || '', type: p[uid]?.type || 'Aula' } }))}
                                        placeholder="Título (ex: Aula 12 — Lip-sync)"
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all"
                                      />
                                      <input
                                        type="date"
                                        value={newAgendaItem[uid]?.date || ''}
                                        onChange={e => setNewAgendaItem(p => ({ ...p, [uid]: { ...p[uid], date: e.target.value, title: p[uid]?.title || '', time: p[uid]?.time || '', description: p[uid]?.description || '', type: p[uid]?.type || 'Aula' } }))}
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all"
                                      />
                                      <input
                                        type="time"
                                        value={newAgendaItem[uid]?.time || ''}
                                        onChange={e => setNewAgendaItem(p => ({ ...p, [uid]: { ...p[uid], time: e.target.value, title: p[uid]?.title || '', date: p[uid]?.date || '', description: p[uid]?.description || '', type: p[uid]?.type || 'Aula' } }))}
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all"
                                      />
                                      <select
                                        value={newAgendaItem[uid]?.type || 'Aula'}
                                        onChange={e => setNewAgendaItem(p => ({ ...p, [uid]: { ...p[uid], type: e.target.value, title: p[uid]?.title || '', date: p[uid]?.date || '', time: p[uid]?.time || '', description: p[uid]?.description || '' } }))}
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all appearance-none"
                                      >
                                        <option className="bg-white" value="Aula">Aula</option>
                                        <option className="bg-white" value="Prova">Prova</option>
                                        <option className="bg-white" value="Banca">Banca</option>
                                        <option className="bg-white" value="Evento">Evento</option>
                                      </select>
                                    </div>
                                    <input
                                      type="text"
                                      value={newAgendaItem[uid]?.description || ''}
                                      onChange={e => setNewAgendaItem(p => ({ ...p, [uid]: { ...p[uid], description: e.target.value, title: p[uid]?.title || '', date: p[uid]?.date || '', time: p[uid]?.time || '', type: p[uid]?.type || 'Aula' } }))}
                                      placeholder="Descrição opcional"
                                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all"
                                    />
                                    <Button onClick={() => handleAddAgendaItem(uid)} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl whimsy-hover">
                                      <Plus className="w-4 h-4 mr-2" /> Adicionar Evento
                                    </Button>
                                    {(studentAgenda[uid] || []).length > 0 && (
                                      <div className="space-y-2 mt-2">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Agenda do Aluno</p>
                                        {(studentAgenda[uid] || []).map((item: any) => (
                                          <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 border border-gray-100">
                                            <div className="flex-1">
                                              <p className="text-sm text-gray-900">{item.title}</p>
                                              <p className="text-xs text-gray-400">{item.date} às {item.time} · {item.type}</p>
                                            </div>
                                            <button onClick={() => handleDeleteAgendaItem(uid, item.id)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* SUPORTE */}
                                {subTab === 'suporte' && (
                                  <div className="space-y-4">
                                    <p className="text-sm text-gray-400">Responda os chamados abertos por este aluno.</p>
                                    {(studentSupport[uid] || []).length === 0 ? (
                                      <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <Headphones className="w-8 h-8 text-gray-600 mb-2" />
                                        <p className="text-gray-500 text-sm">Nenhum chamado aberto por este aluno.</p>
                                      </div>
                                    ) : (
                                      <div className="space-y-4">
                                        {(studentSupport[uid] || []).map((ticket: any) => (
                                          <div key={ticket.id} className="p-4 rounded-2xl bg-gray-100 border border-gray-100 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                              <div>
                                                <p className="text-gray-900">{ticket.subject}</p>
                                                <p className="text-sm text-gray-400 mt-1">{ticket.message}</p>
                                              </div>
                                              <span className={`px-2 py-1 rounded-full text-xs font-bold shrink-0 ${ 'bg-gray-100 text-gray-700' }`}>{ticket.status}</span>
                                            </div>
                                            {ticket.admin_reply && (
                                              <div className="p-3 rounded-lg bg-gray-100 border border-gray-200">
                                                <p className="text-xs text-gray-700 font-bold mb-1">Resposta enviada:</p>
                                                <p className="text-xs text-gray-500">{ticket.admin_reply}</p>
                                              </div>
                                            )}
                                            <div className="space-y-2">
                                              <textarea
                                                value={supportReply[ticket.id] || ''}
                                                onChange={e => setSupportReply(p => ({ ...p, [ticket.id]: e.target.value }))}
                                                placeholder="Escreva sua resposta..."
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all resize-none h-20"
                                              />
                                              <div className="flex gap-2">
                                                <Button onClick={() => handleReplySupportTicket(ticket.id, uid, 'Em Análise')} size="sm" className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-lg">
                                                  Em Análise
                                                </Button>
                                                <Button onClick={() => handleReplySupportTicket(ticket.id, uid, 'Resolvido')} size="sm" className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-lg">
                                                  Resolver
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })()
                    ) : (
                      /* ── STUDENT LIST ── */
                      <motion.div
                        key="list"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                      >

                        {/* Create Student Form */}
                        <AnimatePresence>
                          {isCreatingStudent && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <form onSubmit={handleCreateStudent} className="glass-panel p-8 rounded-3xl border-gray-200 bg-gray-50 space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
                                    <GraduationCap className="w-4 h-4" />
                                  </div>
                                  <h4 className="text-lg text-gray-900">Criar Conta de Aluno</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nome Completo</label>
                                    <input type="text" value={newStudent.full_name} onChange={e => setNewStudent(p => ({ ...p, full_name: e.target.value }))} placeholder="Ana Silva" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all" required />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">E-mail</label>
                                    <input type="email" value={newStudent.email} onChange={e => setNewStudent(p => ({ ...p, email: e.target.value }))} placeholder="ana@email.com" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all" required />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Senha de Acesso</label>
                                    <input type="text" value={newStudent.password} onChange={e => setNewStudent(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all" required minLength={6} />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Módulo Inicial</label>
                                    <select
                                      value={newStudent.module_title}
                                      onChange={e => {
                                        const mod = draft.modules?.find((m: any) => m.title === e.target.value);
                                        setNewStudent(p => ({ ...p, module_title: e.target.value, module_slug: mod?.slug || '' }));
                                      }}
                                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all appearance-none"
                                      required
                                    >
                                      <option value="">Selecione um módulo</option>
                                      {draft.modules?.map((m: any, i: number) => (
                                        <option key={`${m.slug || m.title}-${i}`} value={m.title} className="bg-white">{m.title}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="flex gap-3">
                                  <Button type="submit" disabled={isLoading} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl whimsy-hover">
                                    {isLoading ? 'Criando...' : 'Criar Conta e Matricular'}
                                  </Button>
                                  <Button type="button" onClick={() => setIsCreatingStudent(false)} variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl">
                                    Cancelar
                                  </Button>
                                </div>
                              </form>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Student Cards — grouped by status */}
                        {(() => {
                          const statusGroups = [
                            {
                              label: 'Ativos',
                              accent: 'text-emerald-700',
                              dot: 'bg-emerald-400',
                              check: (s: string) => s === 'approved' || s === 'active',
                            },
                            {
                              label: 'Pendentes',
                              accent: 'text-amber-700',
                              dot: 'bg-amber-400',
                              check: (s: string) => s === 'pending',
                            },
                            {
                              label: 'Inativos',
                              accent: 'text-gray-500',
                              dot: 'bg-gray-400',
                              check: (s: string) => s === 'rejected' || s === 'inactive' || s === 'suspended' || (!s || (s !== 'approved' && s !== 'active' && s !== 'pending')),
                            },
                          ];
                          const totalVisible = filteredStudents.length;
                          if (totalVisible === 0) {
                            return (
                              <div className="glass-panel p-12 rounded-3xl border-gray-100 flex flex-col items-center justify-center text-center">
                                <GraduationCap className="w-12 h-12 text-gray-600 mb-4" />
                                <p className="text-gray-400 font-medium">Nenhum usuário encontrado.</p>
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-8">
                              {statusGroups.map(group => {
                                const members = filteredStudents.filter((s: any) => group.check((s.status ?? '').toLowerCase()));
                                if (members.length === 0) return null;
                                return (
                                  <div key={group.label}>
                                    <div className="flex items-center gap-2 mb-4">
                                      <span className={`w-2 h-2 rounded-full ${group.dot}`} />
                                      <span className={`text-xs font-black uppercase tracking-widest ${group.accent}`}>{group.label}</span>
                                      <span className="text-xs text-gray-400 font-medium">({members.length})</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {members.map((student: any) => (
                                        <div
                                          key={student.id}
                                          className="glass-panel p-5 rounded-3xl border-gray-100 hover:border-gray-200 transition-all group flex flex-col"
                                        >
                                          <button
                                            className="text-left flex-1"
                                            onClick={() => {
                                              handleLoadStudentPortalData(student.id);
                                              handleLoadAgendaAndSupport(student.id);
                                              setSelectedStudentId(student.id);
                                            }}
                                          >
                                            <div className="flex items-center gap-3 mb-3">
                                              <div className="flex-1 min-w-0">
                                                <p className="text-gray-900 truncate">{student.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                                              </div>
                                            </div>
                                            {student.module_title && (
                                              <p className="text-[11px] text-gray-500 truncate mb-2 flex items-center gap-1">
                                                <BookOpen className="w-3 h-3 shrink-0" />
                                                {student.module_title}
                                              </p>
                                            )}
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs text-gray-500">{getRoleLabel(student.role)}</span>
                                              <span className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors flex items-center gap-1">
                                                Ver detalhes <ChevronRight className="w-3 h-3" />
                                              </span>
                                            </div>
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* SITE TAB — unified content editor */}
              {activeTab === 'site' && (
                <motion.div
                  key="site"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-3xl font-normal text-gray-900 mb-2 font-display tracking-tight">Site</h3>
                    <p className="text-muted-foreground">Gerencie todo o conteúdo público do site.</p>
                  </div>

                  {/* Sub-tab nav */}
                  <div className="glass-panel rounded-3xl border-gray-100 overflow-hidden">
                    <div className="flex gap-1 px-5 pt-4 border-b border-gray-100 overflow-x-auto">
                      {[
                        { id: 'banners', label: 'Banners', icon: ImageIcon },
                        { id: 'teachers', label: 'Professores', icon: Users },
                        { id: 'modules', label: 'Módulos', icon: BookOpen },
                        { id: 'learnings', label: 'Aprendizados', icon: Award },
                        { id: 'testimonials', label: 'Depoimentos', icon: MessageSquare },
                        { id: 'faqs', label: 'FAQs', icon: HelpCircle },
                        { id: 'promocao', label: 'Promoção', icon: Tag },
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setSiteSubTab(t.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${siteSubTab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                        >
                          <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="p-8 space-y-8">

                  {/* BANNERS */}
                  {siteSubTab === 'banners' && (<>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xl font-normal text-gray-900 font-display tracking-tight">Banners Principais</h4>
                      <p className="text-muted-foreground text-sm mt-1">Edite os textos e imagens do carrossel inicial do site.</p>
                    </div>
                    <Button
                      onClick={() => handleAdd('banners', { title: 'Novo Banner', subtitle: 'DESTAQUE', description: 'Descrição do banner.', imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070' })}
                      className="bg-white text-black hover:bg-gray-200 rounded-xl whimsy-hover"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Banner
                    </Button>
                  </div>
                  <div className="space-y-6">
                    {draft.banners?.map((banner: any, index: number) => (
                      <div key={index} className="glass-panel p-8 rounded-3xl border-gray-100 relative group overflow-hidden">
                        <div className="absolute inset-0 opacity-20 pointer-events-none">
                          <img src={banner.imageUrl} alt="Background Preview" className="w-full h-full object-cover blur-xl" referrerPolicy="no-referrer" />
                        </div>
                        <div className="absolute top-0 left-0 w-1 h-full bg-gray-300 rounded-l-3xl z-10"></div>
                        <div className="relative z-10">
                          <div className="flex justify-between items-center mb-6">
                            <h4 className="text-xl text-gray-900 font-display">Slide {index + 1}</h4>
                            <button onClick={() => handleDelete('banners', index)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100" title="Remover Banner"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Título Principal</label><input type="text" value={banner.title} onChange={e => handleChange('banners', index, 'title', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-500 transition-all" /></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Subtítulo</label><input type="text" value={banner.subtitle} onChange={e => handleChange('banners', index, 'subtitle', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-500 transition-all" /></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descrição</label><textarea value={banner.description} onChange={e => handleChange('banners', index, 'description', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 h-24 focus:border-gray-500 transition-all resize-none" /></div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">URL da Imagem de Fundo</label>
                              <div className="flex gap-4">
                                <input type="text" value={banner.imageUrl} onChange={e => handleChange('banners', index, 'imageUrl', e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-500 transition-all" />
                                {banner.imageUrl && (<img src={banner.imageUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-gray-200" referrerPolicy="no-referrer" />)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <Button onClick={() => handleSaveTab('banners')} disabled={isLoading} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl px-8 py-5">
                      {isLoading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" />Publicar Alterações</>}
                    </Button>
                  </div>
                  </>)}

                  {/* TEACHERS */}
                  {siteSubTab === 'teachers' && (<>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xl font-normal text-gray-900 font-display tracking-tight">Professores</h4>
                      <p className="text-muted-foreground text-sm mt-1">Atualize a equipe de mestres e suas biografias.</p>
                    </div>
                    <Button onClick={() => handleAdd('teachers', { name: 'Novo Professor', role: 'Módulo', bio: 'Biografia...', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800', specialties: [] })} className="bg-white text-black hover:bg-gray-200 rounded-xl whimsy-hover">
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Professor
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {draft.teachers?.map((teacher: any, index: number) => (
                      <div key={index} className="glass-panel p-6 rounded-3xl border-gray-100 relative group flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                            <img src={teacher.photo} alt="Preview" className="w-16 h-16 rounded-2xl object-cover border border-gray-200 shadow-lg" referrerPolicy="no-referrer" />
                            <div>
                              <h4 className="text-lg text-gray-900 font-display leading-tight">{teacher.name || 'Novo Professor'}</h4>
                              <p className="text-sm text-gray-700">{teacher.role}</p>
                            </div>
                          </div>
                          <button onClick={() => handleDelete('teachers', index)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100" title="Remover Professor"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-4 flex-1">
                          <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome Completo</label><input type="text" value={teacher.name} onChange={e => handleChange('teachers', index, 'name', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-gray-400 transition-all" /></div>
                          <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Função / Módulo</label><input type="text" value={teacher.role} onChange={e => handleChange('teachers', index, 'role', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-gray-400 transition-all" /></div>
                          <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Biografia</label><textarea value={teacher.bio} onChange={e => handleChange('teachers', index, 'bio', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 h-20 focus:border-gray-500 transition-all resize-none" /></div>
                          <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">URL da Foto</label><input type="text" value={teacher.photo} onChange={e => handleChange('teachers', index, 'photo', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-gray-400 transition-all" /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <Button onClick={() => handleSaveTab('teachers')} disabled={isLoading} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl px-8 py-5">
                      {isLoading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" />Publicar Alterações</>}
                    </Button>
                  </div>
                  </>)}

                  {/* MODULES */}
                  {siteSubTab === 'modules' && (<>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xl font-normal text-gray-900 font-display tracking-tight">Módulos do Curso</h4>
                      <p className="text-muted-foreground text-sm mt-1">Edite os módulos, professores e detalhes do curso.</p>
                    </div>
                    <Button onClick={() => handleAdd('modules', { num: String((draft.modules?.length || 0) + 1).padStart(2, '0'), slug: `novo-modulo-${Date.now()}`, title: 'Novo Módulo', teacher: 'Professor', duration: '4 meses', desc: 'Descrição do módulo.', details: { methodology: ['Metodologia 1'], lessons: ['Aula 1'] } })} className="bg-white text-black hover:bg-gray-200 rounded-xl whimsy-hover">
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Módulo
                    </Button>
                  </div>
                  <div className="space-y-6">
                    {draft.modules?.map((module: any, index: number) => (
                      <div key={index} className="glass-panel p-8 rounded-3xl border-gray-100 relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gray-300 rounded-l-3xl z-10"></div>
                        <div className="relative z-10">
                          <div className="flex justify-between items-center mb-6">
                            <h4 className="text-xl text-gray-900 font-display">{module.title}</h4>
                            <button onClick={() => handleDelete('modules', index)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100" title="Remover Módulo"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Título</label><input type="text" value={module.title} onChange={e => handleChange('modules', index, 'title', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-400 transition-all" /></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Professor</label><input type="text" value={module.teacher} onChange={e => handleChange('modules', index, 'teacher', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-400 transition-all" /></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Duração</label><input type="text" value={module.duration || ''} placeholder="Ex: 6 meses" onChange={e => handleChange('modules', index, 'duration', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-400 transition-all" /></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ícone</label><select value={module.icon || 'Mic'} onChange={e => handleChange('modules', index, 'icon', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-400 transition-all appearance-none"><option value="Mic">Microfone</option><option value="Headphones">Fones</option><option value="Star">Estrela</option><option value="BookOpen">Livro</option><option value="Award">Prêmio</option></select></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descrição</label><textarea value={module.desc} onChange={e => handleChange('modules', index, 'desc', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 h-24 focus:border-gray-400 transition-all resize-none" /></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <Button onClick={() => handleSaveTab('modules')} disabled={isLoading} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl px-8 py-5">
                      {isLoading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" />Publicar Alterações</>}
                    </Button>
                  </div>
                  </>)}

                  {/* LEARNINGS */}
                  {siteSubTab === 'learnings' && (<>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xl font-normal text-gray-900 font-display tracking-tight">O que você vai aprender</h4>
                      <p className="text-muted-foreground text-sm mt-1">Edite os pontos de aprendizado do curso.</p>
                    </div>
                    <Button onClick={() => handleAdd('learnings', { title: 'Novo Aprendizado', description: 'Descrição do aprendizado.', module_slug: draft.modules?.[0]?.slug || '' })} className="bg-white text-black hover:bg-gray-200 rounded-xl whimsy-hover">
                      <Plus className="w-4 h-4 mr-2" /> Adicionar
                    </Button>
                  </div>
                  <div className="space-y-6">
                    {draft.learnings?.map((learning: any, index: number) => (
                      <div key={index} className="glass-panel p-8 rounded-3xl border-gray-100 relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gray-300 rounded-l-3xl z-10"></div>
                        <div className="relative z-10">
                          <div className="flex justify-between items-center mb-6">
                            <h4 className="text-xl text-gray-900 font-display">{learning.title}</h4>
                            <button onClick={() => handleDelete('learnings', index)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100" title="Remover"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Módulo</label><select value={learning.module_slug || ''} onChange={e => handleChange('learnings', index, 'module_slug', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-400 transition-all appearance-none"><option value="">— Sem módulo —</option>{draft.modules?.map((mod: any) => (<option key={mod.slug} value={mod.slug}>{mod.title}</option>))}</select></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Título</label><input type="text" value={learning.title} onChange={e => handleChange('learnings', index, 'title', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-400 transition-all" /></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descrição</label><textarea value={learning.description} onChange={e => handleChange('learnings', index, 'description', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 h-24 focus:border-gray-400 transition-all resize-none" /></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <Button onClick={() => handleSaveTab('learnings')} disabled={isLoading} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl px-8 py-5">
                      {isLoading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" />Publicar Alterações</>}
                    </Button>
                  </div>
                  </>)}

                  {/* TESTIMONIALS */}
                  {siteSubTab === 'testimonials' && (<>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xl font-normal text-gray-900 font-display tracking-tight">Depoimentos</h4>
                      <p className="text-muted-foreground text-sm mt-1">Edite os depoimentos dos alunos.</p>
                    </div>
                    <Button onClick={() => handleAdd('testimonials', { name: 'Novo Aluno', role: 'Aluno', text: 'Depoimento do aluno.', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200' })} className="bg-white text-black hover:bg-gray-200 rounded-xl whimsy-hover">
                      <Plus className="w-4 h-4 mr-2" /> Adicionar
                    </Button>
                  </div>
                  <div className="space-y-6">
                    {draft.testimonials?.map((testimonial: any, index: number) => (
                      <div key={index} className="glass-panel p-8 rounded-3xl border-gray-100 relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gray-300 rounded-l-3xl z-10"></div>
                        <div className="relative z-10">
                          <div className="flex justify-between items-center mb-6">
                            <h4 className="text-xl text-gray-900 font-display">{testimonial.name}</h4>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleMove('testimonials', index, -1)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Mover para cima"><ChevronDown className="w-3.5 h-3.5 rotate-180" /></button>
                              <button onClick={() => handleMove('testimonials', index, 1)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Mover para baixo"><ChevronDown className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDelete('testimonials', index)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Remover"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nome</label><input type="text" value={testimonial.name} onChange={e => handleChange('testimonials', index, 'name', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-400 transition-all" /></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cargo</label><input type="text" value={testimonial.role} onChange={e => handleChange('testimonials', index, 'role', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-400 transition-all" /></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Depoimento</label><textarea value={testimonial.text || testimonial.content || ''} onChange={e => handleChange('testimonials', index, 'text', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 h-24 focus:border-gray-400 transition-all resize-none" /></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">URL da Foto</label><input type="text" value={testimonial.avatar || testimonial.imageUrl || ''} onChange={e => handleChange('testimonials', index, 'avatar', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-400 transition-all" /></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <Button onClick={() => handleSaveTab('testimonials')} disabled={isLoading} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl px-8 py-5">
                      {isLoading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" />Publicar Alterações</>}
                    </Button>
                  </div>
                  </>)}

                  {/* FAQS */}
                  {siteSubTab === 'faqs' && (<>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xl font-normal text-gray-900 font-display tracking-tight">Perguntas Frequentes</h4>
                      <p className="text-muted-foreground text-sm mt-1">Edite as perguntas e respostas do FAQ.</p>
                    </div>
                    <Button onClick={() => handleAdd('faqs', { question: 'Nova Pergunta?', answer: 'Nova resposta.' })} className="bg-white text-black hover:bg-gray-200 rounded-xl whimsy-hover">
                      <Plus className="w-4 h-4 mr-2" /> Adicionar FAQ
                    </Button>
                  </div>
                  <div className="space-y-6">
                    {draft.faqs?.map((faq: any, index: number) => (
                      <div key={index} className="glass-panel p-8 rounded-3xl border-gray-100 relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gray-300 rounded-l-3xl z-10"></div>
                        <div className="relative z-10">
                          <div className="flex justify-between items-center mb-6">
                            <h4 className="text-xl text-gray-900 font-display">{faq.question}</h4>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleMove('faqs', index, -1)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Mover para cima"><ChevronDown className="w-3.5 h-3.5 rotate-180" /></button>
                              <button onClick={() => handleMove('faqs', index, 1)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Mover para baixo"><ChevronDown className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDelete('faqs', index)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Remover FAQ"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-6">
                            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pergunta</label><input type="text" value={faq.question} onChange={e => handleChange('faqs', index, 'question', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-400 transition-all" /></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Resposta</label><textarea value={faq.answer} onChange={e => handleChange('faqs', index, 'answer', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 h-24 focus:border-gray-400 transition-all resize-none" /></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <Button onClick={() => handleSaveTab('faqs')} disabled={isLoading} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl px-8 py-5">
                      {isLoading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" />Publicar Alterações</>}
                    </Button>
                  </div>
                  </>)}

                  {/* PROMOCAO */}
                  {siteSubTab === 'promocao' && (
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-xl font-normal text-gray-900 font-display tracking-tight">Banner Promocional</h4>
                      <p className="text-muted-foreground text-sm mt-1">Configure o rodapé de promoção que aparece sobreposto a todo o site.</p>
                    </div>
                    <div className="space-y-8">
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-200">
                        <div>
                          <p className="text-gray-900 font-bold">Ativar banner</p>
                          <p className="text-xs text-gray-400 mt-0.5">Exibe o rodapé promocional para todos os visitantes.</p>
                        </div>
                        <button
                          onClick={() => setDraft((prev: any) => ({ ...prev, settings: { ...prev.settings, promoBanner: { ...prev.settings?.promoBanner, enabled: !prev.settings?.promoBanner?.enabled } } }))}
                          className={`relative w-14 h-7 rounded-full transition-colors ${draft.settings?.promoBanner?.enabled ? 'bg-gray-900' : 'bg-gray-200'}`}
                        >
                          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${draft.settings?.promoBanner?.enabled ? 'translate-x-7' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-600 mb-2">Texto da chamada</label><input type="text" value={draft.settings?.promoBanner?.headline || ''} onChange={e => setDraft((prev: any) => ({ ...prev, settings: { ...prev.settings, promoBanner: { ...prev.settings?.promoBanner, headline: e.target.value } } }))} placeholder="Ex: Aproveite a temporada de descontos" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-gray-900 focus:outline-none focus:border-gray-500 transition-all text-sm" /></div>
                        <div><label className="block text-sm font-bold text-gray-600 mb-2">Badge — valor/desconto</label><input type="text" value={draft.settings?.promoBanner?.badge || ''} onChange={e => setDraft((prev: any) => ({ ...prev, settings: { ...prev.settings, promoBanner: { ...prev.settings?.promoBanner, badge: e.target.value } } }))} placeholder="Ex: R$99" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-gray-900 focus:outline-none focus:border-gray-500 transition-all text-sm" /></div>
                        <div><label className="block text-sm font-bold text-gray-600 mb-2">Badge — subtexto</label><input type="text" value={draft.settings?.promoBanner?.badgeSubtext || ''} onChange={e => setDraft((prev: any) => ({ ...prev, settings: { ...prev.settings, promoBanner: { ...prev.settings?.promoBanner, badgeSubtext: e.target.value } } }))} placeholder="Ex: DE ENTRADA" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-gray-900 focus:outline-none focus:border-gray-500 transition-all text-sm" /></div>
                        <div><label className="block text-sm font-bold text-gray-600 mb-2">Data/hora de expiração</label><input type="datetime-local" value={draft.settings?.promoBanner?.expiresAt ? new Date(draft.settings.promoBanner.expiresAt).toISOString().slice(0,16) : ''} onChange={e => setDraft((prev: any) => ({ ...prev, settings: { ...prev.settings, promoBanner: { ...prev.settings?.promoBanner, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : '' } } }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-gray-900 focus:outline-none focus:border-gray-500 transition-all text-sm" /><p className="text-xs text-gray-500 mt-1.5">Alimenta a contagem regressiva. Deixe vazio para não exibir contador.</p></div>
                        <div><label className="block text-sm font-bold text-gray-600 mb-2">Texto do botão CTA</label><input type="text" value={draft.settings?.promoBanner?.ctaText || ''} onChange={e => setDraft((prev: any) => ({ ...prev, settings: { ...prev.settings, promoBanner: { ...prev.settings?.promoBanner, ctaText: e.target.value } } }))} placeholder="Ex: MATRICULE-SE" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-gray-900 focus:outline-none focus:border-gray-500 transition-all text-sm" /></div>
                        <div><label className="block text-sm font-bold text-gray-600 mb-2">Ação do botão CTA</label><input type="text" value={draft.settings?.promoBanner?.ctaAction || ''} onChange={e => setDraft((prev: any) => ({ ...prev, settings: { ...prev.settings, promoBanner: { ...prev.settings?.promoBanner, ctaAction: e.target.value } } }))} placeholder='"enroll" ou URL externa' className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-gray-900 focus:outline-none focus:border-gray-500 transition-all text-sm" /><p className="text-xs text-gray-500 mt-1.5">Use <code className="text-gray-700">enroll</code> para abrir o modal de matrícula.</p></div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Textura de fundo</p>
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                          {[
                            { label: 'Azul Profundo', style: 'linear-gradient(90deg, #1a1060 0%, #2d1b8e 40%, #1a1060 100%)' },
                            { label: 'Roxo Real', style: 'linear-gradient(90deg, #3b0764 0%, #6d28d9 50%, #3b0764 100%)' },
                            { label: 'Vermelho Vivo', style: 'linear-gradient(90deg, #7f1d1d 0%, #dc2626 50%, #7f1d1d 100%)' },
                            { label: 'Verde Floresta', style: 'linear-gradient(90deg, #052e16 0%, #166534 50%, #052e16 100%)' },
                            { label: 'Âmbar Escuro', style: 'linear-gradient(90deg, #451a03 0%, #b45309 50%, #451a03 100%)' },
                            { label: 'Rosa Escuro', style: 'linear-gradient(90deg, #500724 0%, #be185d 50%, #500724 100%)' },
                            { label: 'Preto Fosco', style: 'linear-gradient(90deg, #000000 0%, #111111 50%, #000000 100%)' },
                            { label: 'Ciano Escuro', style: 'linear-gradient(90deg, #042f2e 0%, #0d9488 50%, #042f2e 100%)' },
                            { label: 'Índigo Neon', style: 'linear-gradient(135deg, #0c0a3e 0%, #4338ca 50%, #6366f1 100%)' },
                            { label: 'Pôr do Sol', style: 'linear-gradient(90deg, #1c0533 0%, #9333ea 35%, #ec4899 65%, #f97316 100%)' },
                            { label: 'Aurora', style: 'linear-gradient(90deg, #0f172a 0%, #1e3a5f 40%, #064e3b 100%)' },
                            { label: 'Noite Estrelada', style: 'radial-gradient(ellipse at center, #1e1b4b 0%, #0f172a 70%)' },
                            { label: 'Dourado Premium', style: 'linear-gradient(90deg, #1c1100 0%, #92400e 40%, #d97706 65%, #92400e 100%)' },
                            { label: 'Grafite', style: 'linear-gradient(90deg, #111827 0%, #374151 50%, #111827 100%)' },
                          ].map(({ label, style }) => {
                            const isSelected = (draft.settings?.promoBanner?.bgStyle || 'linear-gradient(90deg, #1a1060 0%, #2d1b8e 40%, #1a1060 100%)') === style;
                            return (
                              <button key={label} title={label} onClick={() => setDraft((prev: any) => ({ ...prev, settings: { ...prev.settings, promoBanner: { ...prev.settings?.promoBanner, bgStyle: style } } }))}
                                className={`w-full aspect-[3/1] rounded-lg border-2 transition-all ${isSelected ? 'border-cyan-400 scale-110 shadow-[0_0_12px_rgba(34,211,238,0.5)]' : 'border-transparent hover:border-white/30'}`}
                                style={{ background: style }}
                              />
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Pré-visualização</p>
                        <div className="rounded-2xl overflow-hidden relative" style={{background: draft.settings?.promoBanner?.bgStyle || 'linear-gradient(90deg, #1a1060 0%, #2d1b8e 40%, #1a1060 100%)'}}>
                          <div className="h-20 flex items-center justify-center px-10 gap-6 relative">
                            <p className="text-white font-semibold text-sm">{draft.settings?.promoBanner?.headline || 'Texto da chamada'}</p>
                            <div className="shrink-0 flex flex-col items-center justify-center bg-white rounded-full w-16 h-16 shadow-xl leading-none ring-4 ring-white/30">
                              <span className="text-[#1a1060] font-black text-base leading-none">{draft.settings?.promoBanner?.badge || 'R$99'}</span>
                              {draft.settings?.promoBanner?.badgeSubtext && (<span className="text-[#1a1060] font-bold text-[8px] uppercase tracking-wide leading-none mt-0.5">{draft.settings.promoBanner.badgeSubtext}</span>)}
                            </div>
                            <p className="text-white font-mono font-bold text-sm shrink-0">00:00:00</p>
                            <span className="shrink-0 bg-white text-[#1a1060] font-black text-xs px-4 py-2 rounded-full uppercase tracking-wide">{draft.settings?.promoBanner?.ctaText || 'MATRICULE-SE'}</span>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 text-sm">✕</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end pt-4 border-t border-gray-100">
                        <Button onClick={() => handleSaveTab('promocao')} disabled={isLoading} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl px-8 py-5">
                          {isLoading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" />Publicar Alterações</>}
                        </Button>
                      </div>
                    </div>
                  </div>
                  )}

                    </div>
                  </div>
                </motion.div>
              )}


              {/* VENDEDORES TAB */}
              {activeTab === 'vendedores' && (
                <motion.div key="vendedores" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-normal text-gray-900 font-display tracking-tight">Vendedores</h2>
                      <p className="text-sm text-gray-500 mt-1">Gerencie vendedores e suas taxas de comissão.</p>
                    </div>
                    <Button onClick={() => setIsCreatingVendedor(v => !v)} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl whimsy-hover shrink-0">
                      <Plus className="w-4 h-4 mr-2" /> Novo Vendedor
                    </Button>
                  </div>

                  {/* KPI cards */}
                  {vendedores.length > 0 && (() => {
                    const avgComissao = vendedores.reduce((sum, v) => sum + (v.percentual ?? 10), 0) / vendedores.length;
                    const maxComissao = Math.max(...vendedores.map(v => v.percentual ?? 10));
                    return (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-4 rounded-2xl bg-gray-100 text-gray-700 text-center">
                          <p className="text-3xl font-bold">{vendedores.length}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mt-1 opacity-70">Vendedores</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-violet-100 text-violet-700 text-center">
                          <p className="text-3xl font-bold">{avgComissao.toFixed(1)}%</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mt-1 opacity-70">Comissão Média</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-700 text-center">
                          <p className="text-3xl font-bold">{maxComissao}%</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mt-1 opacity-70">Maior Comissão</p>
                        </div>
                      </div>
                    );
                  })()}

                  <AnimatePresence>
                    {isCreatingVendedor && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!newVendedor.full_name || !newVendedor.email || !newVendedor.password) {
                              toast.error('Preencha todos os campos.'); return;
                            }
                            setIsLoading(true);
                            try {
                              const res = await fetch('/api/hub/admin/students', {
                                method: 'POST', credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ...newVendedor, role: 'vendedor' }),
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.message);
                              await fetch(`/api/hub/admin/users/${data.id}/role`, {
                                method: 'PATCH', credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ role: 'vendedor' }),
                              });
                              await fetch(`/api/hub/admin/vendedores/${data.id}/comissao`, {
                                method: 'PATCH', credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ percentual: parseFloat(newVendedor.percentual) || 10 }),
                              });
                              toast.success(`Vendedor ${newVendedor.email} criado.`);
                              setNewVendedor({ full_name: '', email: '', password: '', percentual: '10' });
                              setIsCreatingVendedor(false);
                              const vends = await fetch('/api/hub/admin/vendedores', { credentials: 'include' }).then(r => r.json()).catch(() => []);
                              setVendedores(Array.isArray(vends) ? vends : []);
                            } catch (err: any) {
                              toast.error(err.message || 'Erro ao criar vendedor.');
                            } finally { setIsLoading(false); }
                          }}
                          className="glass-panel p-6 rounded-3xl border-gray-100 space-y-4 mb-4"
                        >
                          <h3 className="text-gray-900 font-semibold">Novo Vendedor</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5">Nome completo</label>
                              <input type="text" value={newVendedor.full_name} onChange={e => setNewVendedor(p => ({ ...p, full_name: e.target.value }))} placeholder="Nome" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-gray-400 transition-all" required />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5">Email</label>
                              <input type="email" value={newVendedor.email} onChange={e => setNewVendedor(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-gray-400 transition-all" required />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5">Senha</label>
                              <input type="password" value={newVendedor.password} onChange={e => setNewVendedor(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-gray-400 transition-all" required />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5">Comissão (%)</label>
                              <input type="number" min="0" max="100" step="0.5" value={newVendedor.percentual} onChange={e => setNewVendedor(p => ({ ...p, percentual: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-gray-400 transition-all" />
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button type="submit" disabled={isLoading} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl">
                              {isLoading ? 'Criando...' : 'Criar Vendedor'}
                            </Button>
                            <Button type="button" onClick={() => setIsCreatingVendedor(false)} variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl">Cancelar</Button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="relative mb-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={vendedorSearch} onChange={e => setVendedorSearch(e.target.value)} placeholder="Buscar vendedor..." className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 transition-colors" />
                  </div>

                  {vendedores.filter(v => (v.fullName || v.email || '').toLowerCase().includes(vendedorSearch.toLowerCase())).length === 0 ? (
                    <div className="glass-panel p-12 rounded-3xl border-gray-100 flex flex-col items-center justify-center text-center">
                      <Users className="w-12 h-12 text-gray-600 mb-4" />
                      <p className="text-gray-400 font-medium">Nenhum vendedor cadastrado ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {vendedores.filter(v => (v.fullName || v.email || '').toLowerCase().includes(vendedorSearch.toLowerCase())).map((v: any) => (
                        <div key={v.id} className="glass-panel p-6 rounded-3xl border-gray-100 space-y-4">
                          {/* Top row */}
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-sm shrink-0">
                                {(v.fullName || v.email || '?')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-gray-900 font-semibold">{v.fullName || v.displayName || '—'}</p>
                                <p className="text-sm text-gray-500">{v.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5">
                                <label className="text-xs text-gray-500 uppercase tracking-widest">Comissão</label>
                                <input
                                  type="number" min="0" max="100" step="0.5"
                                  defaultValue={v.percentual ?? 10}
                                  onBlur={async (e) => {
                                    const val = parseFloat(e.target.value);
                                    if (isNaN(val)) return;
                                    await fetch(`/api/hub/admin/vendedores/${v.id}/comissao`, {
                                      method: 'PATCH', credentials: 'include',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ percentual: val }),
                                    });
                                    setVendedores(prev => prev.map(x => x.id === v.id ? { ...x, percentual: val } : x));
                                    toast.success('Comissão atualizada.');
                                  }}
                                  className="w-16 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 text-sm text-center focus:border-gray-400 transition-all"
                                />
                                <span className="text-gray-500 text-sm">%</span>
                              </div>
                              <Button
                                onClick={() => setConfirmModal({ isOpen: true, title: 'Remover Vendedor', desc: `Remover acesso de vendedor de ${v.email}?`, action: async () => {
                                  await fetch(`/api/hub/admin/users/${v.id}/role`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'user' }) });
                                  setVendedores(prev => prev.filter(x => x.id !== v.id));
                                  setConfirmModal(null);
                                  toast.success('Vendedor removido.');
                                }})}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl"
                                size="sm" variant="outline"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Commission progress bar */}
                          <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                              <span>Taxa de comissão</span>
                              <span className="font-bold text-violet-600">{v.percentual ?? 10}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all"
                                style={{ width: `${Math.min(v.percentual ?? 10, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Affiliate link */}
                          {(() => {
                            const refCode = v.id?.slice(0, 8) ?? v.email?.split('@')[0];
                            const link = `${window.location.origin}?ref=${refCode}`;
                            return (
                              <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                                <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <p className="flex-1 text-xs text-gray-500 font-mono truncate">{link}</p>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copiado!'); }}
                                  className="px-2 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold transition-colors shrink-0"
                                >
                                  Copiar
                                </button>
                                <button
                                  onClick={() => {
                                    const report = `📊 Relatório de Comissão — ${v.fullName || v.email}\nComissão: ${v.percentual ?? 10}%\nLink de afiliado: ${link}`;
                                    navigator.clipboard.writeText(report);
                                    toast.success('Relatório copiado!');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-semibold transition-colors shrink-0"
                                >
                                  Relatório
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* SUPORTE TAB — Global */}
              {activeTab === 'suporte' && (
                <motion.div
                  key="suporte"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-3xl font-normal text-gray-900 mb-2 font-display tracking-tight">Central de Suporte</h3>
                      <p className="text-muted-foreground">Todos os chamados abertos pelos alunos em um só lugar.</p>
                    </div>
                    <Button
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const tickets = await firebaseService.getAllSupportTickets();
                          setAllSupportTickets((tickets as any[]) || []);
                        } finally { setIsLoading(false); }
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl shrink-0"
                    >
                      Atualizar Lista
                    </Button>
                  </div>

                  {/* KPIs */}
                  {(() => {
                    const kpis = [
                      { label: 'Total', value: allSupportTickets.length, color: 'bg-gray-100 text-gray-700' },
                      { label: 'Abertos', value: allSupportTickets.filter(t => t.status === 'Aberto').length, color: 'bg-amber-100 text-amber-700' },
                      { label: 'Em Análise', value: allSupportTickets.filter(t => t.status === 'Em Análise').length, color: 'bg-blue-100 text-blue-700' },
                      { label: 'Resolvidos', value: allSupportTickets.filter(t => t.status === 'Resolvido').length, color: 'bg-emerald-100 text-emerald-700' },
                    ];
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {kpis.map(k => (
                          <div key={k.label} className={`p-4 rounded-2xl ${k.color} text-center`}>
                            <p className="text-3xl font-bold">{k.value}</p>
                            <p className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-70">{k.label}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Filtros */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
                      {['todos', 'Aberto', 'Em Análise', 'Resolvido'].map(s => (
                        <button
                          key={s}
                          onClick={() => setSupportStatusFilter(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            supportStatusFilter === s
                              ? s === 'Aberto' ? 'bg-amber-100 text-amber-700'
                                : s === 'Em Análise' ? 'bg-blue-100 text-blue-700'
                                : s === 'Resolvido' ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-900 text-white'
                              : 'text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          {s === 'todos' ? 'Todos' : s}
                        </button>
                      ))}
                    </div>
                    <select
                      value={supportCategoryFilter}
                      onChange={e => setSupportCategoryFilter(e.target.value)}
                      className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-gray-400 transition-colors"
                    >
                      <option value="todos">Todas as categorias</option>
                      {['Dúvida sobre aulas', 'Problema técnico', 'Financeiro', 'Reposição de aula', 'Outros']
                        .filter(cat => allSupportTickets.some((t: any) => t.subject === cat))
                        .map(cat => <option key={cat} value={cat}>{cat}</option>)
                      }
                    </select>
                    <select
                      value={supportPriorityFilter}
                      onChange={e => setSupportPriorityFilter(e.target.value)}
                      className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-gray-400 transition-colors"
                    >
                      <option value="todos">Toda prioridade</option>
                      {['Urgente', 'Alta', 'Média', 'Baixa'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {(supportStatusFilter !== 'todos' || supportCategoryFilter !== 'todos' || supportPriorityFilter !== 'todos') && (
                      <button
                        onClick={() => { setSupportStatusFilter('todos'); setSupportCategoryFilter('todos'); setSupportPriorityFilter('todos'); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-gray-800 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <X className="w-3 h-3" /> Limpar filtros
                      </button>
                    )}
                  </div>

                  {(() => {
                    const CANNED = [
                      'Obrigado por entrar em contato! Estamos analisando sua solicitação.',
                      'Seu chamado foi resolvido. Por favor, avise se precisar de mais alguma coisa.',
                      'Precisamos de mais informações. Poderia detalhar melhor o problema?',
                      'Identificamos o problema e já estamos trabalhando na solução.',
                      'Agendamos uma sessão de reposição. Você receberá o link em breve.',
                    ];
                    const slaLabel = (createdAt: any) => {
                      if (!createdAt) return null;
                      const diff = Date.now() - new Date(createdAt).getTime();
                      const hours = Math.floor(diff / 3600000);
                      if (hours < 1) return '< 1h';
                      if (hours < 24) return `${hours}h`;
                      const days = Math.floor(hours / 24);
                      return `${days}d`;
                    };
                    const filtered = allSupportTickets.filter((t: any) => {
                      const matchStatus = supportStatusFilter === 'todos' || t.status === supportStatusFilter;
                      const matchCat = supportCategoryFilter === 'todos' || t.subject === supportCategoryFilter;
                      const matchPrio = supportPriorityFilter === 'todos' || t.priority === supportPriorityFilter;
                      return matchStatus && matchCat && matchPrio;
                    });
                    return filtered.length === 0 ? (
                    <div className="glass-panel p-12 rounded-3xl border-gray-100 flex flex-col items-center justify-center text-center">
                      <Headphones className="w-12 h-12 text-gray-600 mb-4" />
                      <p className="text-gray-400 font-medium">{allSupportTickets.length === 0 ? 'Nenhum chamado ainda.' : 'Nenhum chamado com esses filtros.'}</p>
                      <p className="text-gray-600 text-sm mt-1">{allSupportTickets.length === 0 ? 'Clique em "Atualizar Lista" para carregar os chamados.' : 'Tente remover ou alterar os filtros.'}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filtered.map((ticket: any) => (
                        <div key={ticket.id} className="glass-panel p-6 rounded-3xl border-gray-100 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <p className="text-gray-900 font-medium">{ticket.subject}</p>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  ticket.status === 'Aberto' ? 'bg-amber-100 text-amber-700' :
                                  ticket.status === 'Em Análise' ? 'bg-blue-100 text-blue-700' :
                                  ticket.status === 'Resolvido' ? 'bg-emerald-100 text-emerald-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>{ticket.status}</span>
                                {ticket.priority && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                    ticket.priority === 'Urgente' ? 'bg-red-100 text-red-700' :
                                    ticket.priority === 'Alta' ? 'bg-orange-100 text-orange-700' :
                                    ticket.priority === 'Média' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-500'
                                  }`}>{ticket.priority}</span>
                                )}
                                {slaLabel(ticket.createdAt) && (
                                  <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
                                    <Clock className="w-3 h-3" /> {slaLabel(ticket.createdAt)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mb-1">{ticket.message}</p>
                              <div className="flex items-center gap-3">
                                <p className="text-xs text-gray-500">De: {ticket.name} ({ticket.email})</p>
                                <select
                                  value={ticket.priority || ''}
                                  onChange={async e => {
                                    const newPrio = e.target.value;
                                    await firebaseService.updateSupportTicket(ticket.id, { priority: newPrio });
                                    setAllSupportTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, priority: newPrio } : t));
                                  }}
                                  className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:outline-none"
                                >
                                  <option value="">Prioridade...</option>
                                  {['Urgente', 'Alta', 'Média', 'Baixa'].map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                          {ticket.admin_reply && (
                            <div className="p-3 rounded-xl bg-gray-100 border border-gray-200">
                              <p className="text-xs font-bold text-gray-700 mb-1">Resposta enviada:</p>
                              <p className="text-sm text-gray-500">{ticket.admin_reply}</p>
                            </div>
                          )}
                          <div className="space-y-2">
                            <div className="relative">
                              <textarea
                                value={supportReply[ticket.id] || ''}
                                onChange={e => setSupportReply(p => ({ ...p, [ticket.id]: e.target.value }))}
                                placeholder="Escreva uma resposta para o aluno..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all resize-none h-20"
                              />
                              <div className="relative mt-1">
                                <button
                                  type="button"
                                  onClick={() => setShowCannedResponses(showCannedResponses === ticket.id ? null : ticket.id)}
                                  className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
                                >
                                  <MessageSquare className="w-3 h-3" /> Respostas rápidas
                                </button>
                                {showCannedResponses === ticket.id && (
                                  <div className="absolute left-0 top-6 z-50 bg-white border border-gray-200 rounded-2xl shadow-lg py-1 w-80">
                                    {CANNED.map((text, ci) => (
                                      <button
                                        key={ci}
                                        type="button"
                                        onClick={() => { setSupportReply(p => ({ ...p, [ticket.id]: text })); setShowCannedResponses(null); }}
                                        className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                                      >
                                        {text}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <Button
                                onClick={() => handleReplySupportTicket(ticket.id, ticket.student_id, 'Em Análise')}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl"
                              >
                                Marcar Em Análise
                              </Button>
                              <Button
                                onClick={() => handleReplySupportTicket(ticket.id, ticket.student_id, 'Resolvido')}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl"
                              >
                                Resolver e Responder
                              </Button>
                              <Button
                                onClick={async () => {
                                  await firebaseService.deleteSupportTicket(ticket.id);
                                  setAllSupportTickets(prev => prev.filter(t => t.id !== ticket.id));
                                  toast.success('Chamado removido.');
                                }}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl ml-auto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                  })()}
                </motion.div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === 'settings' && (
                <motion.div 
                  key="settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-3xl font-normal text-gray-900 mb-2 font-display tracking-tight">Configurações do Sistema</h3>
                    <p className="text-muted-foreground">Gerencie chaves de API, integrações e parâmetros globais.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* General Settings */}
                    <div className="glass-panel p-8 md:p-10 rounded-3xl border-gray-100">
                      <h4 className="text-lg text-gray-900 mb-6 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                          <Settings className="w-4 h-4" />
                        </div>
                        Geral
                      </h4>
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-bold text-gray-600 mb-2">Nome do Site</label>
                          <input
                            type="text"
                            value={draft.settings?.siteName || ''}
                            onChange={e => handleSettingChange('siteName', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-gray-900 focus:outline-none focus:border-gray-500 transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-600 mb-2">E-mail de Contato</label>
                          <input
                            type="email"
                            value={draft.settings?.contactEmail || ''}
                            onChange={e => handleSettingChange('contactEmail', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-gray-900 focus:outline-none focus:border-gray-500 transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-600 mb-2">WhatsApp Comercial</label>
                          <input
                            type="text"
                            value={draft.settings?.whatsapp || ''}
                            onChange={e => handleSettingChange('whatsapp', e.target.value)}
                            placeholder="55119XXXXXXXX"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-gray-900 focus:outline-none focus:border-gray-500 transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-600 mb-2">Instagram</label>
                          <input
                            type="text"
                            value={draft.settings?.instagram || ''}
                            onChange={e => handleSettingChange('instagram', e.target.value)}
                            placeholder="@seuestudio"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-gray-900 focus:outline-none focus:border-gray-500 transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Maintenance & System */}
                    <div className="glass-panel p-8 md:p-10 rounded-3xl border-gray-100 space-y-6">
                      <h4 className="text-lg text-gray-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                          <Shield className="w-4 h-4" />
                        </div>
                        Sistema
                      </h4>
                      {/* Maintenance Mode */}
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-200">
                        <div>
                          <p className="text-sm font-bold text-gray-800">Modo Manutenção</p>
                          <p className="text-xs text-gray-500 mt-0.5">Exibe aviso de manutenção para visitantes do site.</p>
                        </div>
                        <button
                          onClick={() => setDraft((prev: any) => ({
                            ...prev,
                            settings: { ...prev.settings, maintenanceMode: !prev.settings?.maintenanceMode }
                          }))}
                          className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${draft.settings?.maintenanceMode ? 'bg-amber-500' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${draft.settings?.maintenanceMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                      {/* Seed DB */}
                      <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                        <p className="text-sm font-bold text-red-800 mb-1">Inicializar Banco de Dados</p>
                        <p className="text-xs text-red-600 mb-4">Sobrescreve banners, módulos, learnings, depoimentos, FAQs e configurações com os dados padrão. Operação irreversível.</p>
                        <button
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            title: 'Inicializar Banco de Dados',
                            desc: 'Esta ação irá SOBRESCREVER todo o conteúdo do site (banners, módulos, FAQs, etc.) com os dados padrão do currículo. Esta operação é irreversível. Deseja continuar?',
                            action: async () => {
                              setConfirmModal(null);
                              await handleSeedDatabase();
                            }
                          })}
                          disabled={isSeedingDb}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-100 border border-red-300 text-red-700 font-bold text-sm hover:bg-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Database className="w-4 h-4" />
                          {isSeedingDb ? 'Inicializando...' : 'Inicializar com Currículo Padrão'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-gray-200 mt-8 flex justify-end">
                    <Button onClick={() => handleSaveTab('settings')} disabled={isLoading} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl px-8 py-5 shadow-sm transition-all whimsy-hover disabled:opacity-50 disabled:cursor-not-allowed">
                      {isLoading ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin mr-2 inline-block" /> : <Save className="w-4 h-4 mr-2" />}
                      {isLoading ? 'Salvando...' : 'Publicar Alterações'}
                    </Button>
                  </div>
                </motion.div>
              )}


              {/* COMUNICADOS TAB */}
              {activeTab === 'comunicados' && (
                <motion.div
                  key="comunicados"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-3xl font-normal text-gray-900 mb-2 font-display tracking-tight">Quadro de Avisos</h3>
                    <p className="text-muted-foreground">Publique avisos que aparecerão no portal de todos os alunos.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Create Form */}
                    <div className="lg:col-span-2 glass-panel p-8 rounded-3xl border-gray-100 self-start">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
                          <Megaphone className="w-5 h-5" />
                        </div>
                        <h4 className="text-lg text-gray-900">Novo Aviso</h4>
                      </div>
                      <form onSubmit={handleCreateNotice} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Título</label>
                          <input
                            type="text"
                            value={noticeTitle}
                            onChange={e => setNoticeTitle(e.target.value)}
                            placeholder="Ex: Aula especial esta semana!"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-400 transition-colors text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Mensagem</label>
                          <textarea
                            value={noticeBody}
                            onChange={e => setNoticeBody(e.target.value)}
                            placeholder="Escreva o aviso..."
                            rows={4}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-400 transition-colors resize-none text-sm"
                          />
                        </div>

                        {/* Segmentation */}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Para</label>
                          <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
                            {[{ v: 'todos', l: 'Todos' }, { v: 'modulo', l: 'Módulo' }, { v: 'status', l: 'Status' }].map(opt => (
                              <button key={opt.v} type="button"
                                onClick={() => setNoticeSegment(opt.v as any)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${noticeSegment === opt.v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                              >{opt.l}</button>
                            ))}
                          </div>
                          {noticeSegment === 'modulo' && (
                            <input
                              type="text"
                              value={noticeModule}
                              onChange={e => setNoticeModule(e.target.value)}
                              placeholder="Slug do módulo (ex: modulo-1)"
                              className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-gray-400"
                            />
                          )}
                          {noticeSegment === 'status' && (
                            <select
                              value={noticeStatusSeg}
                              onChange={e => setNoticeStatusSeg(e.target.value)}
                              className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-gray-400"
                            >
                              {['Ativo', 'Pendente', 'Inativo'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          )}
                        </div>

                        {/* Scheduling */}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Agendar para (opcional)</label>
                          <input
                            type="datetime-local"
                            value={noticeScheduledAt}
                            onChange={e => setNoticeScheduledAt(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-gray-400 transition-colors"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isCreatingNotice || !noticeTitle.trim() || !noticeBody.trim()}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-900 hover:bg-gray-700 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {noticeScheduledAt ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                          {isCreatingNotice ? 'Publicando...' : noticeScheduledAt ? 'Agendar Aviso' : 'Publicar Aviso'}
                        </button>
                      </form>
                    </div>

                    {/* Notices List */}
                    <div className="lg:col-span-3 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-normal text-gray-900 uppercase tracking-widest">Avisos Publicados</h4>
                        <span className="text-xs text-gray-500">{notices.length} aviso(s)</span>
                      </div>
                      {notices.length === 0 ? (
                        <div className="glass-panel p-10 rounded-3xl border-gray-100 flex flex-col items-center justify-center text-center">
                          <Bell className="w-10 h-10 text-gray-600 mb-3" />
                          <p className="text-gray-400 font-medium text-sm">Nenhum aviso publicado.</p>
                          <p className="text-gray-600 text-xs mt-1">Crie um aviso no formulário ao lado.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {notices.filter(Boolean).map((n: any) => {
                            const date = n.created_at ? new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                            return (
                              <div key={n.id} className="glass-panel p-5 rounded-2xl border-gray-100 flex items-start gap-4">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${n.scheduledAt && new Date(n.scheduledAt) > new Date() ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-700'}`}>
                                  {n.scheduledAt && new Date(n.scheduledAt) > new Date() ? <Clock className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                                    {n.segment && n.segment !== 'todos' && (
                                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
                                        {n.segment === 'modulo' ? `Módulo: ${n.moduleFilter ?? ''}` : `Status: ${n.statusFilter ?? ''}`}
                                      </span>
                                    )}
                                    {n.scheduledAt && new Date(n.scheduledAt) > new Date() && (
                                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-violet-100 text-violet-700">
                                        Agendado: {new Date(n.scheduledAt).toLocaleString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.body}</p>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    {date && <p className="text-[10px] text-gray-400">{date}</p>}
                                    {(n.readBy?.length > 0 || n.readCount > 0) && (
                                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                                        <CheckCircle2 className="w-3 h-3" /> {n.readBy?.length ?? n.readCount} leitura(s)
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteNotice(n.id)}
                                  className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                                  title="Remover aviso"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ESTUDIOS TAB */}
              {activeTab === 'estudios' && (
                <motion.div
                  key="estudios"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <AnimatePresence mode="wait">
                    {selectedStudioId ? (
                      (() => {
                        const studio = adminStudios.find((s: any) => s.id === selectedStudioId);
                        const dubladores = studioMembers.filter((m: any) =>
                          (m.studioRoles || []).includes('dublador') || m.role === 'dublador'
                        );
                        return (
                          <motion.div
                            key="studio-detail"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                          >
                            {/* Top bar */}
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <button
                                onClick={() => setSelectedStudioId(null)}
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-900 transition-colors font-medium"
                              >
                                <ChevronLeft className="w-4 h-4" /> Voltar para estúdios
                              </button>
                              <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${studioEditDraft.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                  {studioEditDraft.isActive !== false ? 'Ativo' : 'Inativo'}
                                </span>
                                <span className="text-sm text-gray-400 font-mono">{studio?.slug}</span>
                              </div>
                            </div>

                            {/* Studio header card */}
                            <div className="glass-panel p-6 rounded-3xl border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center shrink-0">
                                <Building2 className="w-6 h-6 text-violet-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-2xl font-normal text-gray-900 font-display tracking-tight">{studio?.name}</h3>
                                <p className="text-muted-foreground text-sm mt-0.5">{studio?.email || studio?.city || studio?.slug}</p>
                              </div>
                              <div className="hidden sm:flex items-center gap-3">
                                {[
                                  { label: 'Membros', value: studio?.stats?.members ?? 0 },
                                  { label: 'Produções', value: studio?.stats?.productions ?? 0 },
                                  { label: 'Takes', value: studio?.stats?.takes ?? 0 },
                                ].map(stat => (
                                  <div key={stat.label} className="text-center px-4 py-2 rounded-xl bg-gray-50 border border-gray-100">
                                    <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.label}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Sub-tabs */}
                            <div className="glass-panel rounded-3xl border-gray-100 overflow-hidden">
                              <div className="flex gap-1 px-5 pt-4 border-b border-gray-100 overflow-x-auto">
                                {[
                                  { id: 'geral', label: 'Geral', icon: Settings },
                                  { id: 'membros', label: `Membros (${studioMembers.length})`, icon: Users },
                                  { id: 'dubladores', label: `Dubladores (${dubladores.length})`, icon: Radio },
                                  { id: 'limites', label: 'Limites', icon: Database },
                                  { id: 'atividade', label: 'Atividade', icon: BarChart2 },
                                ].map(t => (
                                  <button
                                    key={t.id}
                                    onClick={() => setStudioSubTab(t.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${studioSubTab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                  >
                                    <t.icon className="w-4 h-4" /> {t.label}
                                  </button>
                                ))}
                              </div>

                              <div className="p-6 space-y-5">

                                {/* GERAL */}
                                {studioSubTab === 'geral' && (
                                  <div className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nome do Estúdio</label>
                                        <input
                                          type="text"
                                          value={studioEditDraft.name || ''}
                                          onChange={e => setStudioEditDraft((p: any) => ({ ...p, name: e.target.value }))}
                                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Descrição</label>
                                        <input
                                          type="text"
                                          value={studioEditDraft.description || ''}
                                          onChange={e => setStudioEditDraft((p: any) => ({ ...p, description: e.target.value }))}
                                          placeholder="Descrição opcional"
                                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all"
                                        />
                                      </div>
                                    </div>
                                    <Button onClick={handleSaveStudio} disabled={isLoading} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl">
                                      {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                                    </Button>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
                                      {[
                                        { label: 'Membros', value: studio?.stats?.members ?? 0 },
                                        { label: 'Pendentes', value: studio?.stats?.pendingMembers ?? 0 },
                                        { label: 'Produções', value: studio?.stats?.productions ?? 0 },
                                        { label: 'Sessões', value: studio?.stats?.sessions ?? 0 },
                                      ].map(s => (
                                        <div key={s.label} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                                          <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                                          <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Danger zone */}
                                    <div className="pt-4 border-t border-red-100">
                                      <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">Zona Perigosa</p>
                                      <button
                                        onClick={() => {
                                          const newActive = studioEditDraft.isActive === false;
                                          setConfirmModal({
                                            isOpen: true,
                                            title: newActive ? 'Ativar estúdio?' : 'Desativar estúdio?',
                                            desc: newActive
                                              ? 'O estúdio ficará visível e acessível para seus membros.'
                                              : 'O estúdio ficará bloqueado para todos os membros.',
                                            action: () => {
                                              handleToggleStudioActive(selectedStudioId!, newActive);
                                              setConfirmModal(null);
                                            },
                                          });
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${studioEditDraft.isActive !== false ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100' : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'}`}
                                      >
                                        <Power className="w-4 h-4" />
                                        {studioEditDraft.isActive !== false ? 'Desativar Estúdio' : 'Reativar Estúdio'}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* MEMBROS */}
                                {studioSubTab === 'membros' && (
                                  <div className="space-y-3">
                                    {studioMembers.length === 0 ? (
                                      <div className="flex flex-col items-center py-10 text-center">
                                        <Users className="w-8 h-8 text-gray-600 mb-2" />
                                        <p className="text-gray-400 text-sm">Nenhum membro encontrado.</p>
                                      </div>
                                    ) : studioMembers.map((m: any) => (
                                      <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <div className="w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center text-gray-700 text-sm font-bold shrink-0 uppercase">
                                          {(m.user?.fullName || m.user?.displayName || m.user?.email || '?')[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm text-gray-900 truncate">{m.user?.fullName || m.user?.displayName || '—'}</p>
                                          <p className="text-xs text-gray-400 truncate">{m.user?.email || '—'}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <select
                                            value={(m.studioRoles?.[0] || m.role) ?? 'dublador'}
                                            onChange={e => handleUpdateMemberRole(selectedStudioId!, m.id, [e.target.value])}
                                            className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold appearance-none focus:outline-none text-gray-700"
                                          >
                                            <option value="studio_admin">Admin</option>
                                            <option value="diretor">Diretor</option>
                                            <option value="dublador">Dublador</option>
                                          </select>
                                          <button
                                            onClick={() => handleRemoveStudioMember(selectedStudioId!, m.id)}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-50 transition-colors"
                                            title="Remover membro"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* DUBLADORES */}
                                {studioSubTab === 'dubladores' && (
                                  <div className="space-y-3">
                                    {dubladores.length === 0 ? (
                                      <div className="flex flex-col items-center py-10 text-center">
                                        <Radio className="w-8 h-8 text-gray-600 mb-2" />
                                        <p className="text-gray-400 text-sm">Nenhum dublador neste estúdio.</p>
                                      </div>
                                    ) : dubladores.map((m: any) => {
                                      const secretariaStudent = draft.students?.find((s: any) => s.id === m.userId);
                                      return (
                                        <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 text-sm font-bold shrink-0 uppercase">
                                            {(m.user?.fullName || m.user?.displayName || m.user?.email || '?')[0]}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900 truncate">{m.user?.fullName || m.user?.displayName || '—'}</p>
                                            <p className="text-xs text-gray-400 truncate">{m.user?.email || '—'}</p>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">Dublador</span>
                                            {secretariaStudent && (
                                              <button
                                                onClick={() => {
                                                  handleLoadStudentPortalData(m.userId);
                                                  handleLoadAgendaAndSupport(m.userId);
                                                  setActiveTab('students');
                                                  setSelectedStudentId(m.userId);
                                                }}
                                                className="text-xs text-gray-500 hover:text-gray-900 underline transition-colors"
                                              >
                                                Ver perfil
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* LIMITES */}
                                {/* ATIVIDADE */}
                                {studioSubTab === 'atividade' && (
                                  <div className="space-y-6">
                                    <div>
                                      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Produções Recentes</h4>
                                      {studioActivity.productions.length === 0 ? (
                                        <p className="text-sm text-gray-400 italic">Nenhuma produção ainda.</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {studioActivity.productions.slice(0, 8).map((p: any) => (
                                            <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                                              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                                                <Film className="w-4 h-4 text-violet-600" />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                                                <p className="text-xs text-gray-500">{p.status ?? 'Em andamento'}</p>
                                              </div>
                                              <p className="text-[10px] text-gray-400 shrink-0">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : ''}</p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Sessões de Gravação</h4>
                                      {studioActivity.sessions.length === 0 ? (
                                        <p className="text-sm text-gray-400 italic">Nenhuma sessão ainda.</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {studioActivity.sessions.slice(0, 8).map((s: any) => (
                                            <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                                              <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
                                                <Clapperboard className="w-4 h-4 text-cyan-600" />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{s.name ?? `Sessão #${s.id?.slice(0,6)}`}</p>
                                                <p className="text-xs text-gray-500">{s.status ?? 'Concluída'}</p>
                                              </div>
                                              <p className="text-[10px] text-gray-400 shrink-0">{s.createdAt ? new Date(s.createdAt).toLocaleDateString('pt-BR') : ''}</p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {studioSubTab === 'limites' && (() => {
                                  const stats = studio?.stats ?? {};
                                  const limitFields = [
                                    { key: 'maxMembers', label: 'Máx. de Membros', statKey: 'members' },
                                    { key: 'maxProductions', label: 'Máx. de Produções', statKey: 'productions' },
                                    { key: 'maxSessions', label: 'Máx. de Sessões', statKey: 'sessions' },
                                  ] as const;
                                  return (
                                    <div className="space-y-5">
                                      <p className="text-sm text-gray-400">Defina limites para este estúdio. Deixe em branco para ilimitado.</p>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {limitFields.map(({ key, label, statKey }) => {
                                          const current: number = stats[statKey] ?? 0;
                                          const limit: number | null = studioEditDraft[key] ?? null;
                                          const over = limit !== null && current > limit;
                                          return (
                                            <div key={key}>
                                              <div className="flex items-center justify-between mb-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
                                                <span className={`text-xs font-medium ${over ? 'text-red-500' : 'text-gray-400'}`}>
                                                  Atual: {current}{over && ` ⚠ acima do limite`}
                                                </span>
                                              </div>
                                              <input
                                                type="number"
                                                value={studioEditDraft[key] ?? ''}
                                                onChange={e => setStudioEditDraft((p: any) => ({ ...p, [key]: e.target.value ? Number(e.target.value) : null }))}
                                                placeholder="Ilimitado"
                                                min={1}
                                                className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-gray-400 transition-all ${over ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                              />
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <Button onClick={handleSaveStudio} disabled={isLoading} className="bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl">
                                        {isLoading ? 'Salvando...' : 'Salvar Limites'}
                                      </Button>
                                    </div>
                                  );
                                })()}

                              </div>
                            </div>
                          </motion.div>
                        );
                      })()
                    ) : (
                      /* STUDIOS LIST */
                      <motion.div
                        key="studios-list"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="space-y-6"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-3xl font-normal text-gray-900 font-display tracking-tight">Estúdios</h3>
                            <p className="text-muted-foreground mt-1">Administre todos os estúdios da plataforma.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              <input
                                type="text"
                                value={studioSearch}
                                onChange={e => setStudioSearch(e.target.value)}
                                placeholder="Buscar estúdio..."
                                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:border-gray-400 transition-all w-52"
                              />
                            </div>
                            <button
                              onClick={loadAdminStudios}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors shrink-0"
                            >
                              Atualizar
                            </button>
                          </div>
                        </div>

                        {adminStudios.length === 0 ? (
                          <div className="glass-panel p-12 rounded-3xl border-gray-100 flex flex-col items-center justify-center text-center">
                            <Building2 className="w-12 h-12 text-gray-600 mb-4" />
                            <p className="text-gray-400 font-medium">Nenhum estúdio encontrado.</p>
                            <p className="text-gray-600 text-sm mt-1">Estúdios criados na plataforma aparecerão aqui.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {adminStudios
                              .filter((s: any) => {
                                const q = studioSearch.toLowerCase();
                                return !q || s.name?.toLowerCase().includes(q) || s.slug?.toLowerCase().includes(q);
                              })
                              .map((studio: any) => {
                                const limits = studio.limits ?? {};
                                const stats = studio.stats ?? {};
                                const limitBars = [
                                  { key: 'members', label: 'Membros', max: limits.maxMembers },
                                  { key: 'productions', label: 'Prod.', max: limits.maxProductions },
                                  { key: 'sessions', label: 'Sessões', max: limits.maxSessions },
                                ].filter(b => b.max != null);
                                const nearLimit = limitBars.some(b => {
                                  const pct = (stats[b.key] ?? 0) / (b.max as number);
                                  return pct >= 0.8;
                                });
                                return (
                                  <button
                                    key={studio.id}
                                    onClick={() => handleSelectStudio(studio.id)}
                                    className="glass-panel p-5 rounded-3xl border-gray-100 hover:border-gray-200 transition-all group text-left flex flex-col gap-3"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center shrink-0">
                                        <Building2 className="w-5 h-5 text-violet-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="text-gray-900 font-medium truncate">{studio.name}</p>
                                          {nearLimit && (
                                            <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">80%</span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{studio.slug}</p>
                                      </div>
                                    </div>

                                    {limitBars.length > 0 && (
                                      <div className="space-y-1.5">
                                        {limitBars.map(bar => {
                                          const current = stats[bar.key] ?? 0;
                                          const pct = Math.min(Math.round((current / (bar.max as number)) * 100), 100);
                                          const color = pct >= 100 ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400';
                                          return (
                                            <div key={bar.key}>
                                              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                                                <span>{bar.label}</span>
                                                <span>{current}/{bar.max}</span>
                                              </div>
                                              <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between mt-auto pt-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${studio.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                          {studio.isActive !== false ? 'Ativo' : 'Inativo'}
                                        </span>
                                        {limitBars.length === 0 && (
                                          <span className="text-xs text-gray-500">{stats.members ?? 0} membros · {stats.productions ?? 0} prod.</span>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-500 group-hover:text-gray-700 flex items-center gap-1 transition-colors">
                                        Gerenciar <ChevronRight className="w-3 h-3" />
                                      </span>
                                    </div>
                                  </button>
                                );
                              })
                            }
                          </div>
                        )}

                        {/* Platform Roles — Diretores & Studio Admins */}
                        {(diretores.length > 0 || directors.length > 0) && (
                          <div className="space-y-3">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Papéis da Plataforma</p>

                            {/* Diretores */}
                            <div className="glass-panel rounded-3xl border border-emerald-200/60 bg-emerald-50/40 overflow-hidden">
                              <div className="w-full flex items-center justify-between px-6 py-4">
                                <button onClick={() => setShowDiretores(v => !v)} className="flex items-center gap-3 flex-1 text-left">
                                  <UserCheck className="w-4 h-4 text-emerald-600" />
                                  <span className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Diretores</span>
                                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-800">{diretores.length}</span>
                                </button>
                                <button
                                  onClick={() => { setShowAddDiretor(true); setDiretorSearch(''); setDiretorSearchResults([]); setDiretorCandidate(null); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                >
                                  <Plus className="w-3 h-3" /> Adicionar
                                </button>
                              </div>
                              {showDiretores && (
                                <div className="px-6 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-emerald-200/60 pt-4">
                                  {diretores.length === 0 ? (
                                    <p className="text-sm text-emerald-700 col-span-3">Nenhum diretor cadastrado.</p>
                                  ) : diretores.map((d: any) => (
                                    <div key={d.id} className="bg-white/60 border border-emerald-200/40 rounded-2xl p-4 flex flex-col gap-2">
                                      <p className="text-sm text-gray-900 truncate font-medium">{d.fullName ?? d.displayName ?? d.email}</p>
                                      <p className="text-xs text-gray-500 truncate">{d.email}</p>
                                      <div className="flex items-center justify-between mt-1">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">Diretor</span>
                                        <button
                                          onClick={async () => {
                                            if (!window.confirm(`Remover ${d.fullName ?? d.email} como Diretor?`)) return;
                                            try {
                                              await firebaseService.changeUserRole(d.id, 'dublador');
                                              toast.success('Diretor rebaixado para Dublador.');
                                              const updated = await firebaseService.getDiretores();
                                              setDiretores((updated as any[]) || []);
                                            } catch { toast.error('Erro ao remover diretor.'); }
                                          }}
                                          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                                        >
                                          Remover
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Studio Admins */}
                            {directors.length > 0 && (
                              <div className="glass-panel rounded-3xl border border-amber-200/60 bg-amber-50/40 overflow-hidden">
                                <button
                                  onClick={() => setShowDirectors(v => !v)}
                                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                                >
                                  <div className="flex items-center gap-3">
                                    <Shield className="w-4 h-4 text-amber-600" />
                                    <span className="text-sm font-bold text-amber-800 uppercase tracking-wider">Administradores de Estúdio</span>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-800">{directors.length}</span>
                                  </div>
                                  <ChevronRight className={`w-4 h-4 text-amber-600 transition-transform ${showDirectors ? 'rotate-90' : ''}`} />
                                </button>
                                {showDirectors && (
                                  <div className="px-6 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-amber-200/60 pt-4">
                                    {directors.map((d: any) => (
                                      <div key={d.id} className="bg-white/60 border border-amber-200/40 rounded-2xl p-4 flex flex-col gap-2">
                                        <p className="text-sm text-gray-900 truncate font-medium">{d.fullName ?? d.displayName ?? d.email}</p>
                                        <p className="text-xs text-gray-500 truncate">{d.email}</p>
                                        <div className="flex items-center justify-between mt-1">
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">{getRoleLabel(d.role)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Add Diretor Modal */}
                        {showAddDiretor && createPortal(
                          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4">
                              <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-900">Adicionar Diretor</h3>
                                <button onClick={() => setShowAddDiretor(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
                              </div>
                              <div className="relative mb-4">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Buscar por email..."
                                  value={diretorSearch}
                                  onChange={async e => {
                                    const v = e.target.value;
                                    setDiretorSearch(v);
                                    setDiretorCandidate(null);
                                    if (v.length >= 2) {
                                      const res = await firebaseService.searchUsers(v);
                                      setDiretorSearchResults((res as any[]) || []);
                                    } else {
                                      setDiretorSearchResults([]);
                                    }
                                  }}
                                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                                  autoFocus
                                />
                              </div>
                              {diretorSearchResults.length > 0 && !diretorCandidate && (
                                <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
                                  {diretorSearchResults.map((u: any) => (
                                    <button
                                      key={u.id}
                                      onClick={() => setDiretorCandidate(u)}
                                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                                        {(u.fullName ?? u.displayName ?? u.email ?? '?')[0].toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{u.fullName ?? u.displayName ?? u.email}</p>
                                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                      </div>
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{getRoleLabel(u.role)}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                              {diretorCandidate && (
                                <div className="border border-emerald-200 rounded-xl p-4 mb-4 bg-emerald-50">
                                  <p className="text-sm font-bold text-gray-900">{diretorCandidate.fullName ?? diretorCandidate.displayName ?? diretorCandidate.email}</p>
                                  <p className="text-xs text-gray-500 mb-2">{diretorCandidate.email}</p>
                                  <p className="text-xs text-emerald-700">Papel atual: <strong>{getRoleLabel(diretorCandidate.role)}</strong> → será promovido a <strong>Diretor</strong></p>
                                </div>
                              )}
                              <div className="flex gap-3">
                                <Button variant="outline" className="flex-1 rounded-xl border-gray-200" onClick={() => setShowAddDiretor(false)}>Cancelar</Button>
                                <Button
                                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                                  disabled={!diretorCandidate || isPromoting}
                                  onClick={async () => {
                                    if (!diretorCandidate) return;
                                    setIsPromoting(true);
                                    try {
                                      await firebaseService.changeUserRole(diretorCandidate.id, 'diretor');
                                      toast.success(`${diretorCandidate.fullName ?? diretorCandidate.email} agora é Diretor!`);
                                      setShowAddDiretor(false);
                                      const updated = await firebaseService.getDiretores();
                                      setDiretores((updated as any[]) || []);
                                    } catch { toast.error('Erro ao promover diretor.'); }
                                    finally { setIsPromoting(false); }
                                  }}
                                >
                                  {isPromoting ? 'Promovendo...' : 'Confirmar como Diretor'}
                                </Button>
                              </div>
                            </div>
                          </div>,
                          document.body
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
