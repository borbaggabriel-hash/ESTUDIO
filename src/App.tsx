import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight, Star, Mic,
  Headphones, Award, ArrowRight,
  MessageSquare, ChevronDown, X, BookOpen, Menu, Instagram, Youtube
} from 'lucide-react';
import { initialSiteData } from './data';
import { Login, Secretaria } from './portal';
import { firebaseService } from './services/supabaseService';

const AdminPanel = React.lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const StudentDashboard = React.lazy(() => import('./portal/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const Enrollment = React.lazy(() => import('./components/Enrollment').then(m => ({ default: m.Enrollment })));


const HoverPill = ({ label }: { label: string; key?: React.Key }) => (
  <span className="border-2 border-gray-200 text-gray-600 font-medium px-5 py-2.5 text-sm rounded-full select-none">
    {label}
  </span>
);

const iconMap: Record<string, React.ElementType> = { Mic, Headphones, Star, BookOpen, Award };

const gradientBorders: Record<string, string> = {
  'bg-gradient-card-1': 'border-blue-400/40',
  'bg-gradient-card-2': 'border-pink-400/40',
  'bg-gradient-card-3': 'border-violet-400/40',
};

const ModuleCard = ({ mod, index, Icon, grad }: any) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const backBorder = gradientBorders[grad] ?? 'border-gray-200';
  const ResolvedIcon = iconMap[mod.icon] ?? Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="perspective-1000 cursor-pointer w-full"
      style={{ height: 330 }}
      onClick={() => setIsFlipped(f => !f)}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.55, type: 'spring', stiffness: 260, damping: 22 }}
        className="relative w-full h-full preserve-3d"
      >
        {/* Front */}
        <div className={`absolute inset-0 backface-hidden ${grad} rounded-3xl p-8 text-white overflow-hidden flex flex-col`}>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
            <ResolvedIcon className="w-6 h-6 text-white" />
          </div>
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2 font-poppins">Módulo {index + 1}</p>
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-[32px] font-black font-poppins leading-tight text-pretty">{mod.title?.split('—')[1]?.trim() || mod.title}</h3>
            {mod.duration && <p className="text-2xl font-bold font-poppins text-white/70 shrink-0">{mod.duration}</p>}
          </div>
          <p className="text-white/50 text-sm mt-auto">Clique para saber mais</p>
          <div className="absolute bottom-6 right-6 text-white/10 font-black text-8xl font-poppins select-none">{index + 1}</div>
        </div>
        {/* Back */}
        <div
          className={`absolute inset-0 backface-hidden rounded-3xl bg-white border ${backBorder} shadow-md p-8 flex flex-col overflow-hidden`}
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div className="flex-1 flex items-center">
            <p className="text-gray-600 text-base leading-relaxed">{mod.desc}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const TeacherCard = ({ teacher, index }: any) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.1 }}
      className="perspective-1000 cursor-pointer w-full"
      style={{ height: 400 }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.55, type: 'spring', stiffness: 260, damping: 22 }}
        className="relative w-full h-full preserve-3d"
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden rounded-3xl bg-white border border-gray-100 shadow-sm flex flex-col items-center p-6 pt-8 text-center">
          <div className="w-60 h-60 rounded-full overflow-hidden shrink-0">
            <img src={teacher.photo || undefined} alt={teacher.name} className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <h3 className="text-xl font-black text-gray-900 font-poppins leading-tight">{teacher.name}</h3>
            <p className="text-base text-gray-900 font-normal mt-1 font-poppins">{teacher.role}</p>
            <p className="text-sm text-gray-400 mt-2">Clique para ver bio</p>
          </div>
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 backface-hidden rounded-3xl bg-white border border-[#6d28d9]/20 shadow-md p-8 flex flex-col justify-center items-center text-center"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div className="w-16 h-16 rounded-full bg-[#6d28d9]/10 flex items-center justify-center mb-5">
            <MessageSquare className="w-8 h-8 text-[#6d28d9]" />
          </div>
          <h3 className="text-xl font-black text-gray-900 font-poppins mb-4">{teacher.name}</h3>
          <p className="text-gray-500 leading-relaxed italic text-base">"{teacher.bio}"</p>
          <div className="mt-6 pt-6 border-t border-gray-100 w-full">
            <p className="text-sm font-bold text-[#6d28d9] uppercase tracking-widest font-poppins">Clique para voltar</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const PromoBanner = ({ settings, dismissed, onDismiss, onEnroll }: {
  settings: any;
  dismissed: boolean;
  onDismiss: () => void;
  onEnroll: () => void;
}) => {
  const promo = settings?.promoBanner;
  const [segments, setSegments] = useState<{ days: string; hh: string; mm: string; ss: string } | null>(null);

  useEffect(() => {
    if (!promo?.expiresAt) { setSegments(null); return; }
    const tick = () => {
      const diff = new Date(promo.expiresAt).getTime() - Date.now();
      if (diff <= 0) { setSegments(null); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setSegments({
        days: d > 0 ? `${d}d ` : '',
        hh: String(h).padStart(2,'0'),
        mm: String(m).padStart(2,'0'),
        ss: String(s).padStart(2,'0'),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [promo?.expiresAt]);

  if (!promo?.enabled || dismissed) return null;

  const bgStyle = promo.bgStyle || 'linear-gradient(90deg, #1a1060 0%, #2d1b8e 40%, #1a1060 100%)';

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'spring' as const, stiffness: 280, damping: 22, delay },
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] overflow-visible"
        style={{ background: bgStyle }}
        role="banner"
        aria-label="Oferta especial"
      >
        {/* Background light sweep — Whimsy shimmer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <motion.div
            className="absolute inset-y-0 w-1/3"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)' }}
            animate={{ x: ['-100%', '450%'] }}
            transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
          />
        </div>

        {/* ── MOBILE LAYOUT (< sm) ── */}
        <motion.div
          className="sm:hidden relative w-full px-5 pt-4 pb-5"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          {/* Close — top right */}
          <button onClick={onDismiss} className="absolute right-3 top-3 text-white/50 hover:text-white p-1.5 rounded-full" aria-label="Fechar oferta">
            <X className="w-4 h-4" />
          </button>

          {/* Headline + badge inline */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, type: 'spring', stiffness: 300, damping: 24 }}
            className="text-white font-black text-base text-center leading-snug mb-3 pr-6 drop-shadow-sm"
          >
            {promo.headline}
            {promo.badge && <span className="font-black text-white">{promo.badge}</span>}
          </motion.p>

          {/* Full-width CTA with shimmer */}
          <motion.button
            onClick={() => promo.ctaAction === 'enroll' ? onEnroll() : window.open(promo.ctaAction, '_blank')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, type: 'spring', stiffness: 300, damping: 24 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="relative w-full overflow-hidden bg-white text-[#1a1060] font-black text-sm py-3 rounded-full uppercase tracking-widest shadow-lg"
          >
            <motion.span
              aria-hidden
              className="absolute inset-y-0 w-1/2 pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(109,40,217,0.1) 50%, transparent 100%)' }}
              animate={{ x: ['-120%', '260%'] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut', delay: 1 }}
            />
            <span className="relative z-10">{promo.ctaText || 'Matricule-se'}</span>
          </motion.button>
        </motion.div>

        {/* ── DESKTOP LAYOUT (sm+) ── */}
        <div className="hidden sm:flex w-full h-20 items-center justify-center relative px-12 overflow-visible">
          {/* Animated decorative blobs */}
          <motion.div
            aria-hidden
            className="absolute left-0 top-0 h-full w-48 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at left center, #7c3aed 0%, transparent 70%)' }}
            animate={{ opacity: [0.18, 0.38, 0.18] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute right-0 top-0 h-full w-48 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at right center, #3b82f6 0%, transparent 70%)' }}
            animate={{ opacity: [0.1, 0.28, 0.1] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          />

          {/* Centered group */}
          <div className="flex items-center gap-8">

            {/* Headline */}
            <motion.p {...fadeUp(0.12)} className="text-white font-semibold text-sm md:text-base drop-shadow-sm">
              {promo.headline}
            </motion.p>

            {/* Badge — floating circle */}
            <motion.div
              initial={{ scale: 0.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 18, delay: 0.05 }}
              className="shrink-0 -mt-8 relative z-10"
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: bgStyle, filter: 'blur(6px)' }}
                animate={{ opacity: [0.4, 0.85, 0.4], scale: [1, 1.1, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
              />
              <motion.div
                className="relative rounded-full p-[3px] shadow-2xl"
                style={{ background: bgStyle }}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="flex flex-col items-center justify-center bg-white rounded-full w-28 h-28 leading-none select-none">
                  <span className="text-[#1a1060] font-black text-4xl leading-none">{promo.badge}</span>
                  {promo.badgeSubtext && (
                    <span className="text-[#1a1060] font-bold text-xs uppercase tracking-widest leading-none mt-2">{promo.badgeSubtext}</span>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* Countdown */}
            {segments && (
              <motion.div {...fadeUp(0.25)} className="flex items-center shrink-0 font-mono font-black text-base md:text-lg tabular-nums" aria-live="off">
                {segments.days && <span className="text-white/80 mr-1">{segments.days}</span>}
                {segments.hh.split('').map((ch, i) => (
                  <motion.span key={`h${i}-${ch}`} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.15, type: 'spring', stiffness: 500 }}
                    className="text-white">{ch}</motion.span>
                ))}
                <motion.span className="text-white/50 mx-0.5" animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}>:</motion.span>
                {segments.mm.split('').map((ch, i) => (
                  <motion.span key={`m${i}-${ch}`} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.15, type: 'spring', stiffness: 500 }}
                    className="text-white">{ch}</motion.span>
                ))}
                <motion.span className="text-white/50 mx-0.5" animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}>:</motion.span>
                {segments.ss.split('').map((ch, i) => (
                  <motion.span key={`s${i}-${ch}`} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.18, type: 'spring', stiffness: 600 }}
                    className="text-white">{ch}</motion.span>
                ))}
              </motion.div>
            )}

            {/* CTA */}
            <motion.button
              {...fadeUp(0.35)}
              onClick={() => promo.ctaAction === 'enroll' ? onEnroll() : window.open(promo.ctaAction, '_blank')}
              whileHover={{ scale: 1.07, y: -3 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}
              className="relative shrink-0 overflow-hidden bg-white text-[#1a1060] font-black text-xs md:text-sm px-7 py-3 rounded-full uppercase tracking-wide shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <motion.span
                aria-hidden
                className="absolute inset-y-0 w-1/2 pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)' }}
                animate={{ x: ['-120%', '260%'] }}
                transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
              />
              <span className="relative z-10">{promo.ctaText || 'Matricule-se'}</span>
            </motion.button>
          </div>

          {/* Close */}
          <motion.button
            onClick={onDismiss}
            whileHover={{ rotate: 90, scale: 1.25 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 380, damping: 16 }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Fechar oferta"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const mergeSiteData = (previous: any, next: any) => ({
  ...previous,
  ...next,
  settings: next.settings ? { ...previous.settings, ...next.settings } : previous.settings
});

function App() {
  const [siteData, setSiteData] = useState(initialSiteData);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isStudentDashboardOpen, setIsStudentDashboardOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [isSecretariaOpen, setIsSecretariaOpen] = useState(false);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);
  const [selectedModuleForEnrollment, setSelectedModuleForEnrollment] = useState<string | undefined>(undefined);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showAllTeachers, setShowAllTeachers] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(
    () => sessionStorage.getItem('promoBannerDismissed') === '1'
  );

  useEffect(() => {
    let isMounted = true;
    let unsubscribeSiteData: (() => void) | undefined;

    const refreshSiteData = async () => {
      try {
        const refreshedData = await firebaseService.getSiteData();
        if (isMounted && refreshedData) {
          setSiteData(prev => mergeSiteData(prev, refreshedData));
        }
      } catch (error) {
        console.error('Failed to refresh site data from Firebase:', error);
      }
    };

    const loadData = async () => {
      try {
        const [data, user] = await Promise.all([
          firebaseService.getSiteData(),
          firebaseService.getCurrentUser()
        ]);

        if (!isMounted) return;

        if (data) {
          setSiteData(prev => mergeSiteData(prev, data));
        }

        unsubscribeSiteData = firebaseService.subscribeToSiteData(() => {
          void refreshSiteData();
        });

        if (user) {
          setCurrentUser(user);
          try {
            await loadStudentData(user.id);
          } catch (studentError) {
            console.error('Failed to load student data:', studentError);
          }
        }
      } catch (error) {
        console.error('Failed to load data from Supabase:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      unsubscribeSiteData?.();
    };
  }, []);

  const loadStudentData = async (userId: string) => {
    try {
      const [profile, enrollments, activity] = await Promise.all([
        firebaseService.getStudentProfile(userId),
        firebaseService.getStudentEnrollments(userId),
        firebaseService.getStudentActivity(userId)
      ]);

      setStudentData({
        uid: userId,
        profile,
        enrollments,
        activity
      });
    } catch (error) {
      console.error('Failed to load student data:', error);
    }
  };

  const handleSaveAdmin = (newData: any) => {
    setSiteData(newData);
  };

  const handleLoginSuccess = async (user: any) => {
    setCurrentUser(user);
    setIsLoginOpen(false);
    setIsLoading(true);
    await loadStudentData(user.id ?? user.uid);
    setIsLoading(false);
    setIsStudentDashboardOpen(true);
  };

  const handleLogout = async () => {
    await firebaseService.signOut();
    setCurrentUser(null);
    setStudentData(null);
    setIsStudentDashboardOpen(false);
  };

  const handleEnroll = (moduleTitle?: string) => {
    setSelectedModuleForEnrollment(moduleTitle);
    setIsEnrollmentOpen(true);
  };

  const handleNewEnrollment = async (enrollment: any) => {
    try {
      const newEnrollment = await firebaseService.createEnrollment({
        name: enrollment.name,
        email: enrollment.email,
        phone: enrollment.phone,
        module: enrollment.module,
        status: 'Pendente'
      });
      
      setSiteData(prev => ({
        ...prev,
        enrollments: [newEnrollment, ...(prev.enrollments || [])]
      }));
    } catch (error) {
      console.error('Failed to create enrollment in Firebase:', error);
      // Fallback to local state if Firebase fails
      const fallbackEnrollment = {
        ...enrollment,
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        status: 'Pendente'
      };
      setSiteData(prev => ({
        ...prev,
        enrollments: [fallbackEnrollment, ...(prev.enrollments || [])]
      }));
    }
  };

  if (isLoading) {
    return (
      <div style={{minHeight:'100vh',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <div style={{width:48,height:48,border:'4px solid #6d28d9',borderTopColor:'transparent',borderRadius:'50%',margin:'0 auto 16px',animation:'spin 1s linear infinite'}} />
          <p style={{color:'#6d28d9',fontWeight:'bold',fontSize:12,letterSpacing:2}}>CARREGANDO THE HUB...</p>
        </div>
      </div>
    );
  }

  const suspenseFallback = (
    <div style={{minHeight:'100vh',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:48,height:48,border:'4px solid #6d28d9',borderTopColor:'transparent',borderRadius:'50%',margin:'0 auto 16px',animation:'spin 1s linear infinite'}} />
        <p style={{color:'#6d28d9',fontWeight:'bold',fontSize:12,letterSpacing:2}}>CARREGANDO...</p>
      </div>
    </div>
  );

  if (isAdminOpen) {
    return <Suspense fallback={suspenseFallback}><AdminPanel data={siteData} onSave={handleSaveAdmin} onClose={() => setIsAdminOpen(false)} /></Suspense>;
  }

  if (isSecretariaOpen) {
    return (
      <Secretaria
        onStudentLogin={() => { setIsSecretariaOpen(false); setIsLoginOpen(true); }}
        onAdminLogin={() => { setIsSecretariaOpen(false); setIsAdminOpen(true); }}
        onBack={() => setIsSecretariaOpen(false)}
      />
    );
  }

  if (isLoginOpen) {
    return <Login onLogin={handleLoginSuccess} onBack={() => setIsLoginOpen(false)} />;
  }

  if (isStudentDashboardOpen) {
    return (
      <Suspense fallback={suspenseFallback}>
        <StudentDashboard 
          onLogout={handleLogout} 
          onHome={() => setIsStudentDashboardOpen(false)} 
          data={siteData} 
          studentData={studentData}
          onRefreshProfile={() => currentUser && loadStudentData(currentUser.id ?? currentUser.uid)}
        />
      </Suspense>
    );
  }

  const faqs = (siteData.faqs?.length ?? 0) > 0 ? siteData.faqs : initialSiteData.faqs;
  const moduleGradients = ['bg-gradient-card-1', 'bg-gradient-card-2', 'bg-gradient-card-3'];
  const moduleIcons = [Mic, Headphones, Award];
  const TEACHER_ORDER = ['Vitor', 'Daniel', 'Ettore'];
  const sortedTeachers = [...siteData.teachers].sort((a: any, b: any) => {
    const ai = TEACHER_ORDER.findIndex(n => a.name?.includes(n));
    const bi = TEACHER_ORDER.findIndex(n => b.name?.includes(n));
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  const visibleTeachers = showAllTeachers ? sortedTeachers : sortedTeachers.slice(0, 4);
  // Deduplicate modules by id AND title to prevent React key warnings
  const uniqueModules: any[] = [];
  const seenModuleIds = new Set<string>();
  const seenModuleTitles = new Set<string>();
  for (const mod of siteData.modules) {
    const idKey = String(mod.id ?? '');
    const titleKey = String(mod.title ?? '');
    if ((idKey && seenModuleIds.has(idKey)) || (titleKey && seenModuleTitles.has(titleKey))) continue;
    if (idKey) seenModuleIds.add(idKey);
    if (titleKey) seenModuleTitles.add(titleKey);
    uniqueModules.push(mod);
  }

  return (
    <div className="min-h-screen bg-white font-rubik">

      {/* ── HEADER ── */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-[68px] flex items-center justify-between">
          <span className="font-black text-xl tracking-tight font-poppins text-gray-900">THE HUB</span>
          <nav className="hidden md:flex items-center gap-8">
            {[['#curso','O Curso'],['#modulos','Módulos'],['#professores','Professores'],['#depoimentos','Depoimentos']].map(([href,label])=>(
              <a key={href} href={href} className="text-sm font-medium text-gray-500 hover:text-[#6d28d9] transition-colors">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsLoginOpen(true)} className="hidden md:block text-sm font-medium text-gray-500 hover:text-[#6d28d9] transition-colors">Área do Aluno</button>
            <button onClick={() => handleEnroll()} className="hidden md:block bg-[#6d28d9] text-white font-bold rounded-full px-5 py-2.5 text-sm hover:bg-[#5b21b6] transition-all shadow-[0_4px_14px_rgba(109,40,217,0.3)]">Matricule-se</button>
            <button onClick={() => setIsMobileMenuOpen(v => !v)} className="md:hidden p-2 text-gray-700 hover:text-[#6d28d9] transition-colors" aria-label="Menu">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden bg-white border-t border-gray-100"
            >
              <nav className="flex flex-col px-6 py-4 gap-1">
                {[['#curso','O Curso'],['#modulos','Módulos'],['#professores','Professores'],['#depoimentos','Depoimentos']].map(([href,label])=>(
                  <a key={href} href={href} onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#6d28d9] transition-colors py-3 border-b border-gray-50">{label}</a>
                ))}
                <button onClick={() => { setIsMobileMenuOpen(false); setIsLoginOpen(true); }} className="text-sm font-medium text-gray-600 hover:text-[#6d28d9] transition-colors py-3 border-b border-gray-50 text-left">Área do Aluno</button>
                <button onClick={() => { setIsMobileMenuOpen(false); handleEnroll(); }} className="mt-2 bg-[#6d28d9] text-white font-bold rounded-full px-5 py-3 text-sm hover:bg-[#5b21b6] transition-all text-center">Matricule-se</button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>

        {/* ── HERO ── */}
        <section id="curso" className="pt-[68px] bg-hero-pattern">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20">
            <div className="max-w-3xl">
              <motion.h1 initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6}}
                className="text-[44px] sm:text-5xl md:text-7xl font-black leading-[1.06] mb-6 font-poppins tracking-tight text-gray-900">
                Domine a<br/><span className="text-gradient-brand">Dublagem Profissional</span><br/>do zero ao mercado.
              </motion.h1>
              <motion.p initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.2}}
                className="text-base md:text-xl text-gray-500 mb-8 w-full sm:max-w-xl leading-relaxed">
                Formação completa de 18 meses com professores que atuam nos maiores estúdios do Brasil.
              </motion.p>
              <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.3}}
                className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => handleEnroll()}
                  className="bg-[#6d28d9] text-white font-bold text-base px-8 py-4 rounded-full hover:bg-[#5b21b6] transition-all shadow-[0_8px_30px_rgba(109,40,217,0.35)] flex items-center justify-center gap-2 group">
                  Comece sua jornada <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
                </button>
                <button onClick={() => document.getElementById('modulos')?.scrollIntoView({behavior:'smooth'})}
                  className="border-2 border-gray-200 text-gray-700 font-bold text-base px-8 py-4 rounded-full hover:border-[#6d28d9] hover:text-[#6d28d9] transition-all">
                  Ver módulos
                </button>
              </motion.div>
            </div>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.5,delay:0.4}} className="hidden md:flex flex-wrap gap-4 w-full mt-10">
              {[
                ...uniqueModules.map((mod:any) => mod.title?.split('—')[0]?.trim() || mod.title),
                ...uniqueModules.flatMap((mod:any) => mod.details?.lessons?.slice(0, 5) ?? []),
              ].map((label, i) => (
                <HoverPill
                  key={`pill-${i}`}
                  label={label}
                />
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── LOGOS BAR ── */}
        <section className="py-5 border-y border-gray-100 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
            <p className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 font-poppins">Nossos alunos estão nos maiores estúdios</p>
            <div className="flex gap-6 md:gap-16 items-center justify-start md:justify-center overflow-x-auto scrollbar-none pb-1">
              {['NETFLIX','PRIME VIDEO','DISNEY+','HBO MAX','CRUNCHYROLL'].map(s=>(
                <span key={s} className="text-sm md:text-2xl font-black tracking-tight text-gray-300 font-poppins whitespace-nowrap shrink-0">{s}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── MODULES ── */}
        <section id="modulos" className="py-12 md:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="mb-14 text-center max-w-2xl mx-auto">
              <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] font-poppins mb-3">Metodologia</p>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 font-poppins leading-tight">Seja um profissional da voz</h2>
              <p className="text-gray-500 mt-4 text-base md:text-lg">Três módulos progressivos de 6 meses cada, construídos para levar você do primeiro microfone ao mercado profissional.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {uniqueModules.map((mod: any, i: number) => (
                <ModuleCard
                  key={i}
                  mod={mod}
                  index={i}
                  Icon={moduleIcons[i] ?? Mic}
                  grad={moduleGradients[i] ?? 'bg-gradient-card-1'}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="py-10 md:py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {(() => {
                const totalMonths = uniqueModules.reduce((acc: number, m: any) => {
                  const n = parseInt(m.duration, 10);
                  return acc + (Number.isFinite(n) ? n : 6);
                }, 0);
                const totalLessons = uniqueModules.reduce((acc: number, m: any) => acc + (m.details?.lessons?.length ?? 24), 0);
                return [
                  {value: String(totalMonths), unit:'meses', label:'de formação completa', grad:'bg-gradient-stat-1'},
                  {value: String(totalLessons), unit:'aulas', label:'ao vivo com feedback individual', grad:'bg-gradient-stat-2'},
                  {value: String(uniqueModules.length), unit:'módulos', label:'progressivos do zero ao mercado', grad:'bg-gradient-stat-3'},
                ];
              })().map((stat,i)=>(
                <motion.div key={i} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
                  transition={{duration:0.5,delay:i*0.1}}
                  className={`${stat.grad} rounded-3xl p-8 text-white`}>
                  <p className="text-5xl font-black font-poppins">{stat.value} <span className="text-2xl font-bold opacity-80">{stat.unit}</span></p>
                  <p className="text-white/75 text-sm mt-2 leading-snug">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TEACHERS ── */}
        <section id="professores" className="py-12 md:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] font-poppins mb-3">Professores</p>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 font-poppins leading-tight">Aprenda com Grandes Nomes do mercado</h2>
              <p className="text-gray-500 mt-4 text-base md:text-lg">Profissionais ativos nos maiores estúdios de dublagem do Brasil.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {visibleTeachers.map((teacher:any,i:number)=>(
                <TeacherCard key={teacher.name||i} teacher={teacher} index={i}/>
              ))}
            </div>
            {siteData.teachers.length > 4 && (
              <div className="text-center mt-10">
                <button onClick={()=>setShowAllTeachers(p=>!p)}
                  className="border-2 border-gray-200 text-gray-700 font-bold rounded-full px-8 py-3 text-sm hover:border-[#6d28d9] hover:text-[#6d28d9] transition-all">
                  {showAllTeachers?'Ver menos':'Conhecer toda a equipe'}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section id="depoimentos" className="py-12 md:py-28 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] font-poppins mb-3">Depoimentos</p>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 font-poppins leading-tight">Veja casos reais de nossos Ex-Alunos</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(siteData.testimonials || initialSiteData.testimonials || []).slice(0,6).map((t:any,i:number)=>(
                <motion.div key={i} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
                  transition={{duration:0.45,delay:i*0.08}}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_,j)=><Star key={j} className="w-4 h-4 fill-[#6d28d9] text-[#6d28d9]"/>)}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-5">"{t.text||t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#f3f0ff] flex items-center justify-center shrink-0">
                      {t.avatar
                        ? <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                        : <span className="text-[#6d28d9] font-bold text-sm">{t.name?.[0]}</span>}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.role||t.module}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-12 md:py-28 bg-white">
          <div className="max-w-3xl mx-auto px-4 md:px-8">
            <div className="text-center mb-10 md:mb-14">
              <p className="text-xs font-black uppercase tracking-widest text-[#6d28d9] font-poppins mb-3">Dúvidas</p>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 font-poppins leading-tight">Perguntas frequentes</h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq:any,index:number)=>(
                <div key={index} className={`rounded-2xl border transition-all ${activeFaq===index?'border-[#6d28d9]/30 bg-[#f3f0ff]':'border-gray-100 bg-white hover:border-gray-200'}`}>
                  <button onClick={()=>setActiveFaq(activeFaq===index?null:index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left gap-4">
                    <span className="font-bold text-gray-900 text-sm md:text-base">{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 shrink-0 transition-transform duration-300 ${activeFaq===index?'rotate-180 text-[#6d28d9]':'text-gray-400'}`}/>
                  </button>
                  <AnimatePresence>
                    {activeFaq===index&&(
                      <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
                        transition={{duration:0.25}} className="overflow-hidden">
                        <p className="px-6 pb-5 text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-4 gap-6 md:gap-10 mb-8 md:mb-12">
            <div className="md:col-span-2">
              <span className="font-black text-2xl text-white font-poppins">THE HUB</span>
              <p className="mt-3 text-sm leading-relaxed max-w-xs">A escola de dublagem que forma profissionais para os maiores estúdios do Brasil.</p>
              <div className="flex gap-3 mt-5">
                <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#6d28d9] transition-colors"><Instagram className="w-4 h-4" /></a>
                <a href="#" aria-label="YouTube" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#6d28d9] transition-colors"><Youtube className="w-4 h-4" /></a>
                <a href="#" aria-label="TikTok" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#6d28d9] transition-colors text-xs font-bold">T</a>
              </div>
            </div>
            <div>
              <p className="text-white font-bold text-sm mb-4 font-poppins">Curso</p>
              <ul className="space-y-2 text-sm">
                {[['#curso','O Curso'],['#modulos','Módulos'],['#professores','Professores'],['#depoimentos','Depoimentos']].map(([href,label])=>(
                  <li key={href}><a href={href} className="hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-white font-bold text-sm mb-4 font-poppins">Contato</p>
              <ul className="space-y-2 text-sm">
                <li>contato@thehub.com.br</li>
                <li className="pt-3 flex flex-col gap-2">
                  <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
                  <a href="#" className="hover:text-white transition-colors">Privacidade</a>
                  <button onClick={()=>setIsSecretariaOpen(true)} className="text-left hover:text-white transition-colors">Secretaria</button>
                  <button onClick={()=>setIsAdminOpen(true)} className="text-left hover:text-[#a78bfa] transition-colors">Área Restrita</button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-xs">
            © {new Date().getFullYear()} THE HUB — Escola de Dublagem. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      <Suspense fallback={null}>
        <Enrollment
          isOpen={isEnrollmentOpen}
          onClose={()=>setIsEnrollmentOpen(false)}
          modules={siteData.modules}
          initialModule={selectedModuleForEnrollment}
          onEnroll={handleNewEnrollment}
        />
      </Suspense>

      <PromoBanner
        settings={siteData.settings}
        dismissed={isBannerDismissed}
        onDismiss={() => {
          setIsBannerDismissed(true);
          sessionStorage.setItem('promoBannerDismissed', '1');
        }}
        onEnroll={() => {
          setIsEnrollmentOpen(true);
          setSelectedModuleForEnrollment(undefined);
        }}
      />
    </div>
  );
}

export default App;

