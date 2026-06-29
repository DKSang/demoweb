/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Download, 
  ArrowRight, 
  Twitter, 
  Linkedin, 
  Instagram, 
  Menu, 
  X,
  Plus
} from "lucide-react";

// Import Modular Components
import Expertise from "./components/Expertise";
import Portfolio from "./components/Portfolio";
import InteractiveLab from "./components/InteractiveLab";
import AISpeakingLab from "./components/AISpeakingLab.tsx";
import Philosophy from "./components/Philosophy";
import Pricing from "./components/Pricing";
import Contact from "./components/Contact";

export default function App() {
  // Navigation & Menu Drawer States
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"gallery" | "ai" | "structures">("ai");
  const [notification, setNotification] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<"landing" | "app">("landing");

  const triggerNotification = (message: string) => {
    setNotification(message);
    const timer = setTimeout(() => {
      setNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  };

  // Routing hook to switch between promotional Landing page and dedicated App Workspace
  useEffect(() => {
    const handleRoute = () => {
      const hash = window.location.hash;
      const appHashes = ["#shadowing-lab", "#ai-coach", "#vocab-notebook", "#word-games"];
      if (appHashes.includes(hash)) {
        setCurrentPage("app");
      } else {
        setCurrentPage("landing");
      }
    };

    handleRoute();
    window.addEventListener("hashchange", handleRoute);
    return () => window.removeEventListener("hashchange", handleRoute);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-[#000] text-white overflow-x-hidden font-sans select-none scroll-smooth">
      
      {/* 1. Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 opacity-40 pointer-events-none"
        style={{ filter: "grayscale(100%) contrast(1.1)" }}
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4" type="video/mp4" />
      </video>

      {/* Subtle black overlay gradient to secure extreme contrast on scrolled content */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/85 z-5 pointer-events-none" />

      {/* Interactive Micro-Notification (Grayscale Only) */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl liquid-glass-strong flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs text-white/95 tracking-wide font-medium">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {currentPage === "app" ? (
        <>
          {/* Focused App Header */}
          <header className="sticky top-0 z-40 w-full px-4 py-4 lg:px-8 flex items-center justify-between bg-black/10 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Bloom Logo" 
                className="w-8 h-8 object-contain hover:rotate-12 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <span className="text-xl font-semibold tracking-tighter text-white">bloom app</span>
            </div>
            
            <button 
              onClick={() => { window.location.hash = ""; }}
              className="px-5 py-2.5 rounded-full liquid-glass border border-white/10 hover:bg-white hover:text-black transition-all text-xs font-semibold text-white/90 cursor-pointer"
            >
              &larr; Exit to Landing Page
            </button>
          </header>

          <main className="relative z-10 w-full p-4 lg:p-8">
            <AISpeakingLab />
          </main>
        </>
      ) : (
        <>
          {/* Quick Nav Bar (Always Floating At Top for premium agency experience) */}
          <header className="sticky top-0 z-40 w-full px-4 py-4 lg:px-8 flex items-center justify-between bg-black/10 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Bloom Logo" 
                className="w-8 h-8 object-contain hover:rotate-12 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <span className="text-xl font-semibold tracking-tighter text-white">bloom</span>
            </div>

            {/* Quick Nav desktop links */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-white/60">
              <a href="#expertise" className="hover:text-white transition-colors">CAPABILITIES</a>
              <a href="#portfolio" className="hover:text-white transition-colors">PORTFOLIO</a>
              <a href="#interactive-lab" className="hover:text-white transition-colors">GROWTH LAB</a>
              <a href="#shadowing-lab" className="hover:text-white transition-colors">SHADOWING</a>
              <a href="#ai-coach" className="hover:text-white transition-colors font-semibold text-white">AI COACH</a>
              <a href="#vocab-notebook" className="hover:text-white transition-colors">NOTEBOOK</a>
              <a href="#philosophy" className="hover:text-white transition-colors">PHILOSOPHY</a>
              <a href="#pricing" className="hover:text-white transition-colors">SPONSORSHIP</a>
              <a href="#contact-faq" className="hover:text-white transition-colors">FAQ</a>
            </nav>

            <button 
              onClick={() => setMenuOpen(true)}
              className="px-5 py-2.5 rounded-full liquid-glass flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all text-xs font-medium text-white/90 cursor-pointer"
            >
              <Menu className="w-3.5 h-3.5" />
              <span>Menu</span>
            </button>
          </header>

          {/* ======================================= */}
          {/* SECTION 1: HERO LANDING EXPERIENCE       */}
          {/* ======================================= */}
          <section className="relative z-10 w-full min-h-[calc(100vh-5rem)] p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
            
            {/* Left Panel */}
            <div id="left-panel" className="relative w-full lg:w-[52%] rounded-[2rem] p-6 lg:p-10 flex flex-col justify-between overflow-hidden liquid-glass-strong min-h-[600px] lg:min-h-0">
              
              {/* Decorative tag */}
              <div className="z-10 flex items-center justify-between w-full">
                <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">01 // AI BOTANICAL AGENCY</span>
                <span className="text-[10px] font-mono text-white/30">Bloom Studio v0.92</span>
              </div>

              {/* Hero Center Content */}
              <div className="flex-1 flex flex-col justify-center items-center text-center py-12 z-10">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  className="mb-6"
                >
                  <img 
                    src="/logo.png" 
                    alt="Bloom Hero Logo" 
                    className="w-20 h-20 object-contain hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>

                <motion.h1 
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[2.6rem] sm:text-5xl lg:text-6xl font-medium tracking-[-0.05em] text-white leading-[1.1] max-w-lg mx-auto"
                >
                  Innovating the <br /> 
                  <span className="font-serif italic text-white/80">spirit of bloom AI</span>
                </motion.h1>

                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 1 }}
                  className="text-white/60 text-xs sm:text-sm max-w-sm mt-4 leading-relaxed"
                >
                  Co-create architectural flora, organic patterns, and generative 3D plant structures inside our liquid computing ecosystem.
                </motion.p>

                {/* Explore CTA Button - Scrolls down to sandbox */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="mt-8"
                >
                  <a 
                    href="#interactive-lab"
                    onClick={() => triggerNotification("Redirecting to parametric neural sandbox...")}
                    className="group px-7 py-3 rounded-full liquid-glass-strong flex items-center gap-4 text-white text-xs sm:text-sm font-medium hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                  >
                    <span>Launch Growth Lab</span>
                    <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform group-hover:translate-y-0.5">
                      <Download className="w-3.5 h-3.5 text-white" />
                    </span>
                  </a>
                </motion.div>

                {/* Three Pills */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 1.2 }}
                  className="flex flex-wrap justify-center gap-2 mt-8 max-w-md"
                >
                  {[
                    { id: "expertise", label: "Studio Capabilities" },
                    { id: "portfolio", label: "Artistic Gallery" },
                    { id: "interactive-lab", label: "Ecosystem Sandbox" }
                  ].map((pill) => (
                    <a
                      key={pill.id}
                      href={`#${pill.id}`}
                      onClick={() => {
                        triggerNotification(`Navigating to ${pill.label}...`);
                      }}
                      className="px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 active:scale-95 liquid-glass text-white/70 hover:text-white"
                    >
                      {pill.label}
                    </a>
                  ))}
                </motion.div>
              </div>

              {/* Bottom Quote & Author */}
              <div className="mt-8 border-t border-white/5 pt-6 flex flex-col items-center text-center z-10">
                <span className="text-[9px] tracking-[0.2em] uppercase text-white/45 font-medium">Visionary Design</span>
                
                <p className="text-sm lg:text-base text-white/80 leading-relaxed font-sans max-w-md mt-2">
                  "We <span className="font-serif italic text-white/95">imagined</span> a realm with <span className="font-serif italic text-white/95">no ending</span>."
                </p>

                <div className="flex items-center justify-center gap-4 mt-3.5 w-full max-w-xs">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/15" />
                  <span className="text-[9px] tracking-[0.25em] uppercase text-white/50 font-semibold whitespace-nowrap">Marcus Aurelio</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/15" />
                </div>
              </div>

            </div>

            {/* Right Panel */}
            <div id="right-panel" className="hidden lg:flex lg:w-[48%] flex-col justify-between gap-6">
              
              {/* Top Bar inside right panel */}
              <div className="flex items-center justify-between w-full">
                
                {/* Social Pill */}
                <div className="px-5 py-2.5 rounded-full liquid-glass flex items-center gap-4">
                  <a 
                    href="https://twitter.com" 
                    target="_blank" 
                    rel="noreferrer" 
                    onClick={(e) => { e.preventDefault(); triggerNotification("Opening Bloom Twitter archive..."); }}
                    className="text-white/70 hover:text-white hover:scale-110 transition-all"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                  </a>
                  <a 
                    href="https://linkedin.com" 
                    target="_blank" 
                    rel="noreferrer" 
                    onClick={(e) => { e.preventDefault(); triggerNotification("Connecting to Bloom LinkedIn..."); }}
                    className="text-white/70 hover:text-white hover:scale-110 transition-all"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                  </a>
                  <a 
                    href="https://instagram.com" 
                    target="_blank" 
                    rel="noreferrer" 
                    onClick={(e) => { e.preventDefault(); triggerNotification("Launching Instagram showcase..."); }}
                    className="text-white/70 hover:text-white hover:scale-110 transition-all"
                  >
                    <Instagram className="w-3.5 h-3.5" />
                  </a>
                  <div className="w-[1px] h-3.5 bg-white/15" />
                  <a 
                    href="#contact-faq"
                    onClick={() => triggerNotification("Redirecting to contacts.")}
                    className="hover:scale-105 active:scale-95 transition-transform"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-white/50 hover:text-white" />
                  </a>
                </div>

                {/* Account Ecosystem Button */}
                <button 
                  onClick={() => triggerNotification("Ecosystem sign-in currently protected by security protocol.")}
                  className="px-5 py-2.5 rounded-full liquid-glass flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all text-xs font-medium text-white/90"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white/70" />
                  <span>Ecosystem Account</span>
                </button>
              </div>

              {/* Middle: Community Card */}
              <div className="flex justify-start pl-6">
                <div className="w-64 p-5 rounded-2xl liquid-glass flex flex-col gap-2 hover:scale-105 transition-transform duration-500">
                  <h3 className="text-xs font-semibold text-white tracking-wide uppercase">Enter our ecosystem</h3>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Connect with digital botanists and design next-generation procedural gardens in unified grayscale clarity.
                  </p>
                </div>
              </div>

              {/* Bottom Feature Section container */}
              <div className="mt-auto rounded-[2.5rem] p-6 flex flex-col gap-5 liquid-glass">
                
                {/* Header label */}
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] tracking-wider uppercase text-white/40 font-medium">Bespoke Design Nodes</span>
                  <span className="text-[10px] text-white/30 font-mono">2026.06_V</span>
                </div>

                {/* Two Side-by-Side Cards */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Card 1: Processing */}
                  <a 
                    href="#interactive-lab"
                    onClick={() => triggerNotification("Loading procedural growth matrices...")}
                    className="p-5 rounded-3xl liquid-glass flex flex-col gap-3 text-left hover:scale-105 transition-transform duration-300 group relative overflow-hidden"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center transition-colors group-hover:bg-white/20">
                      <Sparkles className="w-4 h-4 text-white/80" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white">Processing Engine</h4>
                      <p className="text-[10px] text-white/50 leading-relaxed mt-1">Initiate procedural seeds and growth parameters.</p>
                    </div>
                  </a>

                  {/* Card 2: Growth Archive */}
                  <a 
                    href="#portfolio"
                    onClick={() => triggerNotification("Opening design portfolio archive...")}
                    className="p-5 rounded-3xl liquid-glass flex flex-col gap-3 text-left hover:scale-105 transition-transform duration-300 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center transition-colors group-hover:bg-white/20">
                      <ArrowRight className="w-4 h-4 text-white/80" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white">Growth Archive</h4>
                      <p className="text-[10px] text-white/50 leading-relaxed mt-1">Explore over 12,000 algorithmic specimens.</p>
                    </div>
                  </a>

                </div>

                {/* Bottom Card: Thumbnail, Sculpting, and Plus button */}
                <a 
                  href="#interactive-lab"
                  onClick={() => triggerNotification("Spatially loading advanced plant sculpting studio...")}
                  className="p-4 rounded-3xl liquid-glass flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300"
                >
                  <img 
                    src="/hero-flowers.png" 
                    alt="Advanced Plant Sculpting" 
                    className="w-24 h-16 rounded-xl object-cover shrink-0 select-none bg-zinc-900 border border-white/5"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">Advanced Plant Sculpting</h4>
                    <p className="text-[10px] text-white/50 truncate mt-1">Spatially engineered generative blooms in high fidelity.</p>
                  </div>
                  <div 
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 shrink-0 cursor-pointer"
                  >
                    <span className="text-white text-lg font-light leading-none">+</span>
                  </div>
                </a>

              </div>

            </div>

          </section>

          {/* ======================================= */}
          {/* SECTION 2: STUDIO EXPERTISE (SERVICES)  */}
          {/* ======================================= */}
          <Expertise />

          {/* ======================================= */}
          {/* SECTION 3: NEURAL PORTFOLIO GALLERY     */}
          {/* ======================================= */}
          <Portfolio onTriggerNotification={triggerNotification} />

          {/* ======================================= */}
          {/* SECTION 4: INTERACTIVE LANDING CANVASES */}
          {/* ======================================= */}
          <InteractiveLab onTriggerNotification={triggerNotification} />

          {/* ======================================= */}
          {/* SECTION 5: STUDIO METAPHYSICAL STORY   */}
          {/* ======================================= */}
          <Philosophy />

          {/* ======================================= */}
          {/* SECTION 6: SPONSORSHIPS & BRIEF CALCULATOR */}
          {/* ======================================= */}
          <Pricing onTriggerNotification={triggerNotification} />

          {/* ======================================= */}
          {/* SECTION 7: DETAILED COMPACT FAQS & FOOTER */}
          {/* ======================================= */}
          <Contact onTriggerNotification={triggerNotification} />
        </>
      )}



      {/* ======================================= */}
      {/* FULLSCREEN ECOSYSTEM NAVIGATION DRAWER   */}
      {/* ======================================= */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-lg"
          >
            {/* Close Button */}
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="text-center flex flex-col gap-8 max-w-md">
              <div className="flex justify-center mb-2">
                <img src="/logo.png" alt="Bloom Menu Logo" className="w-16 h-16 object-contain" />
              </div>

              <span className="text-xs font-mono uppercase tracking-widest text-white/40">Ecosystem Navigator</span>

              <nav className="flex flex-col gap-6 text-3xl font-medium tracking-tight">
                {[
                  { name: "Design Canvas", hash: "#expertise", note: "procedural studio workspace" },
                  { name: "Neural Registry", hash: "#portfolio", note: "specimen storage" },
                  { name: "Growth Sandbox", hash: "#interactive-lab", note: "interactive simulator" },
                  { name: "Shadowing Hub", hash: "#shadowing-lab", note: "YouTube accent shadowing" },
                  { name: "AI Coach", hash: "#ai-coach", note: "Llama3 conversational practice" },
                  { name: "Vocab Notebook", hash: "#vocab-notebook", note: "your personal notebook" },
                  { name: "Sponsorships", hash: "#pricing", note: "Ecosystem project calculations" }
                ].map((item, index) => (
                  <a
                    key={index}
                    href={item.hash}
                    onClick={() => {
                      triggerNotification(`Navigating to ${item.name}...`);
                      setMenuOpen(false);
                    }}
                    className="group flex flex-col items-center gap-1.5 hover:scale-105 transition-transform"
                  >
                    <span className="text-white group-hover:text-white/80 transition-colors">{item.name}</span>
                    <span className="text-xs font-mono text-white/45 uppercase tracking-wide">{item.note}</span>
                  </a>
                ))}
              </nav>

              <div className="h-[1px] w-32 bg-white/15 mx-auto my-4" />

              <div className="flex items-center justify-center gap-6">
                <a 
                  href="https://twitter.com" 
                  onClick={(e) => { e.preventDefault(); triggerNotification("Opening Twitter..."); }}
                  className="text-white/50 hover:text-white text-xs tracking-wider uppercase font-mono"
                >
                  Twitter
                </a>
                <a 
                  href="https://instagram.com" 
                  onClick={(e) => { e.preventDefault(); triggerNotification("Opening Instagram..."); }}
                  className="text-white/50 hover:text-white text-xs tracking-wider uppercase font-mono"
                >
                  Instagram
                </a>
                <a 
                  href="https://linkedin.com" 
                  onClick={(e) => { e.preventDefault(); triggerNotification("Opening LinkedIn..."); }}
                  className="text-white/50 hover:text-white text-xs tracking-wider uppercase font-mono"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
