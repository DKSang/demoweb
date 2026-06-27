import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, Plus, ArrowUpRight, ShieldAlert, Sparkles, Filter } from "lucide-react";

export default function Portfolio({ onTriggerNotification }: { onTriggerNotification: (msg: string) => void }) {
  const [activeCategory, setActiveCategory] = useState<"All" | "Botanical" | "Architectural" | "Pattern">("All");
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  const projects = [
    {
      id: "specimen-01",
      title: "Fractal Fern VII",
      category: "Botanical",
      complexity: "94.2% Growth Factor",
      description: "Generative fern structure modeled with recursive algorithmic spirals. Created as a permanent interactive digital column for a physical brand pavilion.",
      details: "Rendered over 1,400,000 recursive branches using procedural SVG paths. Preserves strict grayscale parameters with custom specular glass-refraction coefficients.",
      svgPreview: (
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-white opacity-85" fill="none" strokeWidth="0.8">
          <path d="M50 90 C50 60, 50 30, 50 10" />
          <path d="M50 80 C50 70, 30 65, 25 60 C20 55, 30 55, 50 70" />
          <path d="M50 80 C50 70, 70 65, 75 60 C80 55, 70 55, 50 70" />
          <path d="M50 65 C50 55, 33 50, 28 45 C23 40, 33 40, 50 55" />
          <path d="M50 65 C50 55, 67 50, 72 45 C77 40, 67 40, 50 55" />
          <path d="M50 50 C50 40, 35 35, 30 30 C25 25, 35 25, 50 40" />
          <path d="M50 50 C50 40, 65 35, 70 30 C75 25, 65 25, 50 40" />
          <path d="M50 35 C50 25, 38 20, 34 18 C30 16, 38 16, 50 28" />
          <path d="M50 35 C50 25, 62 20, 66 18 C70 16, 62 16, 50 28" />
        </svg>
      )
    },
    {
      id: "specimen-02",
      title: "Crystalline Orchid",
      category: "Botanical",
      complexity: "89.8% Specular Rate",
      description: "Liquid glass procedural orchid, optimized for webGL spatial environments. The design combines light-refracting petals with an abstract seed core.",
      details: "A perfect study in symmetry and transparency. Utilizes 5-axis curvature mapping to react beautifully to simulated ambient key lights inside custom browser tabs.",
      svgPreview: (
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-white opacity-85" fill="none" strokeWidth="0.8">
          <circle cx="50" cy="50" r="8" />
          <path d="M50 50 Q30 30, 50 10 Q70 30, 50 50 Z" />
          <path d="M50 50 Q30 70, 50 90 Q70 70, 50 50 Z" />
          <path d="M50 50 Q10 50, 10 30 Q30 50, 50 50 Z" />
          <path d="M50 50 Q90 50, 90 70 Q70 50, 50 50 Z" />
          <circle cx="50" cy="50" r="22" strokeDasharray="3 3" />
        </svg>
      )
    },
    {
      id: "specimen-03",
      title: "Hyper-Column Canopy",
      category: "Architectural",
      complexity: "12,400 Nodes",
      description: "An evolutionary architectural column system utilizing biological tree root algorithmics for optimal loading support.",
      details: "Designed as a scalable structural modular kit. Features responsive root filaments generated dynamically using non-linear math parameters for real-world metal 3D-printing.",
      svgPreview: (
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-white opacity-85" fill="none" strokeWidth="0.8">
          <line x1="30" y1="90" x2="30" y2="10" />
          <line x1="70" y1="90" x2="70" y2="10" />
          <path d="M30 40 Q50 30, 70 40" />
          <path d="M30 60 Q50 50, 70 60" />
          <path d="M30 80 Q50 70, 70 80" />
          <path d="M30 20 Q50 10, 70 20" />
          <path d="M30 15 Q10 5, 20 50 Q30 80, 15 90" strokeDasharray="2 2" />
          <path d="M70 15 Q90 5, 80 50 Q70 80, 85 90" strokeDasharray="2 2" />
        </svg>
      )
    },
    {
      id: "specimen-04",
      title: "Erosive Alveolar Mesh",
      category: "Pattern",
      complexity: "97.4% Porosity",
      description: "Advanced spatial noise structure mimicking organic bone and cellular lattice networks, suited for acoustic dampening screens.",
      details: "A premium computational design piece. This organic pattern adapts to sound reflection criteria, using strict monochrome liquid layers to convey absolute serenity.",
      svgPreview: (
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-white opacity-85" fill="none" strokeWidth="0.8">
          <circle cx="25" cy="25" r="12" />
          <circle cx="75" cy="25" r="10" />
          <circle cx="50" cy="50" r="16" />
          <circle cx="20" cy="75" r="11" />
          <circle cx="80" cy="75" r="13" />
          <path d="M25 37 Q37.5 50, 34 50" />
          <path d="M75 35 Q62.5 50, 66 50" />
          <path d="M20 64 Q35 50, 34 50" />
          <path d="M80 62 Q65 50, 66 50" />
        </svg>
      )
    },
    {
      id: "specimen-05",
      title: "Lichen-Pillar System",
      category: "Architectural",
      complexity: "15 Axis Growth",
      description: "Biological canopy architecture simulating symbiotic lichen colonization patterns for modular skyscraper facade designs.",
      details: "Utilizes cellular automata growth rules mapped on a cylindrical lattice. Generates natural ventilation pockets and visual depth rhythms.",
      svgPreview: (
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-white opacity-85" fill="none" strokeWidth="0.8">
          <rect x="20" y="10" width="60" height="80" rx="10" strokeDasharray="4 4" />
          <path d="M30 20 H40 V30 H30 Z" fill="white" opacity="0.3" />
          <path d="M60 40 H70 V50 H60 Z" fill="white" opacity="0.3" />
          <path d="M35 60 H45 V70 H35 Z" fill="white" opacity="0.3" />
          <path d="M25 45 Q50 45, 50 65 Q50 85, 75 85" strokeDasharray="2 1" />
        </svg>
      )
    },
    {
      id: "specimen-06",
      title: "Bespoke Foliage Grid",
      category: "Pattern",
      complexity: "Infinite Seeds",
      description: "A repeating micro-textured vegetative array for high-luxury wallpaper panels and premium packaging design concepts.",
      details: "Generated via customized noise coordinates and parametric scale filters, producing continuous organic variations with absolute geometric alignment.",
      svgPreview: (
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-white opacity-85" fill="none" strokeWidth="0.8">
          <g transform="translate(10, 10)">
            <circle cx="15" cy="15" r="10" />
            <line x1="15" y1="15" x2="30" y2="30" />
          </g>
          <g transform="translate(50, 10)">
            <circle cx="15" cy="15" r="10" />
            <line x1="15" y1="15" x2="0" y2="30" />
          </g>
          <g transform="translate(10, 50)">
            <circle cx="15" cy="15" r="10" />
            <line x1="15" y1="15" x2="30" y2="0" />
          </g>
          <g transform="translate(50, 50)">
            <circle cx="15" cy="15" r="10" />
            <line x1="15" y1="15" x2="0" y2="0" />
          </g>
        </svg>
      )
    }
  ];

  const filteredProjects = activeCategory === "All" 
    ? projects 
    : projects.filter(p => p.category === activeCategory);

  return (
    <section id="portfolio" className="py-24 px-4 lg:px-8 relative z-10 max-w-7xl mx-auto border-t border-white/5">
      
      {/* Portfolio Title & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
        <div>
          <span className="text-xs tracking-[0.3em] uppercase text-white/50 font-mono block mb-3">Curated Creations</span>
          <h2 className="text-4xl lg:text-5xl font-medium tracking-[-0.04em] text-white">
            Our <span className="font-serif italic text-white/85">neural</span> masterpieces.
          </h2>
        </div>

        {/* Categories Tab Pill */}
        <div className="flex flex-wrap gap-2.5 liquid-glass p-1.5 rounded-full">
          {(["All", "Botanical", "Architectural", "Pattern"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                onTriggerNotification(`Filtered portfolio to: ${cat}`);
              }}
              className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat 
                ? "bg-white/15 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" 
                : "text-white/60 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project) => (
            <motion.div
              layout
              key={project.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="group relative rounded-[2rem] p-6 liquid-glass flex flex-col justify-between min-h-[360px] cursor-pointer hover:scale-[1.02] transition-transform duration-300"
              onClick={() => setSelectedProject(project)}
            >
              
              {/* Graphic Display Window (Minimal Grayscale Vectors instead of fake image placeholders) */}
              <div className="h-44 w-full bg-zinc-950/70 rounded-2xl flex items-center justify-center p-8 border border-white/5 relative overflow-hidden group-hover:bg-zinc-950 transition-colors">
                {project.svgPreview}
                
                {/* Expand Pill */}
                <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Eye className="w-3.5 h-3.5 text-white/80" />
                </div>
              </div>

              {/* Title & Stats */}
              <div className="mt-6 flex items-start justify-between">
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase block mb-1">
                    {project.category} // {project.complexity}
                  </span>
                  <h3 className="text-lg font-medium text-white tracking-tight group-hover:text-white/80 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed mt-2 line-clamp-2">
                    {project.description}
                  </p>
                </div>
                
                <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-white/10 group-hover:text-white transition-all shrink-0">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>

            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Project Details Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-2xl rounded-[2.5rem] liquid-glass-strong p-8 overflow-hidden shadow-2xl flex flex-col md:flex-row gap-8"
            >
              {/* Graphic Left */}
              <div className="flex-1 min-h-[220px] bg-zinc-950 rounded-2xl flex items-center justify-center p-12 border border-white/5">
                {selectedProject.svgPreview}
              </div>

              {/* Text info Right */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-mono text-white/50 bg-white/5 px-2.5 py-1 rounded-md uppercase">
                      {selectedProject.category}
                    </span>
                    <span className="text-[9px] font-mono text-white/40">
                      {selectedProject.complexity}
                    </span>
                  </div>

                  <h3 className="text-xl font-medium text-white tracking-tight">
                    {selectedProject.title}
                  </h3>

                  <p className="text-xs text-white/75 mt-4 leading-relaxed">
                    {selectedProject.description}
                  </p>

                  <p className="text-xs text-white/50 mt-3 leading-relaxed border-t border-white/5 pt-3">
                    {selectedProject.details}
                  </p>
                </div>

                <div className="mt-8 flex items-center gap-3">
                  <button
                    onClick={() => {
                      onTriggerNotification(`Specimen file "${selectedProject.title}" queue configured.`);
                      setSelectedProject(null);
                    }}
                    className="flex-1 py-2.5 rounded-full bg-white hover:bg-white/90 text-black text-xs font-semibold hover:scale-105 active:scale-95 transition-all text-center"
                  >
                    Acquire Mesh Data
                  </button>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="py-2.5 px-6 rounded-full liquid-glass text-white/80 text-xs font-semibold hover:scale-105 active:scale-95 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
}
