import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  GitCommit, 
  HelpCircle, 
  Loader2, 
  Play, 
  RefreshCw, 
  Send, 
  Timer, 
  Award, 
  BookOpen,
  Zap, 
  Compass, 
  AlertCircle, 
  CheckCircle2, 
  Plus
} from "lucide-react";
import type { Lesson, SavedWord, UserProgress } from "./types";

interface WordGamesTabProps {
  selectedLesson: Lesson | null;
  savedVocab: SavedWord[];
  ollamaModel: string;
  userProgress: UserProgress;
}

export default function WordGamesTab({
  selectedLesson,
  savedVocab,
  ollamaModel,
  userProgress
}: WordGamesTabProps) {
  const [activeGame, setActiveGame] = useState<"tree" | "association">("tree");

  // ==========================================
  // WORD TREE GAME STATE
  // ==========================================
  const [treeTrunk, setTreeTrunk] = useState("Book");
  const [treeBranches, setTreeBranches] = useState<string[]>(["Author", "Page", "Words"]);
  const [treeInput, setTreeInput] = useState("");
  const [isTreeValidating, setIsTreeValidating] = useState(false);
  const [treeFeedback, setTreeFeedback] = useState<string | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);

  // Helper branch coordinates for drawing tree
  const branchCoords = [
    { top: "15%", left: "10%", transform: "rotate(-15deg)" },
    { top: "10%", left: "42%", transform: "rotate(0deg)" },
    { top: "15%", right: "10%", transform: "rotate(15deg)" },
    { top: "35%", left: "5%", transform: "rotate(-30deg)" },
    { top: "35%", right: "5%", transform: "rotate(30deg)" },
    { top: "60%", left: "8%", transform: "rotate(-10deg)" },
    { top: "70%", left: "42%", transform: "rotate(0deg)" },
    { top: "60%", right: "8%", transform: "rotate(10deg)" },
    { top: "25%", left: "25%", transform: "rotate(-20deg)" },
    { top: "25%", right: "25%", transform: "rotate(20deg)" },
    { top: "50%", left: "25%", transform: "rotate(-15deg)" },
    { top: "50%", right: "25%", transform: "rotate(15deg)" },
  ];

  const handleSelectRandomTrunk = () => {
    // 1. Try from saved vocab
    if (savedVocab.length > 0) {
      const randWord = savedVocab[Math.floor(Math.random() * savedVocab.length)].word;
      setTreeTrunk(randWord);
      setTreeBranches([]);
      setTreeFeedback(null);
      setTreeError(null);
      return;
    }
    // 2. Try from current lesson vocab
    if (selectedLesson && selectedLesson.vocab && selectedLesson.vocab.length > 0) {
      const randWord = selectedLesson.vocab[Math.floor(Math.random() * selectedLesson.vocab.length)].word;
      setTreeTrunk(randWord);
      setTreeBranches([]);
      setTreeFeedback(null);
      setTreeError(null);
      return;
    }
    // 3. Fallbacks
    const fallbacks = ["Time", "Money", "Conversation", "Friend", "Accurate", "Language", "Zebra", "Internet"];
    setTreeTrunk(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
    setTreeBranches([]);
    setTreeFeedback(null);
    setTreeError(null);
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const word = treeInput.trim().toLowerCase();
    if (!word) return;

    if (treeBranches.map(w => w.toLowerCase()).includes(word) || word === treeTrunk.toLowerCase()) {
      setTreeError(`"${treeInput}" is already on the tree!`);
      return;
    }

    if (treeBranches.length >= branchCoords.length) {
      setTreeError("Your tree is full of branches! Try resetting or choosing a new trunk.");
      return;
    }

    setIsTreeValidating(true);
    setTreeFeedback(null);
    setTreeError(null);

    try {
      const response = await fetch("/api/games/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameType: "tree",
          trunk: treeTrunk,
          word: treeInput.trim(),
          model: ollamaModel
        })
      });

      if (!response.ok) throw new Error("Validation API failed");
      const data = await response.json();

      if (data.valid) {
        setTreeBranches(prev => [...prev, treeInput.trim()]);
        setTreeFeedback(`✓ Related! ${data.explanation || ""}`);
        setTreeInput("");
      } else {
        setTreeError(`✗ Rejected: ${data.explanation || "Not close enough to the central word."}`);
      }
    } catch (err) {
      console.error("Tree word validation error:", err);
      // Fallback
      setTreeBranches(prev => [...prev, treeInput.trim()]);
      setTreeFeedback(`✓ Added (offline fallback connection accepted)`);
      setTreeInput("");
    } finally {
      setIsTreeValidating(false);
    }
  };

  // ==========================================
  // WORD ASSOCIATION GAME STATE
  // ==========================================
  const [isAssocActive, setIsAssocActive] = useState(false);
  const [assocStartWord, setAssocStartWord] = useState("Traffic Light");
  const [assocChain, setAssocChain] = useState<string[]>([]);
  const [assocInput, setAssocInput] = useState("");
  const [isAssocValidating, setIsAssocValidating] = useState(false);
  const [assocFeedback, setAssocFeedback] = useState<string | null>(null);
  const [assocError, setAssocError] = useState<string | null>(null);
  const [timerCount, setTimerCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const timerRef = useRef<any>(null);
  const chainEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAssocActive && !showSummary) {
      timerRef.current = setInterval(() => {
        setTimerCount(c => c + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAssocActive, showSummary]);

  useEffect(() => {
    if (chainEndRef.current) {
      chainEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [assocChain]);

  const handleStartAssocGame = () => {
    let word = "Traffic Light";
    if (selectedLesson && selectedLesson.vocab && selectedLesson.vocab.length > 0) {
      word = selectedLesson.vocab[Math.floor(Math.random() * selectedLesson.vocab.length)].word;
    } else if (savedVocab.length > 0) {
      word = savedVocab[Math.floor(Math.random() * savedVocab.length)].word;
    }
    
    setAssocStartWord(word);
    setAssocChain([word]);
    setTimerCount(0);
    setIsAssocActive(true);
    setShowSummary(false);
    setAssocFeedback(null);
    setAssocError(null);
    setAssocInput("");
  };

  const handleAddAssociation = async (e: React.FormEvent) => {
    e.preventDefault();
    const word = assocInput.trim().toLowerCase();
    if (!word) return;

    const previousWord = assocChain[assocChain.length - 1];
    if (assocChain.map(w => w.toLowerCase()).includes(word)) {
      setAssocError(`"${assocInput}" is already in the chain!`);
      return;
    }

    setIsAssocValidating(true);
    setAssocFeedback(null);
    setAssocError(null);

    try {
      const response = await fetch("/api/games/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameType: "association",
          previousWord,
          word: assocInput.trim(),
          model: ollamaModel
        })
      });

      if (!response.ok) throw new Error("Validation API failed");
      const data = await response.json();

      if (data.valid) {
        const newChain = [...assocChain, assocInput.trim()];
        setAssocChain(newChain);
        setAssocInput("");
        setAssocFeedback(`✓ Associated! ${data.explanation || ""}`);
        
        if (newChain.length >= 10) {
          setShowSummary(true);
          setIsAssocActive(false);
        }
      } else {
        setAssocError(`✗ Rejected: ${data.explanation || "Not logically connected to the previous word."}`);
      }
    } catch (err) {
      console.error("Association validation error:", err);
      // Fallback
      const newChain = [...assocChain, assocInput.trim()];
      setAssocChain(newChain);
      setAssocInput("");
      setAssocFeedback(`✓ Added (offline fallback connection accepted)`);
      if (newChain.length >= 10) {
        setShowSummary(true);
        setIsAssocActive(false);
      }
    } finally {
      setIsAssocValidating(false);
    }
  };

  const getWiFiScore = (seconds: number) => {
    if (seconds <= 20) return { speed: "5G Fiber Speed!", desc: "Hyper-fast connection! Your brain and mouth are perfectly connected.", color: "text-green-400" };
    if (seconds <= 45) return { speed: "4G Broadband Speed", desc: "Good connection. Your vocabulary recalls naturally.", color: "text-blue-400" };
    return { speed: "Dial-up Connection", desc: "A bit slow. Keep playing to train your brain's Wi-Fi connection!", color: "text-yellow-400" };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
      {/* Left Column: Subtabs & Game descriptions */}
      <div className="lg:col-span-4 rounded-[2.5rem] liquid-glass p-6 lg:p-8 flex flex-col gap-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <h3 className="text-sm font-semibold tracking-wide text-white/90 uppercase">Brain Exercises</h3>
          <span className="text-[10px] font-mono text-white/30 uppercase">Interactive Games</span>
        </div>

        {/* Game selectors */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setActiveGame("tree")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
              activeGame === "tree" 
                ? "bg-white text-black border-white shadow-xl scale-[1.02]" 
                : "bg-black/40 hover:bg-black/60 border-white/5 text-white"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold uppercase tracking-wider">Word Tree Game</span>
              <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded ${
                activeGame === "tree" ? "bg-black/10 text-black" : "bg-white/10 text-white"
              }`}>Active</span>
            </div>
            <p className={`text-[10px] leading-relaxed ${activeGame === "tree" ? "text-black/70" : "text-white/40"}`}>
              Select a trunk word and type branches of related words to build your visual semantic tree. Trains category associations.
            </p>
          </button>

          <button
            onClick={() => setActiveGame("association")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
              activeGame === "association" 
                ? "bg-white text-black border-white shadow-xl scale-[1.02]" 
                : "bg-black/40 hover:bg-black/60 border-white/5 text-white"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold uppercase tracking-wider">Word Association</span>
              <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded ${
                activeGame === "association" ? "bg-black/10 text-black" : "bg-white/10 text-white"
              }`}>Challenge</span>
            </div>
            <p className={`text-[10px] leading-relaxed ${activeGame === "association" ? "text-black/70" : "text-white/40"}`}>
              Connect 10 words in a row by typing rapid associations. Beat the clock to score a 5G Brain Wi-Fi speed!
            </p>
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-black/45 border border-white/5 flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-[10px] font-mono text-white/40 uppercase">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Why play word games?</span>
          </div>
          <p className="text-[10px] text-white/60 leading-relaxed">
            "Your brain has Wi-Fi. If you study English but the words never come out in a real conversation, it's a connection problem. Playing word games connects your brain and mouth for spontaneous speech."
          </p>
        </div>
      </div>

      {/* Right Column: Game Workspace */}
      <div className="lg:col-span-8 rounded-[2.5rem] liquid-glass p-6 lg:p-8 flex flex-col gap-6 min-h-[500px]">
        {activeGame === "tree" ? (
          // ==========================================
          // WORD TREE WORKSPACE
          // ==========================================
          <div className="flex flex-col gap-6 h-full justify-between">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[9px] font-bold">
                  EXERCISE 2A
                </span>
                <span className="text-xs font-bold text-white tracking-wide">Grow Your Vocabulary Tree</span>
              </div>
              <button
                onClick={handleSelectRandomTrunk}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-semibold text-white/70 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                title="Choose random central word"
              >
                <RefreshCw className="w-3 h-3" />
                Change Trunk
              </button>
            </div>

            {/* Tree Graphical Canvas Area */}
            <div className="relative w-full h-[320px] rounded-3xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center p-4">
              {/* Backing tree trunk line SVG drawing */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M 50 90 L 50 55" stroke="white" strokeWidth="4" strokeLinecap="round" />
                <path d="M 50 55 Q 35 45 20 30" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M 50 55 Q 65 45 80 30" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M 50 65 Q 40 60 30 50" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M 50 65 Q 60 60 70 50" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M 50 75 Q 45 70 38 65" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <path d="M 50 75 Q 55 70 62 65" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </svg>

              {/* Central Trunk Word Node */}
              <div className="absolute z-10 bottom-8 left-1/2 -translate-x-1/2 bg-white text-black rounded-2xl py-3 px-6 font-bold text-sm border-2 border-white/20 shadow-2xl shadow-white/5 animate-pulse text-center">
                <span className="text-[8px] font-mono uppercase tracking-widest text-black/50 block mb-0.5">Trunk</span>
                {treeTrunk}
              </div>

              {/* Dynamic Branch Leaves */}
              <AnimatePresence>
                {treeBranches.map((word, idx) => {
                  const coords = branchCoords[idx % branchCoords.length];
                  return (
                    <motion.div
                      key={word}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 rounded-xl px-3 py-1.5 text-xs text-white/95 cursor-default transition-all shadow"
                      style={{
                        top: coords.top,
                        left: coords.left,
                        right: coords.right,
                        transform: coords.transform
                      }}
                    >
                      <span className="inline-block mr-1">🍂</span>
                      {word}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {treeBranches.length === 0 && (
                <div className="text-[10px] text-white/30 text-center max-w-[240px] absolute top-8">
                  Type words related to <strong className="text-white">"{treeTrunk}"</strong> in the input below to sprout branches!
                </div>
              )}
            </div>

            {/* User Input Form */}
            <div className="flex flex-col gap-3">
              <form onSubmit={handleAddBranch} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Sprout branch word related to "${treeTrunk}"...`}
                  value={treeInput}
                  onChange={(e) => setTreeInput(e.target.value)}
                  disabled={isTreeValidating}
                  className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                />
                <button
                  type="submit"
                  disabled={isTreeValidating || !treeInput.trim()}
                  className="px-6 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-semibold hover:scale-[1.03] active:scale-95 disabled:scale-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isTreeValidating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Sprout</span>
                </button>
              </form>

              {/* Status and Feedback messages */}
              <div className="h-6">
                {treeFeedback && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-green-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    <span>{treeFeedback}</span>
                  </motion.div>
                )}
                {treeError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>{treeError}</span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // ==========================================
          // WORD ASSOCIATION CHALLENGE WORKSPACE
          // ==========================================
          <div className="flex flex-col gap-6 h-full justify-between">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[9px] font-bold">
                  EXERCISE 2B
                </span>
                <span className="text-xs font-bold text-white tracking-wide">Word Association Chain</span>
              </div>
              
              {isAssocActive && (
                <div className="flex items-center gap-1.5 text-xs font-mono bg-white/10 px-3 py-1 rounded-xl text-white">
                  <Timer className="w-3.5 h-3.5 text-white/50" />
                  <span>{timerCount}s</span>
                </div>
              )}
            </div>

            {!isAssocActive && !showSummary ? (
              // Game Start Panel
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-12">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <GitCommit className="w-8 h-8 text-white/60" />
                </div>
                <div className="max-w-[320px] flex flex-col gap-1.5">
                  <h4 className="text-sm font-semibold text-white">Train Brain-to-Mouth Speed</h4>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Build a chain of 10 consecutive associated words. The game starts with a keyword and validates each new word against the preceding link using AI.
                  </p>
                </div>
                <button
                  onClick={handleStartAssocGame}
                  className="px-6 py-3 rounded-full bg-white text-black hover:bg-white/90 text-xs font-semibold hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg mt-2"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Start Association Game</span>
                </button>
              </div>
            ) : showSummary ? (
              // Game Complete Summary Panel
              (() => {
                const wifi = getWiFiScore(timerCount);
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-6"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center animate-bounce">
                      <Award className="w-8 h-8 text-green-400" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">Connection Score</span>
                      <h4 className={`text-2xl font-bold font-mono tracking-wide ${wifi.color}`}>
                        {wifi.speed}
                      </h4>
                      <p className="text-xs text-white/70 max-w-[280px] mx-auto leading-relaxed mt-1">
                        {wifi.desc}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 bg-black/45 p-4 px-8 rounded-2xl border border-white/5 text-center min-w-[240px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-mono text-white/40 uppercase">Time Record</span>
                        <span className="text-xl font-bold font-mono text-white">{timerCount}s</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-mono text-white/40 uppercase">Chain Length</span>
                        <span className="text-xl font-bold font-mono text-white">{assocChain.length} links</span>
                      </div>
                    </div>

                    {/* Show Chain Preview */}
                    <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg bg-black/20 p-4 rounded-2xl border border-white/5">
                      {assocChain.map((word, idx) => (
                        <React.Fragment key={idx}>
                          <span className="text-xs text-white/95 px-2.5 py-1 rounded-xl bg-white/5 border border-white/5">{word}</span>
                          {idx < assocChain.length - 1 && <span className="text-[10px] opacity-40">➔</span>}
                        </React.Fragment>
                      ))}
                    </div>

                    <button
                      onClick={handleStartAssocGame}
                      className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-all hover:scale-103 active:scale-95 cursor-pointer mt-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Play Again</span>
                    </button>
                  </motion.div>
                );
              })()
            ) : (
              // Active Game Panel
              <div className="flex-1 flex flex-col justify-between gap-6">
                {/* Horizontal Scrolling Association Rail */}
                <div className="relative w-full h-[180px] bg-black/40 border border-white/5 rounded-3xl p-4 overflow-x-auto flex items-center gap-3 pr-8 no-scrollbar">
                  {assocChain.map((word, idx) => {
                    const isLast = idx === assocChain.length - 1;
                    return (
                      <div key={idx} className="flex items-center gap-3 shrink-0">
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`flex flex-col items-center justify-center px-4 py-3 rounded-2xl border text-center relative ${
                            isLast
                              ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.15)] scale-[1.03] animate-pulse"
                              : "bg-white/5 border-white/5 text-white/70"
                          }`}
                        >
                          <span className="text-[8px] font-mono uppercase tracking-widest opacity-40 block mb-0.5">Link {idx + 1}</span>
                          <span className="text-xs font-bold">{word}</span>
                        </motion.div>
                        {!isLast && (
                          <motion.div 
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            className="text-white/20 font-bold shrink-0 text-sm"
                          >
                            ➔
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={chainEndRef} />
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[9px] font-mono text-white/40 uppercase">
                    <span>Chain Connection Progress</span>
                    <span>{assocChain.length}/10 words</span>
                  </div>
                  <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      className="h-full bg-white" 
                      animate={{ width: `${(assocChain.length / 10) * 100}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </div>

                {/* User Input Form */}
                <div className="flex flex-col gap-3">
                  <form onSubmit={handleAddAssociation} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Type association link for "${assocChain[assocChain.length - 1]}"...`}
                      value={assocInput}
                      onChange={(e) => setAssocInput(e.target.value)}
                      disabled={isAssocValidating}
                      className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                    />
                    <button
                      type="submit"
                      disabled={isAssocValidating || !assocInput.trim()}
                      className="px-6 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-semibold hover:scale-[1.03] active:scale-95 disabled:scale-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {isAssocValidating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Link</span>
                    </button>
                  </form>

                  {/* Status and Feedback messages */}
                  <div className="h-6">
                    {assocFeedback && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-green-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        <span>{assocFeedback}</span>
                      </motion.div>
                    )}
                    {assocError && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        <span>{assocError}</span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
