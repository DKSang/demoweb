import React, { useState } from "react";
import { motion } from "motion/react";
import { Sliders, Cpu, Eye, Zap, Layers, Compass } from "lucide-react";

export default function Expertise() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const capabilities = [
    {
      icon: <Cpu className="w-5 h-5" />,
      title: "Procedural Generative Growth",
      subtitle: "Algorithmic Plant Life",
      description: "Generates custom organic architectures through advanced recursive neural models, mapping sap flow, branching recursion, and micro-leaf placement.",
      stat: "240k mutations/sec"
    },
    {
      icon: <Layers className="w-5 h-5" />,
      title: "Liquid Glass UI/UX Systems",
      subtitle: "Premium Web Portals",
      description: "Specialized interface layouts featuring light refraction, hyper-realistic glass-morphism panels, and elegant high-contrast display typography.",
      stat: "60fps fluid blur"
    },
    {
      icon: <Eye className="w-5 h-5" />,
      title: "3D Structural Sculpting",
      subtitle: "CAD & Architectural Assets",
      description: "Mathematical conversion of organic patterns into production-ready physical files (OBJ, STL) for installation designers and fabricators.",
      stat: "Zero-loss mesh export"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Synesthetic Brand Assets",
      subtitle: "High-Fidelity Visuals",
      description: "Crafting distinct non-derivative visual systems that connect nature with technology using strict, luxurious monochrome parameters.",
      stat: "100% vector pristine"
    },
    {
      icon: <Sliders className="w-5 h-5" />,
      title: "Generative Parameter Tuning",
      subtitle: "Custom Control Matrices",
      description: "Deploying deep neural parameters for real-time generative physical properties, allowing precise scale and curvature manipulation.",
      stat: "18-axis parametric scale"
    },
    {
      icon: <Compass className="w-5 h-5" />,
      title: "Ecosystem Design Consultations",
      subtitle: "Spatial Strategy",
      description: "Translating digital-first generative plant forms into physical space guidelines, interior bio-design, and interactive brand pavillions.",
      stat: "Enterprise integration ready"
    }
  ];

  return (
    <section id="expertise" className="py-24 px-4 lg:px-8 relative z-10 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-6">
        <div>
          <span className="text-xs tracking-[0.3em] uppercase text-white/50 font-mono block mb-3">Capabilities & Studio Focus</span>
          <h2 className="text-4xl lg:text-5xl font-medium tracking-[-0.04em] text-white">
            Design <span className="font-serif italic text-white/85">engineered</span> by algorithms.
          </h2>
        </div>
        <p className="text-white/60 text-xs sm:text-sm max-w-md leading-relaxed">
          We operate at the precise intersection of computational botany, liquid interface design, and premium spatial sculpture to formulate absolute brand authority.
        </p>
      </div>

      {/* Grid of Capabilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {capabilities.map((item, index) => (
          <motion.div
            key={index}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="p-8 rounded-[2rem] liquid-glass hover:scale-[1.03] active:scale-[0.99] transition-all duration-300 flex flex-col justify-between min-h-[280px]"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.8 }}
          >
            <div>
              {/* Icon Container */}
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/90 mb-6">
                {item.icon}
              </div>

              {/* Header */}
              <span className="text-[10px] font-mono tracking-wider text-white/40 block mb-1 uppercase">
                {item.subtitle}
              </span>
              <h3 className="text-lg font-medium text-white tracking-tight">
                {item.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-white/60 leading-relaxed mt-3">
                {item.description}
              </p>
            </div>

            {/* Bottom Algorithm Stats */}
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] font-mono tracking-widest text-white/30 uppercase">Engine state</span>
              <span className="text-[10px] font-mono text-white/90 font-medium">
                {hoveredIndex === index ? "ACTIVE // " : ""}
                {item.stat}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
