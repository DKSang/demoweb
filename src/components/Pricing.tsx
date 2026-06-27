import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ShieldCheck, Mail, Calendar, Sparkles, Send } from "lucide-react";

export default function Pricing({ onTriggerNotification }: { onTriggerNotification: (msg: string) => void }) {
  // Calculator States
  const [specimensCount, setSpecimensCount] = useState(3);
  const [hasPhysicalMesh, setHasPhysicalMesh] = useState(false);
  const [estimatedComplexity, setEstimatedComplexity] = useState<"Standard" | "Neural Adaptive" | "Infinite Quantum">("Neural Adaptive");

  // Contact Form States
  const [email, setEmail] = useState("");
  const [projectBrief, setProjectBrief] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Dynamic cost calculation
  const calculateEstimate = () => {
    let base = specimensCount * 1250;
    if (hasPhysicalMesh) base += 2500;
    if (estimatedComplexity === "Neural Adaptive") base *= 1.35;
    if (estimatedComplexity === "Infinite Quantum") base *= 1.85;
    return Math.round(base);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      onTriggerNotification("Please provide a valid agency partner email.");
      return;
    }
    setSubmitted(true);
    onTriggerNotification("Design proposal dispatched to Bloom Synthesis Board.");
    setTimeout(() => {
      setSubmitted(false);
      setEmail("");
      setProjectBrief("");
    }, 4000);
  };

  const packages = [
    {
      name: "Organic Seed",
      price: "$2,400",
      period: "per design module",
      desc: "Perfect for high-end boutique brand launches seeking singular algorithmic identity assets.",
      features: [
        "1 Unique Botanical Specimen",
        "Vector SVG + High-res PNG export",
        "Linear growth simulation logs",
        "Refraction glass shader source"
      ]
    },
    {
      name: "Neural Sprout",
      price: "$5,800",
      period: "full custom setup",
      desc: "Comprehensive generative ecosystem suited for luxury physical or spatial interactive pavilions.",
      features: [
        "Up to 5 Customized Specimen Seeds",
        "3D OBJ + GLTF mesh files export",
        "Physics-authoritative canopy math",
        "2 Revision simulation recursions",
        "Premium web simulator deployment"
      ]
    },
    {
      name: "Enterprise Forest",
      price: "Custom",
      period: "partnership scale",
      desc: "Unlimited biological design assets with integrated continuous ML mutations and spatial CAD blueprinting.",
      features: [
        "Infinite Generative Specimens",
        "Acoustic damping screen CADs",
        "Integrated live real-time sensor support",
        "Priority dedicated botanist support",
        "Absolute perpetual design copyright"
      ]
    }
  ];

  return (
    <section id="pricing" className="py-24 px-4 lg:px-8 relative z-10 max-w-7xl mx-auto border-t border-white/5">
      
      {/* Title Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-6">
        <div>
          <span className="text-xs tracking-[0.3em] uppercase text-white/50 font-mono block mb-3">Partnership Tiers & Pricing</span>
          <h2 className="text-4xl lg:text-5xl font-medium tracking-[-0.04em] text-white">
            Ecosystem <span className="font-serif italic text-white/85">sponsorship</span> modules.
          </h2>
        </div>
        <p className="text-white/60 text-xs sm:text-sm max-w-md leading-relaxed">
          Secure absolute spatial supremacy. Select a pre-formulated biological design tier or configure your custom parametric blueprint below.
        </p>
      </div>

      {/* Package Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {packages.map((pkg, index) => (
          <div
            key={index}
            className={`p-8 rounded-[2.2rem] liquid-glass flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 ${
              index === 1 ? "relative shadow-[0_0_50px_rgba(255,255,255,0.025)]" : ""
            }`}
          >
            {index === 1 && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold">
                Most Chosen
              </span>
            )}

            <div>
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block mb-1">Ecosystem Package // 0{index + 1}</span>
              <h3 className="text-xl font-medium text-white tracking-tight">{pkg.name}</h3>
              <p className="text-xs text-white/50 leading-relaxed mt-2 min-h-[50px]">{pkg.desc}</p>
              
              <div className="my-6 border-t border-b border-white/5 py-4 flex items-baseline gap-2">
                <span className="text-3xl font-medium text-white tracking-tight">{pkg.price}</span>
                <span className="text-[10px] font-mono text-white/40">{pkg.period}</span>
              </div>

              <ul className="flex flex-col gap-3">
                {pkg.features.map((feat, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-2.5 text-[11px] text-white/75">
                    <Check className="w-3.5 h-3.5 text-white/40 mt-0.5 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => {
                onTriggerNotification(`Initiated request pipeline for: ${pkg.name}`);
                setProjectBrief(`Inquiry regarding ${pkg.name}. Ready to build generative flora.`);
              }}
              className={`w-full py-2.5 mt-8 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                index === 1 
                ? "bg-white text-black hover:bg-white/90" 
                : "liquid-glass text-white"
              }`}
            >
              Configure Setup
            </button>
          </div>
        ))}
      </div>

      {/* Interactive Project Pricing & Custom Design Brief Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-16 rounded-[2.5rem] liquid-glass p-8">
        
        {/* Parametric Calculator */}
        <div className="lg:col-span-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/5 pb-8 lg:pb-0 lg:pr-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-white/70" />
              <span className="text-xs font-mono uppercase tracking-widest text-white/80">Interactive Quoter</span>
            </div>
            
            <h3 className="text-xl font-medium text-white tracking-tight">Parametric Specimen Planner</h3>
            <p className="text-xs text-white/50 mt-1 leading-relaxed">
              Dynamically estimate your biological design agency fees by custom selecting organic density variables.
            </p>
          </div>

          <div className="flex flex-col gap-6 my-8">
            {/* Range: Specimens */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[11px] font-mono text-white/50">
                <span>Botanical Specimens Needed</span>
                <span>{specimensCount} flora</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={specimensCount}
                onChange={(e) => setSpecimensCount(parseInt(e.target.value))}
                className="w-full accent-white h-1 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Toggle: CAD meshes */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/60 border border-white/5">
              <div>
                <span className="text-xs font-medium text-white block">CAD blueprints & 3D meshes</span>
                <span className="text-[9px] text-white/40 block">Requires zero-loss mesh optimization export</span>
              </div>
              <button
                onClick={() => setHasPhysicalMesh(!hasPhysicalMesh)}
                className={`w-10 h-5 rounded-full p-0.5 transition-all flex items-center ${
                  hasPhysicalMesh ? "bg-white justify-end" : "bg-white/10 justify-start"
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${hasPhysicalMesh ? "bg-black" : "bg-white"}`} />
              </button>
            </div>

            {/* Selector: Complexity */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono tracking-wider text-white/40 uppercase">Ecosystem Complexity</span>
              <div className="grid grid-cols-3 gap-2">
                {(["Standard", "Neural Adaptive", "Infinite Quantum"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setEstimatedComplexity(level)}
                    className={`px-3 py-2 rounded-xl text-[9px] font-mono transition-all text-center border ${
                      estimatedComplexity === level 
                      ? "bg-white/10 border-white/20 text-white" 
                      : "bg-transparent border-white/5 text-white/40 hover:text-white"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calculator Output */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono tracking-widest text-white/40 block uppercase">Estimated Design Fee</span>
              <span className="text-2xl font-medium text-white tracking-tight">${calculateEstimate().toLocaleString()}</span>
            </div>
            <span className="text-[10px] font-mono text-white/45 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
              EST. METRIC INDEX
            </span>
          </div>

        </div>

        {/* Dynamic Project Brief Form */}
        <form onSubmit={handleFormSubmit} className="lg:col-span-6 flex flex-col justify-between pl-0 lg:pl-4">
          
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-white/70" />
              <span className="text-xs font-mono uppercase tracking-widest text-white/80">Secured Dispatch Pipeline</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase">Partner Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="architect@partner.com"
                className="px-4 py-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-white/20 text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase">Ecosystem / Project Brief Details</label>
              <textarea
                value={projectBrief}
                onChange={(e) => setProjectBrief(e.target.value)}
                placeholder="Briefly describe your spatial, brand, or interactive digital flora requirements..."
                rows={4}
                className="px-4 py-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-white/20 text-xs text-white placeholder-white/30 focus:outline-none resize-none"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>By dispatching, you establish mutual project confidentiality.</span>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-full bg-white text-black hover:bg-white/95 font-semibold text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Proposal Blueprint</span>
            </button>
          </div>

        </form>

      </div>

    </section>
  );
}
