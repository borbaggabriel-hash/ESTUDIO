import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ReactNode, useRef } from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  layoutId?: string;
}

export function TiltCard({ children, className = "", onClick, layoutId }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 100, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 100, damping: 30 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-12deg", "12deg"]);
  const shadowX = useTransform(mouseX, [-0.5, 0.5], ["-10px", "10px"]);
  const shadowY = useTransform(mouseY, [-0.5, 0.5], ["-10px", "10px"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseXPos = e.clientX - rect.left;
    const mouseYPos = e.clientY - rect.top;

    const xPct = mouseXPos / width - 0.5;
    const yPct = mouseYPos / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      layoutId={layoutId}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        boxShadow: useTransform(
          [shadowX, shadowY],
          ([sx, sy]) => `${sx}px ${sy}px 50px -12px rgba(0, 0, 0, 0.05)`
        )
      }}
      whileHover={{ scale: 1.02 }}
      className={`relative rounded-[24px] bg-white border border-[#f5f5f7] ${className}`}
    >
      <div 
        style={{ transform: "translateZ(20px)" }} 
        className="h-full w-full"
      >
        {children}
      </div>
    </motion.div>
  );
}
