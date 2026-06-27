import React, { useState } from "react";
import { motion } from "motion/react";
import { Compass, Leaf, Milestone, ShieldCheck } from "lucide-react";

export default function Philosophy() {
  const [activeStep, setActiveStep] = useState(0);

  const pillars = [
    {
      icon: <Leaf className="w-5 h-5" />,
      title: "Biological Supremacy",
      description: "Computers do not replace nature; they extend it. We translate cellular respiration, sap circulation, and light capture into computational code blocks."
    },
    {
      icon: <Milestone className="w-5 h-5" />,
      title: "Perfect Monochromatic Clarity",
      description: "Color represents distraction. By executing strict monochrome parameters, we reveal pure, raw geometry, negative space proportion, and true surface reflections."
    },
    {
      icon: <Compass className="w-5 h-5" />,
      title: "Infinite Endings",
      description: "Organic forms never reach a point of static isolation. Our systems co-create dynamic assets designed to continuously mutate and adapt in spatial realms."
    }
  ];

  const milestones = [
    {
      year: "2024",
      title: "The Seed Formula",
      desc: "Our labs successfully mapped the mathematical branching algorithm of primitive fern species into digital vector arrays."
    },
    {
      year: "2025",
      title: "Liquid Glass Synthesis",
      desc: "Introduced advanced light-refractive web layouts that react beautifully to physical screen boundaries and user cursor coordinates."
    },
    {
      year: "2026",
      title: "Physical Canopy Integration",
      desc: "Begun spatial deployment of 3D-sculpted generative vegetation grids in top tier global architectural pavilions."
    }
  ];

  return (
    <section id="philosophy" className="py-24 px-4 lg:px-8 relative z-10 max-w-7xl mx-auto border-t border-white/5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Editorial Philosophy Quote */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <span className="text-xs tracking-[0.3em] uppercase text-white/50 font-mono block">Philosophy & Metaphysics</span>
          
          <h2 className="text-4xl lg:text-5xl font-medium tracking-[-0.04em] text-white leading-tight">
            "We imagined a <br />
            <span className="font-serif italic text-white/80">realm with no ending</span>."
          </h2>

          <p className="text-sm text-white/60 leading-relaxed mt-4">
            Bloom is not just an agency; it is a dedicated computational research lab. We believe design should mirror the organic, complex, yet beautifully efficient networks of biological flora. By marrying algorithmic precision with pristine liquid glass styling, we co-create premium visual frameworks that command absolute presence.
          </p>

          {/* Interactive milestone steps tracker */}
          <div className="mt-8 p-6 rounded-[2rem] liquid-glass flex flex-col gap-4">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Ecosystem Milestones</span>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              {milestones.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setActiveStep(index)}
                  className={`text-xs font-mono pb-2 transition-all border-b-2 relative -bottom-[10px] ${
                    activeStep === index 
                    ? "text-white border-white font-semibold" 
                    : "text-white/30 border-transparent hover:text-white"
                  }`}
                >
                  {item.year}
                </button>
              ))}
            </div>
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-2 min-h-[70px]"
            >
              <h4 className="text-xs font-semibold text-white">{milestones[activeStep].title}</h4>
              <p className="text-[11px] text-white/50 leading-relaxed mt-1">{milestones[activeStep].desc}</p>
            </motion.div>
          </div>
        </div>

        {/* Right 3 pillars cards */}
        <div className="lg:col-span-6 flex flex-col gap-5">
          {pillars.map((pillar, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              className="p-6 rounded-3xl liquid-glass flex items-start gap-5 transition-transform duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 shrink-0">
                {pillar.icon}
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-wide uppercase text-white">{pillar.title}</h3>
                <p className="text-[11px] text-white/50 leading-relaxed mt-2">{pillar.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
