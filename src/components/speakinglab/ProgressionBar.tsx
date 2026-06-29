import React from "react";
import { motion } from "motion/react";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import type { UserProgress, Lesson } from "./types";

interface ProgressionBarProps {
  userProgress: UserProgress;
  selectedProgressDay: number;
  setSelectedProgressDay: (day: number) => void;
  selectedLesson: Lesson | null;
  changeTab: (tab: "shadow" | "coach" | "vocab" | "games") => void;
  setVocabSubTab: (sub: "saved" | "foundational" | "review" | "add") => void;
  handleResetProgress: () => void;
}

export default function ProgressionBar({
  userProgress,
  selectedProgressDay,
  setSelectedProgressDay,
  selectedLesson,
  changeTab,
  setVocabSubTab,
  handleResetProgress
}: ProgressionBarProps) {

  const getTaskCompleted = (taskName: "listen" | "shadow" | "speak" | "game") => {
    if (!userProgress) return false;
    if (selectedProgressDay < userProgress.currentDay) {
      const completed = userProgress.completedDays?.[selectedProgressDay];
      if (completed) {
        return completed[taskName] ?? (completed as any)["quiz"] ?? true;
      }
      return true;
    }
    return userProgress.todayTasks?.[taskName] ?? false;
  };

  return (
    <div className="w-full rounded-[2rem] liquid-glass p-6 mt-6 mb-6 flex flex-col gap-5 border border-white/5">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col gap-2 max-w-xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-white text-black font-semibold text-[10px] tracking-wider uppercase font-mono shadow-sm">
              DAY {selectedProgressDay} {selectedProgressDay < userProgress.currentDay ? "REVIEW" : "ACTIVE"}
            </span>
            <span className="text-white font-medium text-base tracking-tight leading-none font-sans">
              Active Lesson: <span className="font-serif italic text-white/95 font-medium">{selectedLesson?.title.replace("🇬🇧", "").trim() || "Loading..."}</span>
            </span>
          </div>
          <p className="text-white/40 text-xs font-sans tracking-wide">
            {selectedProgressDay < userProgress.currentDay 
              ? "You are reviewing a completed day's lesson. Task completion is locked."
              : "Complete the 4 tasks below to unlock the next day's lesson."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Task 1: Listen */}
          <button
            onClick={() => changeTab("shadow")}
            className="group relative flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 hover:border-white/10 transition-all cursor-pointer text-left"
          >
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
              getTaskCompleted("listen") 
                ? "bg-green-500 border-green-500 text-black" 
                : "border-white/20 text-transparent"
            }`}>
              {getTaskCompleted("listen") && <Check className="w-2.5 h-2.5" />}
            </div>
            <span className={`text-xs ${getTaskCompleted("listen") ? "text-green-300 font-semibold" : "text-white/70"}`}>1. Listen</span>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 rounded-xl bg-zinc-950/95 border border-white/10 text-[10px] leading-relaxed text-white/80 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-2xl z-30 text-center font-sans">
              Play any timed subtitle segment in the YouTube Shadowing player to complete.
            </div>
          </button>

          {/* Task 2: Shadow */}
          <button
            onClick={() => changeTab("shadow")}
            className="group relative flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 hover:border-white/10 transition-all cursor-pointer text-left"
          >
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
              getTaskCompleted("shadow") 
                ? "bg-green-500 border-green-500 text-black" 
                : "border-white/20 text-transparent"
            }`}>
              {getTaskCompleted("shadow") && <Check className="w-2.5 h-2.5" />}
            </div>
            <span className={`text-xs ${getTaskCompleted("shadow") ? "text-green-300 font-semibold" : "text-white/70"}`}>2. Shadow</span>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 rounded-xl bg-zinc-950/95 border border-white/10 text-[10px] leading-relaxed text-white/80 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-2xl z-30 text-center font-sans font-normal">
              Shadow any segment successfully and score <strong className="text-green-300 font-semibold">&gt; 80%</strong> pronunciation accuracy.
            </div>
          </button>

          {/* Task 3: Speak */}
          <button
            onClick={() => changeTab("coach")}
            className="group relative flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 hover:border-white/10 transition-all cursor-pointer text-left"
          >
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
              getTaskCompleted("speak") 
                ? "bg-green-500 border-green-500 text-black" 
                : "border-white/20 text-transparent"
            }`}>
              {getTaskCompleted("speak") && <Check className="w-2.5 h-2.5" />}
            </div>
            <span className={`text-xs ${getTaskCompleted("speak") ? "text-green-300 font-semibold" : "text-white/70"}`}>3. Speak</span>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 rounded-xl bg-zinc-950/95 border border-white/10 text-[10px] leading-relaxed text-white/80 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-2xl z-30 text-center font-sans">
              Have a short conversation with the AI coach regarding the video context.
            </div>
          </button>

          {/* Task 4: Word Game */}
          <button
            onClick={() => {
              changeTab("games");
            }}
            className="group relative flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 hover:border-white/10 transition-all cursor-pointer text-left"
          >
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
              getTaskCompleted("game") 
                ? "bg-green-500 border-green-500 text-black" 
                : "border-white/20 text-transparent"
            }`}>
              {getTaskCompleted("game") && <Check className="w-2.5 h-2.5" />}
            </div>
            <span className={`text-xs ${getTaskCompleted("game") ? "text-green-300 font-semibold" : "text-white/70"}`}>4. Word Game</span>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 rounded-xl bg-zinc-950/95 border border-white/10 text-[10px] leading-relaxed text-white/80 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-2xl z-30 text-center font-sans font-normal">
              Play Word Tree or Word Association games to connect your brain and mouth.
            </div>
          </button>

          {/* Reset progress */}
          <button
            onClick={handleResetProgress}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/40 hover:text-white transition-all cursor-pointer font-sans font-semibold"
            title="Reset Progression"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Historical Day Switcher List */}
      {userProgress.currentDay > 1 && (
        <div className="border-t border-white/5 pt-4 flex flex-col gap-2">
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block mb-1">Jump to Unlocked Day:</span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
            {Array.from({ length: userProgress.currentDay }).map((_, idx) => {
              const dNum = idx + 1;
              const isSelected = selectedProgressDay === dNum;
              return (
                <button
                  key={dNum}
                  onClick={() => {
                    setSelectedProgressDay(dNum);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-white text-black border-white"
                      : "bg-white/5 hover:bg-white/10 border-white/5 text-white/70 hover:text-white"
                  }`}
                >
                  Day {dNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
