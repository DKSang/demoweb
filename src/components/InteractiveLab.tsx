import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wand2, RotateCcw, Check, Sparkles, Sliders, ChevronRight } from "lucide-react";

export default function InteractiveLab({ onTriggerNotification }: { onTriggerNotification: (msg: string) => void }) {
  // Simulator States
  const [isSimulating, setIsSimulating] = useState(true);
  const [simStep, setSimStep] = useState<"idle" | "neural" | "growing" | "rendering" | "complete">("complete");
  const [simProgress, setSimProgress] = useState(100);
  const [growthFactor, setGrowthFactor] = useState(0.85);
  const [branchingCount, setBranchingCount] = useState(4);
  const [plantType, setPlantType] = useState<"Orchidaceous" | "Arboreal" | "Fern-Morph" | "Spike-Filigree">("Fern-Morph");
  const [logMessages, setLogMessages] = useState<string[]>([
    "[init] Initializing vegetative neural seed...",
    "[model] Parsing genetic stem architecture...",
    "[system] Specimen fully calculated."
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Log message feeds
  useEffect(() => {
    if (simStep === "neural") {
      setLogMessages(["[init] Initializing vegetative neural seed...", "[model] Parsing genetic stem architecture...", "[opt] Maximizing micro-leaf density..."]);
    } else if (simStep === "growing") {
      setLogMessages(prev => [...prev, "[growth] Simulating sap flow...", "[growth] Calculating phototropism orientation..."]);
    } else if (simStep === "rendering") {
      setLogMessages(prev => [...prev, "[render] Generating 3D depth buffers...", "[render] Applying liquid glass surface specular..."]);
    } else if (simStep === "complete") {
      setLogMessages(prev => [...prev, "[system] Sculpture completely finalized.", "[system] Ready for neural deployment."]);
    }
  }, [simStep]);

  // Simulate progress
  useEffect(() => {
    let interval: any;
    if (isSimulating && simProgress < 100) {
      interval = setInterval(() => {
        setSimProgress(prev => {
          const next = prev + 2.5;
          if (next >= 100) {
            clearInterval(interval);
            setSimStep("complete");
            return 100;
          }
          if (next > 75) {
            setSimStep("rendering");
          } else if (next > 30) {
            setSimStep("growing");
          } else if (next > 5) {
            setSimStep("neural");
          }
          return next;
        });
      }, 40);
    }
    return () => clearInterval(interval);
  }, [isSimulating, simProgress]);

  // Draw recursive branch
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Draw background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#090909";
    ctx.fillRect(0, 0, width, height);

    // Subtle grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Dynamic recursive plant builder
    const drawBranch = (
      startX: number,
      startY: number,
      len: number,
      angle: number,
      branchWidth: number,
      depth: number
    ) => {
      const progressScale = isSimulating ? simProgress / 100 : 1;
      const actualLen = len * progressScale * growthFactor;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      
      const endX = startX + Math.cos(angle) * actualLen;
      const endY = startY + Math.sin(angle) * actualLen;

      const cpX1 = startX + Math.cos(angle - 0.1) * (actualLen / 2);
      const cpY1 = startY + Math.sin(angle - 0.1) * (actualLen / 2);
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0.15, 0.95 - depth * 0.15)})`;
      ctx.lineWidth = Math.max(1, branchWidth * (isSimulating ? simProgress / 100 : 1));
      ctx.lineCap = "round";
      
      ctx.bezierCurveTo(cpX1, cpY1, cpX1, cpY1, endX, endY);
      ctx.stroke();

      if (depth > 1) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, 0.65 - depth * 0.1)})`;
        ctx.ellipse(endX, endY, 6 - depth * 0.5, 3 - depth * 0.5, angle + Math.PI / 4, 0, 2 * Math.PI);
        ctx.fill();
      }

      if (depth < branchingCount) {
        drawBranch(
          endX,
          endY,
          len * 0.72,
          angle - 0.38 - (plantType === "Orchidaceous" ? 0.2 : 0),
          branchWidth * 0.65,
          depth + 1
        );
        drawBranch(
          endX,
          endY,
          len * 0.72,
          angle + 0.38 + (plantType === "Spike-Filigree" ? 0.2 : 0),
          branchWidth * 0.65,
          depth + 1
        );
      }
    };

    drawBranch(width / 2, height - 20, height * 0.28, -Math.PI / 2, 5, 1);

    // Seed particle trails
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    for (let i = 0; i < 20; i++) {
      const px = (Math.sin(i * 37.1) * 0.5 + 0.5) * width;
      const py = (Math.cos(i * 51.4) * 0.5 + 0.5) * (height - 60) + 20;
      ctx.beginPath();
      ctx.arc(px, py, (i % 3 === 0) ? 1.5 : 1, 0, 2 * Math.PI);
      ctx.fill();
    }

  }, [simProgress, isSimulating, growthFactor, branchingCount, plantType]);

  const restartSimulation = () => {
    setIsSimulating(true);
    setSimProgress(0);
    setSimStep("neural");
    onTriggerNotification(`Recalculating algorithmic stem matrix: ${plantType}`);
  };

  return (
    <section id="interactive-lab" className="py-24 px-4 lg:px-8 relative z-10 max-w-7xl mx-auto border-t border-white/5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side: Title & Interactive Console Description */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <span className="text-xs tracking-[0.3em] uppercase text-white/50 font-mono block mb-3">Live Interactive Sandbox</span>
            <h2 className="text-4xl lg:text-5xl font-medium tracking-[-0.04em] text-white">
              The <span className="font-serif italic text-white/85">neural</span> growth engine.
            </h2>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed mt-6">
              Customize real-time vegetative math parameters on our responsive render canvas. Use standard controls to shift recursive depths, stem curvature scale, and organic species structures instantly.
            </p>
          </div>

          {/* Parameters sliders directly on landing page */}
          <div className="flex flex-col gap-6 mt-10 p-6 rounded-[2rem] liquid-glass">
            
            {/* Specimen selection list */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-mono tracking-wider uppercase text-white/40">Select Specimen Archetype</span>
              <div className="grid grid-cols-2 gap-2">
                {(["Fern-Morph", "Orchidaceous", "Arboreal", "Spike-Filigree"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setPlantType(type);
                      setSimProgress(0);
                      setSimStep("neural");
                    }}
                    className={`px-3 py-2 rounded-xl text-[10px] font-mono transition-all text-center border ${
                      plantType === type 
                      ? "bg-white/10 border-white/20 text-white" 
                      : "bg-transparent border-white/5 text-white/40 hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider 1: Curvature */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[10px] font-mono tracking-wider text-white/40">
                <span>Stem Curvature</span>
                <span>{(growthFactor * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="1.2" 
                step="0.05"
                value={growthFactor} 
                onChange={(e) => {
                  setGrowthFactor(parseFloat(e.target.value));
                  onTriggerNotification(`Set stem curvature scaling to ${Math.round(parseFloat(e.target.value) * 100)}%`);
                }}
                className="w-full accent-white h-1 rounded-lg cursor-pointer bg-white/10"
              />
            </div>

            {/* Slider 2: Recursion */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[10px] font-mono tracking-wider text-white/40">
                <span>Branching Recursions</span>
                <span>{branchingCount} depth</span>
              </div>
              <input 
                type="range" 
                min="2" 
                max="6" 
                step="1"
                value={branchingCount} 
                onChange={(e) => {
                  setBranchingCount(parseInt(e.target.value));
                  onTriggerNotification(`Branch recursion generation depth set to ${e.target.value}`);
                }}
                className="w-full accent-white h-1 rounded-lg cursor-pointer bg-white/10"
              />
            </div>

          </div>
        </div>

        {/* Right Side: Heavy Liquid-glass Interactive Canvas Panel */}
        <div className="lg:col-span-7 rounded-[2.5rem] liquid-glass p-6 lg:p-8 flex flex-col justify-between min-h-[460px]">
          
          {/* Top Panel Specs */}
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Wand2 className={`w-3.5 h-3.5 text-white/80 ${simProgress < 100 ? "animate-spin" : ""}`} />
              <span className="text-xs font-mono tracking-widest text-white/80 uppercase">Engine Render Feed</span>
            </div>
            <span className="text-[10px] font-mono text-white/40 bg-white/5 px-2.5 py-1 rounded-md">
              {simStep.toUpperCase()}
            </span>
          </div>

          {/* Interactive Canvas Output */}
          <div className="relative flex-1 bg-zinc-950/80 rounded-2xl overflow-hidden min-h-[280px] flex items-center justify-center border border-white/5">
            <canvas 
              ref={canvasRef} 
              className="w-full h-full object-cover block"
            />
            
            {/* Float data overlay */}
            <div className="absolute top-4 left-4 px-3.5 py-2 rounded-xl bg-black/75 backdrop-blur-md border border-white/5 pointer-events-none flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-white/90">Specimen: {plantType}</span>
              <span className="text-[9px] font-mono text-white/50">Generation: {branchingCount}D</span>
            </div>
          </div>

          {/* Simulation Status Bars */}
          <div className="mt-6">
            <div className="flex justify-between items-center text-[11px] font-mono text-white/50 mb-2">
              <span>Optimizing Algorithmic Mesh Structure</span>
              <span>{Math.round(simProgress)}%</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-100 ease-out"
                style={{ width: `${simProgress}%` }}
              />
            </div>
          </div>

          {/* Terminal Console Logs */}
          <div className="mt-4 p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[9px] text-white/40 leading-relaxed h-16 overflow-y-auto">
            {logMessages.map((msg, i) => (
              <div key={i} className="truncate flex items-center gap-1.5">
                <ChevronRight className="w-2.5 h-2.5 text-white/20 shrink-0" />
                <span>{msg}</span>
              </div>
            ))}
          </div>

          {/* Buttons Row */}
          <div className="flex items-center gap-3 mt-6 border-t border-white/5 pt-4">
            <button 
              onClick={restartSimulation}
              className="flex-1 py-2.5 rounded-full liquid-glass flex items-center justify-center gap-2 text-xs font-semibold hover:scale-105 active:scale-95 transition-all text-white/95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white/70" />
              <span>Reset & Recalculate</span>
            </button>
            <button 
              onClick={() => onTriggerNotification("Downloading 3D organic specimen vector package.")}
              className="flex-1 py-2.5 rounded-full bg-white text-black hover:bg-white/90 flex items-center justify-center gap-2 text-xs font-semibold hover:scale-105 active:scale-95 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Export Spatial Mesh</span>
            </button>
          </div>

        </div>

      </div>
    </section>
  );
}
