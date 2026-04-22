import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import { X, Mic, Activity, Clock, Award, Download, Film, Disc } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CourseShowcaseProps {
  onClose: () => void;
  layoutId: string;
}

export function CourseShowcase({ onClose, layoutId }: CourseShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    container: containerRef,
  });

  // Hero Section
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -100]);

  // Microphone Disassembly Animation
  const micOpacity = useTransform(scrollYProgress, [0.15, 0.25], [0, 1]);
  const grillY = useTransform(scrollYProgress, [0.2, 0.8], [0, -150]);
  const capsuleY = useTransform(scrollYProgress, [0.2, 0.8], [0, 0]);
  const bodyY = useTransform(scrollYProgress, [0.2, 0.8], [0, 150]);
  
  const grillRotate = useTransform(scrollYProgress, [0.2, 0.8], [0, 10]);
  const capsuleRotate = useTransform(scrollYProgress, [0.2, 0.8], [0, -5]);
  const bodyRotate = useTransform(scrollYProgress, [0.2, 0.8], [0, 5]);

  return (
    <motion.div
      layoutId={layoutId}
      className="fixed inset-0 z-50 bg-white overflow-y-auto overflow-x-hidden"
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-[60] mix-blend-difference text-white">
        <span className="font-semibold tracking-tight text-lg">HUBSCHOOL / VOX-PRO</span>
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-2 rounded-full bg-black/10 backdrop-blur-md hover:bg-black/20 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="relative min-h-[400vh]">
        
        {/* Section 1: Hero */}
        <section className="h-screen flex flex-col items-center justify-center relative sticky top-0 bg-white">
          <motion.div 
            style={{ scale, opacity, y: heroY }}
            className="text-center max-w-4xl px-6"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="mb-8 flex justify-center"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-100 to-white shadow-xl flex items-center justify-center border border-white/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(0,0,0,0.05),transparent)]" />
                <Mic className="w-16 h-16 text-[#1d1d1f]" strokeWidth={1} />
              </div>
            </motion.div>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6 text-[#1d1d1f]">
              VOX-PRO
            </h1>
            <p className="text-2xl text-[#86868b] font-light max-w-2xl mx-auto leading-relaxed">
              Master the delicate balance between technical breath control and emotional truth.
            </p>
          </motion.div>
        </section>

        {/* Section 2: The Assembly (Microphone Disassembly) */}
        <section className="h-[200vh] relative bg-[#f5f5f7]">
          <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
            
            {/* Left: Sticky Titles */}
            <div className="absolute left-0 top-0 h-full w-1/3 p-12 flex flex-col justify-center space-y-32 z-10 pointer-events-none">
              <motion.div style={{ opacity: useTransform(scrollYProgress, [0.25, 0.35, 0.45], [0, 1, 0]) }}>
                <h3 className="text-3xl font-semibold text-[#1d1d1f]">The Grille</h3>
                <p className="text-[#86868b] mt-2">Acoustic transparency & plosive protection.</p>
              </motion.div>
              <motion.div style={{ opacity: useTransform(scrollYProgress, [0.45, 0.55, 0.65], [0, 1, 0]) }}>
                <h3 className="text-3xl font-semibold text-[#1d1d1f]">The Capsule</h3>
                <p className="text-[#86868b] mt-2">Precision diaphragm dynamics.</p>
              </motion.div>
              <motion.div style={{ opacity: useTransform(scrollYProgress, [0.65, 0.75, 0.85], [0, 1, 0]) }}>
                <h3 className="text-3xl font-semibold text-[#1d1d1f]">The Body</h3>
                <p className="text-[#86868b] mt-2">Solid-state amplification circuitry.</p>
              </motion.div>
            </div>

            {/* Center: The Disassembling Microphone */}
            <motion.div 
              style={{ opacity: micOpacity }}
              className="relative w-[300px] h-[600px] flex flex-col items-center justify-center"
            >
              {/* Grille */}
              <motion.div 
                style={{ y: grillY, rotate: grillRotate }}
                className="w-48 h-48 rounded-full bg-gradient-to-br from-gray-300 to-gray-100 shadow-2xl z-30 border border-gray-200 relative overflow-hidden"
              >
                {/* Mesh Texture */}
                <div className="absolute inset-0 opacity-20" 
                  style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '4px 4px' }} 
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent" />
              </motion.div>

              {/* Capsule (Inner) */}
              <motion.div 
                style={{ y: capsuleY, rotate: capsuleRotate }}
                className="w-32 h-40 bg-gradient-to-b from-yellow-600 to-yellow-400 rounded-t-full shadow-inner z-20 -mt-12 border border-yellow-500/50 flex items-center justify-center"
              >
                <div className="w-24 h-24 rounded-full border-2 border-yellow-200/50" />
                <div className="absolute w-full h-full bg-gradient-to-r from-black/10 to-transparent" />
              </motion.div>

              {/* Body */}
              <motion.div 
                style={{ y: bodyY, rotate: bodyRotate }}
                className="w-40 h-80 bg-gradient-to-r from-gray-800 to-gray-600 rounded-b-3xl shadow-2xl z-10 -mt-4 flex flex-col items-center"
              >
                 <div className="w-full h-full bg-gradient-to-l from-black/20 to-transparent rounded-b-3xl" />
                 <div className="absolute bottom-12 w-8 h-8 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
                 <div className="absolute bottom-24 w-12 h-20 border border-gray-500/30 rounded" />
              </motion.div>

            </motion.div>

            {/* Right: Curriculum Details */}
            <div className="absolute right-0 top-0 h-full w-1/3 p-12 flex flex-col justify-center space-y-32 z-10 pointer-events-none text-right">
               <motion.div style={{ opacity: useTransform(scrollYProgress, [0.25, 0.35, 0.45], [0, 1, 0]) }}>
                <div className="inline-block bg-white px-4 py-2 rounded-lg shadow-sm mb-2 text-sm font-medium text-[#0071e3]">Module 01</div>
                <p className="text-lg text-[#1d1d1f]">Microphone Technique</p>
              </motion.div>
              <motion.div style={{ opacity: useTransform(scrollYProgress, [0.45, 0.55, 0.65], [0, 1, 0]) }}>
                <div className="inline-block bg-white px-4 py-2 rounded-lg shadow-sm mb-2 text-sm font-medium text-[#0071e3]">Module 02</div>
                <p className="text-lg text-[#1d1d1f]">Breath Control & Support</p>
              </motion.div>
              <motion.div style={{ opacity: useTransform(scrollYProgress, [0.65, 0.75, 0.85], [0, 1, 0]) }}>
                <div className="inline-block bg-white px-4 py-2 rounded-lg shadow-sm mb-2 text-sm font-medium text-[#0071e3]">Module 03</div>
                <p className="text-lg text-[#1d1d1f]">Emotional Connection</p>
              </motion.div>
            </div>

          </div>
        </section>

        {/* Section 3: Tech Specs */}
        <section className="min-h-screen bg-white py-32 px-6">
           <div className="max-w-4xl mx-auto">
             <h2 className="text-4xl font-semibold mb-16 text-center">Technical Specifications</h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
               <SpecItem icon={<Film className="w-6 h-6" />} label="45+ Hours of 4K Content" value="Shot on RED Cinema" />
               <SpecItem icon={<Download className="w-6 h-6" />} label="12GB+ Downloadable Stems" value="Raw Pro Tools Sessions" />
               <SpecItem icon={<Award className="w-6 h-6" />} label="Dolby Atmos Certified" value="Industry Standard" />
               <SpecItem icon={<Disc className="w-6 h-6" />} label="Lifetime Access" value="Updates Included" />
             </div>

             <div className="flex justify-center">
               <Button className="bg-[#1d1d1f] text-white hover:bg-black rounded-full px-12 h-14 text-lg">
                 Enroll Now - $499
               </Button>
             </div>
           </div>
        </section>

      </div>
    </motion.div>
  );
}

function SpecItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-start gap-4 p-6 rounded-2xl bg-[#f5f5f7]">
      <div className="p-3 bg-white rounded-xl shadow-sm text-[#1d1d1f]">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-[#1d1d1f] mb-1">{label}</h4>
        <p className="text-sm text-[#86868b]">{value}</p>
      </div>
    </div>
  );
}
