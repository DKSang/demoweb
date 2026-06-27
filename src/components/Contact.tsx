import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle, ChevronDown, Sparkles, MapPin, Globe, Clock } from "lucide-react";

export default function Contact({ onTriggerNotification }: { onTriggerNotification: (msg: string) => void }) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "What does AI-powered plant design actually mean?",
      a: "It means we use recursive neural networks to simulate botanical math, growth vectors, sap circulation patterns, and phototropism. This allows us to generate distinct, infinitely scalable organic meshes and high-fidelity textures instead of static hand-drawn vectors."
    },
    {
      q: "Can these models be exported for real physical architecture?",
      a: "Yes. Our systems are optimized to generate absolute zero-loss OBJ, CAD, and vector files. We regularly partner with interior architects, luxury retailers, and experiential exhibition designers to print or forge these biological geometries in premium materials."
    },
    {
      q: "Why do you adhere strictly to a grayscale color palette?",
      a: "Grayscale allows absolute emphasis on raw form, spatial depth, specular reflections, and architectural rhythm. By removing color distraction, we focus entirely on structural honesty and luxurious, high-contrast visual authority."
    },
    {
      q: "How does the custom quoter and design process work?",
      a: "You select specimens count, complexity, and physical mesh configurations. Once you dispatch your brief, our design committee reviews the algorithmic parameters and schedules a spatial zoom sync to formulate your specific partnership model."
    }
  ];

  return (
    <section id="contact-faq" className="py-24 px-4 lg:px-8 relative z-10 max-w-7xl mx-auto border-t border-white/5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left: Studio Info */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div>
            <span className="text-xs tracking-[0.3em] uppercase text-white/50 font-mono block mb-3">FAQ & Studio Location</span>
            <h2 className="text-4xl lg:text-5xl font-medium tracking-[-0.04em] text-white">
              Securing <span className="font-serif italic text-white/85">clarity</span> in structure.
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-white/50 leading-relaxed max-w-sm">
            Read through common inquiries regarding our biological computation workflow, or get in touch with our spatial consultants directly.
          </p>

          <div className="flex flex-col gap-4 mt-6">
            <div className="flex items-center gap-3 text-xs text-white/70">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span>Geneva, Switzerland // Tokyo, Japan</span>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-white/70">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <span>Global Remote Spatial Nodes</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-white/70">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span>Continuous Algorithmic Calculation (UTC)</span>
            </div>
          </div>
        </div>

        {/* Right: FAQs */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl liquid-glass overflow-hidden border border-transparent transition-colors hover:border-white/5"
              >
                <button
                  onClick={() => {
                    setOpenFaqIndex(isOpen ? null : index);
                    onTriggerNotification(isOpen ? "Closed FAQ item." : "Accessed FAQ details.");
                  }}
                  className="w-full px-6 py-5 text-left flex items-center justify-between text-white hover:text-white/85 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-medium tracking-tight pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180 text-white" : ""}`} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-6 text-xs text-white/50 leading-relaxed border-t border-white/5 pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>

      {/* Elegant Grayscale Footer */}
      <footer className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-[11px] font-mono text-white/40">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Bloom Footer Logo" className="w-5 h-5 opacity-40" />
          <span>© 2026 BLOOM COMPUTATIONAL BOTANY LAB. ALL SPECULAR RIGHTS PRESERVED.</span>
        </div>

        <div className="flex items-center gap-6">
          <a href="#expertise" className="hover:text-white transition-colors">CAPABILITIES</a>
          <a href="#portfolio" className="hover:text-white transition-colors">PORTFOLIO</a>
          <a href="#interactive-lab" className="hover:text-white transition-colors">GROWTH LAB</a>
          <a href="#pricing" className="hover:text-white transition-colors">PARTNERSHIPS</a>
        </div>
      </footer>

    </section>
  );
}
