import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";
import { X, Cpu, Globe, Zap, Layers } from "lucide-react";

interface ShowcaseProps {
  onClose: () => void;
  layoutId: string;
}

export function Showcase({ onClose, layoutId }: ShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    container: containerRef,
  });

  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  
  // Hero Section Transforms
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -100]);

  // Laptop Assembly Transforms
  const laptopScale = useTransform(scrollYProgress, [0.1, 0.4], [0.5, 1]);
  const laptopY = useTransform(scrollYProgress, [0.1, 0.4], [100, 0]);
  const screenOpacity = useTransform(scrollYProgress, [0.3, 0.4], [0, 1]);

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
      {/* Fixed Header / Close Button */}
      <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-[60] mix-blend-difference text-white">
        <span className="font-semibold tracking-tight text-lg">HUB DUB Showcase</span>
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-2 rounded-full bg-black/10 backdrop-blur-md hover:bg-black/20 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content Wrapper */}
      <div className="relative min-h-[300vh]">
        
        {/* Section 1: Hero (Morph Target) */}
        <section className="h-screen flex flex-col items-center justify-center relative sticky top-0">
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
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-100 to-white shadow-xl flex items-center justify-center border border-white/50">
                <Cpu className="w-12 h-12 text-gray-800" />
              </div>
            </motion.div>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-600">
              The Central Nervous System
            </h1>
            <p className="text-2xl text-gray-500 font-light max-w-2xl mx-auto leading-relaxed">
              Orchestrating the entire dubbing workflow from a single, intelligent core.
            </p>
          </motion.div>
        </section>

        {/* Section 2: The Assembly */}
        <section className="h-screen flex items-center justify-center relative sticky top-0 bg-[#f5f5f7]">
          <div className="w-full max-w-6xl px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <motion.div 
                style={{ scale: laptopScale, y: laptopY }}
                className="relative aspect-video bg-gray-900 rounded-xl shadow-2xl border-[8px] border-gray-800 flex items-center justify-center overflow-hidden"
              >
                {/* Mock Screen Content */}
                <motion.div style={{ opacity: screenOpacity }} className="absolute inset-0 bg-gray-800 flex flex-col">
                  <div className="h-8 bg-gray-900 w-full flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"/>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"/>
                    <div className="w-3 h-3 rounded-full bg-green-500"/>
                  </div>
                  <div className="flex-1 p-4 grid grid-cols-12 gap-4">
                    <div className="col-span-3 bg-gray-700/50 rounded-lg animate-pulse"/>
                    <div className="col-span-9 flex flex-col gap-4">
                      <div className="h-32 bg-gray-700/30 rounded-lg"/>
                      <div className="h-32 bg-gray-700/30 rounded-lg"/>
                      <div className="flex-1 bg-gray-700/30 rounded-lg"/>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
            <div className="order-1 md:order-2 space-y-8">
               <div className="space-y-4">
                 <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                   <Zap className="w-6 h-6 text-amber-600" />
                 </div>
                 <h2 className="text-4xl font-semibold tracking-tight">Instant Assembly</h2>
                 <p className="text-xl text-gray-500 leading-relaxed">
                   Components fly in from the cloud, assembling your workspace in milliseconds. No installation, no friction.
                 </p>
               </div>
            </div>
          </div>
        </section>

        {/* Section 3: Global Scale */}
        <section className="h-screen flex items-center justify-center relative bg-white">
           <div className="text-center max-w-4xl px-6">
             <Globe className="w-24 h-24 text-gray-200 mx-auto mb-8" />
             <h2 className="text-5xl font-bold tracking-tight mb-6">Global Scale. Local Feel.</h2>
             <p className="text-xl text-gray-500">
               Deployed on edge networks worldwide for zero-latency collaboration.
             </p>
           </div>
        </section>

      </div>
    </motion.div>
  );
}
