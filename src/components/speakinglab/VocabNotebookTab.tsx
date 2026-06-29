import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Lesson, VocabWord, SavedWord, UserProgress } from "./types";
import { BookOpen, Plus, Trash2, Sparkles, Calendar, Check } from "lucide-react";

// Streak Sprout Visualization Component
const StreakSprout = ({ streak }: { streak: number }) => {
  const stage = streak === 0 ? "seed" : streak <= 2 ? "sprout" : streak <= 4 ? "plant" : "flower";
  
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <svg width="100" height="120" viewBox="0 0 120 150" className="text-white fill-none stroke-white" strokeWidth="2.5" strokeLinecap="round">
        {/* Pot */}
        <path d="M 40 120 L 80 120 L 85 145 L 35 145 Z" className="stroke-white/30 fill-white/5" />
        <line x1="30" y1="120" x2="90" y2="120" className="stroke-white/30" />
        
        {/* Seed Stage */}
        {stage === "seed" && (
          <circle cx="60" cy="112" r="4.5" className="fill-white/30 stroke-none animate-pulse" />
        )}
        
        {/* Sprout Stage */}
        {(stage === "sprout" || stage === "plant" || stage === "flower") && (
          <>
            <path d="M 60 120 Q 60 90 55 75" className="stroke-white/70" strokeWidth="3" />
            <path d="M 58 100 Q 40 95 45 85 Q 55 90 58 100" className="fill-white/10 stroke-white/60" />
            <path d="M 59 95 Q 75 90 70 80 Q 62 85 59 95" className="fill-white/10 stroke-white/60" />
          </>
        )}

        {/* Plant Stage */}
        {(stage === "plant" || stage === "flower") && (
          <>
            <path d="M 55 75 Q 50 50 60 35" className="stroke-white/90" />
            <path d="M 53 70 Q 35 60 42 50 Q 50 60 53 70" className="fill-white/20 stroke-white/80" />
            <path d="M 54 62 Q 70 52 68 42 Q 58 50 54 62" className="fill-white/20 stroke-white/80" />
          </>
        )}

        {/* Flower Stage */}
        {stage === "flower" && (
          <>
            <circle cx="60" cy="35" r="8" className="fill-white/10 stroke-white animate-pulse" />
            <path d="M 60 27 Q 60 15 65 25 Z" className="fill-white/20 stroke-white/90" />
            <path d="M 60 43 Q 60 55 55 45 Z" className="fill-white/20 stroke-white/90" />
            <path d="M 68 35 Q 80 35 70 40 Z" className="fill-white/20 stroke-white/90" />
            <path d="M 52 35 Q 40 35 50 30 Z" className="fill-white/20 stroke-white/90" />
          </>
        )}
      </svg>
      <div className="text-center">
        <span className="text-[9px] font-mono uppercase tracking-widest text-white/40 block">Botanical Growth Stage</span>
        <span className="text-xs font-semibold text-white mt-0.5 block">
          {stage === "seed" ? "Dormant Seed" :
           stage === "sprout" ? "Fresh Sprout" :
           stage === "plant" ? "Growing Leafy Stem" : "Blossoming Bloom!"}
        </span>
      </div>
    </div>
  );
};

interface VocabNotebookTabProps {
  selectedLesson: Lesson | null;
  selectedProgressDay: number;
  setSelectedProgressDay: (day: number) => void;
  savedVocab: SavedWord[];
  commonVocab: VocabWord[];
  streakDays: string[];
  userProgress: UserProgress;
  lessonsList: Lesson[];
  hasShadowedToday: boolean;
  hasChattedToday: boolean;
  openRouterModel: string;
  handleSaveWord: (word: VocabWord) => void;
  handleDeleteWord: (word: string) => void;
  updateProgressTask: (task: "listen" | "shadow" | "speak" | "game", completed: boolean) => void;
  vocabSubTab: "saved" | "foundational" | "review" | "add";
  setVocabSubTab: (sub: "saved" | "foundational" | "review" | "add") => void;
}

// Timezone-safe local date string generator (YYYY-MM-DD)
const getLocalDateString = (d: Date = new Date()) => {
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
};

const getConsecutiveStreak = (days: string[]): number => {
  if (days.length === 0) return 0;
  
  const sorted = [...days]
    .map(d => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
    .sort((a, b) => b - a);
    
  const oneDayMs = 24 * 60 * 60 * 1000;
  let today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  
  let latestPracticed = sorted[0];
  if (latestPracticed < todayMs - oneDayMs) {
    return 0;
  }
  
  let expected = latestPracticed;
  let streak = 0;
  
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] === sorted[i - 1]) continue;
    
    const diff = expected - sorted[i];
    if (diff === 0) {
      streak++;
      expected -= oneDayMs;
    } else if (diff > 0) {
      break;
    }
  }
  
  return streak;
};

export default function VocabNotebookTab({
  selectedLesson,
  selectedProgressDay,
  setSelectedProgressDay,
  savedVocab,
  commonVocab,
  streakDays,
  userProgress,
  lessonsList,
  hasShadowedToday,
  hasChattedToday,
  openRouterModel,
  handleSaveWord,
  handleDeleteWord,
  updateProgressTask,
  vocabSubTab,
  setVocabSubTab
}: VocabNotebookTabProps) {
  // Review Game states
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [reviewScores, setReviewScores] = useState({ correct: 0, total: 0 });
  const [flippedWords, setFlippedWords] = useState<string[]>([]);
  const [foundationalPage, setFoundationalPage] = useState(1);
  const wordsPerPage = 12;

  // Add new word form state
  const [newWordForm, setNewWordForm] = useState({
    word: "",
    ipa: "",
    definition: "",
    example: ""
  });
  const [isInferring, setIsInferring] = useState(false);

  const toggleFlippedWord = (word: string) => {
    setFlippedWords(prev => 
      prev.includes(word) ? prev.filter(w => w !== word) : [...prev, word]
    );
  };

  const handleAddCustomWord = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWordForm.word.trim()) {
      alert("Please enter at least a word.");
      return;
    }

    const wordObj: VocabWord = {
      word: newWordForm.word.trim(),
      ipa: newWordForm.ipa.trim() || "",
      definition: newWordForm.definition.trim() || "",
      example: newWordForm.example.trim() || "",
      day: selectedProgressDay
    };

    await handleSaveWord(wordObj);
    
    setNewWordForm({
      word: "",
      ipa: "",
      definition: "",
      example: ""
    });
    setVocabSubTab("saved");
  };

  const handleInferWordDetails = async () => {
    const word = newWordForm.word.trim();
    if (!word) {
      alert("Please enter a word first.");
      return;
    }
    setIsInferring(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: openRouterModel,
          messages: [
            {
              role: "system",
              content: `You are an expert lexicographer. For the given English word, generate the IPA pronunciation (enclosed in slashes, e.g., /ˈhɛəkʌt/), a clear, simple, and concise definition in English, and one natural example sentence.
Return the result EXACTLY in the following JSON format, and nothing else (do not wrap in markdown block, do not add any explanation):
{
  "ipa": "...",
  "definition": "...",
  "example": "..."
}`
            },
            {
              role: "user",
              content: `Word: ${word}`
            }
          ],
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 120
          }
        })
      });

      if (!response.ok) throw new Error("AI call failed");
      const data = await response.json();
      const content = data.message?.content || "";
      
      const jsonStart = content.indexOf("{");
      const jsonEnd = content.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = content.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        setNewWordForm(prev => ({
          ...prev,
          ipa: parsed.ipa || prev.ipa,
          definition: parsed.definition || prev.definition,
          example: parsed.example || prev.example
        }));
      } else {
        console.warn("Could not find JSON object in AI response:", content);
      }
    } catch (err) {
      console.error("Failed to infer word details:", err);
      alert("Could not connect to OpenRouter. Make sure your API key is configured.");
    } finally {
      setIsInferring(false);
    }
  };

  return (
    <>
      {/* Left Column: Streak calendar & growth sprout */}
      <div className="lg:col-span-5 rounded-[2.5rem] liquid-glass p-6 lg:p-8 flex flex-col gap-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <h3 className="text-sm font-semibold tracking-wide text-white/90 uppercase">Progress Dashboard</h3>
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <Calendar className="w-3.5 h-3.5 text-white/50" />
            <span>{streakDays.length} active days</span>
          </div>
        </div>

        {/* Animated Botanical Sprout Growth */}
        <div className="bg-black/20 rounded-2xl border border-white/5 p-4 flex flex-col items-center">
          <StreakSprout streak={getConsecutiveStreak(streakDays)} />
          <div className="grid grid-cols-2 gap-4 w-full mt-4 border-t border-white/5 pt-4 text-center">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-white/40 uppercase">Consecutive Streak</span>
              <span className="text-lg font-bold text-white">{getConsecutiveStreak(streakDays)} Days</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-white/40 uppercase">Total Words Saved</span>
              <span className="text-lg font-bold text-white">{savedVocab.length} Words</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/60 leading-relaxed">
          Practice daily by completing shadowing or conversation coach sessions to maintain your streak and blossom your generative plant!
        </p>

        {/* 36-Day Course Progress Grid */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block font-semibold">36-Day Journey Map</span>
          <div className="grid grid-cols-6 gap-2 bg-black/45 p-4 rounded-2xl border border-white/5">
            {Array.from({ length: 36 }).map((_, idx) => {
              const dayNumber = idx + 1;
              const isCompleted = dayNumber < userProgress.currentDay;
              const isActive = dayNumber === userProgress.currentDay;
              const isUnlocked = dayNumber <= userProgress.currentDay;
              const isSelected = dayNumber === selectedProgressDay;
              
              return (
                <button 
                  key={idx}
                  onClick={() => {
                    if (isUnlocked) {
                      setSelectedProgressDay(dayNumber);
                    }
                  }}
                  disabled={!isUnlocked}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] transition-all border ${
                    isCompleted 
                      ? "bg-white text-black font-bold border-white" 
                      : isActive
                        ? "bg-white/10 border-white/30 text-white font-semibold animate-pulse"
                        : "bg-transparent border-white/5 text-white/20"
                  } ${
                    isUnlocked 
                      ? "cursor-pointer hover:border-white/50 hover:bg-white/5" 
                      : "cursor-not-allowed opacity-30"
                  } ${
                    isSelected
                      ? "ring-2 ring-white border-transparent scale-[1.05]"
                      : ""
                  }`}
                  title={`Day ${dayNumber}: ${isCompleted ? "Completed" : isActive ? "Active" : "Locked"}${isSelected ? " (Selected)" : ""}`}
                >
                  <span className="text-[8px] opacity-40 uppercase font-mono block text-center font-semibold">D</span>
                  <span className="text-xs font-bold font-mono leading-none mt-0.5">{dayNumber}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily task checklist */}
        <div className="p-4 rounded-2xl bg-black/45 border border-white/5 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-[10px] font-mono text-white/40 uppercase">Today's Tasks</span>
            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
              (hasShadowedToday && hasChattedToday) ? "bg-white/10 text-white" : "bg-white/5 text-white/55"
            }`}>
              {(hasShadowedToday && hasChattedToday) ? "✓ COMPLETED" : "LOCKED"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">1. Shadow 1 sentence (Score &ge; 50)</span>
              <span className="font-mono text-white">{hasShadowedToday ? "✓ Done" : "○ Pending"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">2. Message AI Coach</span>
              <span className="font-mono text-white">{hasChattedToday ? "✓ Done" : "○ Pending"}</span>
            </div>
          </div>
          {!(hasShadowedToday && hasChattedToday) && (
            <div className="text-[9px] font-mono text-white/30 italic text-center mt-1">
              *Unlock other lessons by completing today's tasks!
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Vocabulary notebooks list or Review game */}
      <div className="lg:col-span-7 rounded-[2.5rem] liquid-glass p-6 lg:p-8 flex flex-col gap-6 w-full">
        <style>{`
          .perspective-1000 {
            perspective: 1000px;
          }
          .preserve-3d {
            transform-style: preserve-3d;
          }
          .backface-hidden {
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
          }
          .rotate-y-180 {
            transform: rotateY(180deg);
          }
        `}</style>

        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div className="flex gap-4 sm:gap-6">
            <button
              onClick={() => setVocabSubTab("saved")}
              className={`text-xs font-semibold tracking-wide uppercase pb-2 border-b-2 transition-all cursor-pointer ${
                vocabSubTab === "saved" ? "text-white border-white" : "text-white/40 border-transparent hover:text-white/70"
              }`}
            >
              My Saved
            </button>
            <button
              onClick={() => setVocabSubTab("foundational")}
              className={`text-xs font-semibold tracking-wide uppercase pb-2 border-b-2 transition-all cursor-pointer ${
                vocabSubTab === "foundational" ? "text-white border-white" : "text-white/40 border-transparent hover:text-white/70"
              }`}
            >
              Foundational 521
            </button>
            <button
              onClick={() => {
                setVocabSubTab("review");
                setReviewIndex(0);
                setIsCardFlipped(false);
                setReviewScores({ correct: 0, total: 0 });
              }}
              className={`text-xs font-semibold tracking-wide uppercase pb-2 border-b-2 transition-all cursor-pointer ${
                vocabSubTab === "review" ? "text-white border-white" : "text-white/40 border-transparent hover:text-white/70"
              }`}
            >
              Review Game
            </button>
            <button
              onClick={() => setVocabSubTab("add")}
              className={`text-xs font-semibold tracking-wide uppercase pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                vocabSubTab === "add" ? "text-white border-white" : "text-white/40 border-transparent hover:text-white/70"
              }`}
            >
              <Plus className="w-3 h-3" />
              Add Word
            </button>
          </div>
          <span className="text-[10px] font-mono text-white/40 hidden sm:inline">
            {vocabSubTab === "saved" ? `${savedVocab.length} saved` : vocabSubTab === "foundational" ? `${commonVocab.length} words` : vocabSubTab === "add" ? "Add new word" : "Challenge Mode"}
          </span>
        </div>

        {vocabSubTab === "saved" ? (
          (() => {
            const grouped: Record<number, typeof savedVocab> = {};
            savedVocab.forEach((item) => {
              const day = item.day || 1;
              if (!grouped[day]) grouped[day] = [];
              grouped[day].push(item);
            });

            // Ensure selected progress day is always listed
            if (!grouped[selectedProgressDay]) {
              grouped[selectedProgressDay] = [];
            }

            // Ensure active currentDay is always listed
            if (!grouped[userProgress.currentDay]) {
              grouped[userProgress.currentDay] = [];
            }

            const daysSorted = Object.keys(grouped).map(Number).sort((a, b) => a - b);

            return (
              <div className="flex flex-col gap-8 max-h-[480px] overflow-y-auto pr-1">
                {daysSorted.map((dayNum) => (
                  <div key={dayNum} className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[9px] font-bold">
                        DAY {dayNum}
                      </span>
                      <span className="text-[10px] text-white/50 font-sans">
                        ({grouped[dayNum].length} words saved)
                      </span>
                    </div>

                    {grouped[dayNum].length === 0 ? (
                      <div className="py-8 px-4 rounded-2xl border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-2 bg-white/5">
                        <BookOpen className="w-5 h-5 text-white/20" />
                        <p className="text-xs text-white/40">No words saved for Day {dayNum} yet.</p>
                        <p className="text-[10px] text-white/30 max-w-[280px]">Save words during shadowing or click "Add Word" above to build your custom vocabulary!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {grouped[dayNum].map((item, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => toggleFlippedWord(item.word)}
                            className="aspect-[1.5/1] w-full perspective-1000 cursor-pointer group"
                          >
                            <div className={`relative w-full h-full duration-300 preserve-3d transition-transform ${flippedWords.includes(item.word) ? "rotate-y-180" : ""}`}>
                              
                              {/* Front Face */}
                              <div className="absolute inset-0 w-full h-full backface-hidden rounded-xl border border-white/5 bg-black/45 flex flex-col items-center justify-center p-3 text-center shadow">
                                <span className="text-xs font-bold text-white tracking-wide">{item.word}</span>
                                <span className="text-[9px] font-mono text-white/40 mt-1">{item.ipa}</span>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteWord(item.word);
                                  }}
                                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                  title="Delete word"
                                >
                                  <Trash2 className="w-3 h-3 text-white/40 hover:text-white" />
                                </button>
                              </div>

                              {/* Back Face */}
                              <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl border border-white/10 bg-black/60 flex flex-col justify-between p-3 text-left shadow">
                                <div className="flex flex-col gap-1 overflow-y-auto h-full justify-center">
                                  <p className="text-[10px] text-white/80 leading-normal">{item.definition}</p>
                                  <p className="text-[9px] text-white/45 italic leading-normal mt-0.5">"{item.example}"</p>
                                </div>
                              </div>

                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()
        ) : vocabSubTab === "foundational" ? (
          commonVocab.length === 0 ? (
            <div className="py-20 text-center text-xs text-white/40">Loading 521 foundational words...</div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[420px] overflow-y-auto pr-1">
                {commonVocab.slice((foundationalPage - 1) * wordsPerPage, foundationalPage * wordsPerPage).map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => toggleFlippedWord(item.word)}
                    className="aspect-[1.5/1] w-full perspective-1000 cursor-pointer"
                  >
                    <div className={`relative w-full h-full duration-300 preserve-3d transition-transform ${flippedWords.includes(item.word) ? "rotate-y-180" : ""}`}>
                      
                      <div className="absolute inset-0 w-full h-full backface-hidden rounded-xl border border-white/5 bg-black/45 flex flex-col items-center justify-center p-3 text-center shadow">
                        <span className="text-xs font-bold text-white tracking-wide">{item.word}</span>
                        <span className="text-[9px] font-mono text-white/40 mt-1">{item.ipa}</span>
                      </div>

                      <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl border border-white/10 bg-black/60 flex flex-col justify-between p-3 text-left shadow">
                        <div className="flex flex-col gap-1 overflow-y-auto h-full justify-center">
                          <p className="text-[10px] text-white/80 leading-normal">{item.definition}</p>
                          <p className="text-[9px] text-white/45 italic leading-normal mt-0.5">"{item.example}"</p>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                <button
                  disabled={foundationalPage === 1}
                  onClick={() => setFoundationalPage(p => Math.max(1, p - 1))}
                  className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-xs font-mono transition-all"
                >
                  &larr; Prev
                </button>
                <span className="text-[10px] font-mono text-white/40">Page {foundationalPage} of {Math.ceil(commonVocab.length / wordsPerPage)}</span>
                <button
                  disabled={foundationalPage === Math.ceil(commonVocab.length / wordsPerPage)}
                  onClick={() => setFoundationalPage(p => Math.min(Math.ceil(commonVocab.length / wordsPerPage), p + 1))}
                  className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-xs font-mono transition-all"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )
        ) : vocabSubTab === "add" ? (
          <form onSubmit={handleAddCustomWord} className="flex flex-col gap-5 bg-black/45 p-6 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
              <Plus className="w-4 h-4 text-white/60" />
              <h4 className="text-xs font-semibold text-white tracking-wide uppercase">Add Custom Vocabulary</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">Vocabulary Word <span className="text-red-400">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Serendipity"
                    required
                    value={newWordForm.word}
                    onChange={(e) => setNewWordForm(prev => ({ ...prev, word: e.target.value }))}
                    className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all focus:border-white/20"
                  />
                  <button
                    type="button"
                    onClick={handleInferWordDetails}
                    disabled={isInferring || !newWordForm.word.trim()}
                    className="px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs text-white/90 font-medium hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:scale-100"
                    title="Auto-fill pronunciation, definition, and example using AI"
                  >
                    {isInferring ? (
                      <>
                        <span className="w-3 h-3 rounded-full border border-white/40 border-t-transparent animate-spin inline-block" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-white/70" />
                        <span>AI Auto-fill</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">Pronunciation (IPA - Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. /ˌserənˈdipədē/"
                  value={newWordForm.ipa}
                  onChange={(e) => setNewWordForm(prev => ({ ...prev, ipa: e.target.value }))}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all focus:border-white/20"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">Definition (Optional)</label>
              <textarea
                placeholder="e.g. The occurrence and development of events by chance in a happy or beneficial way."
                value={newWordForm.definition}
                onChange={(e) => setNewWordForm(prev => ({ ...prev, definition: e.target.value }))}
                rows={3}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all focus:border-white/20 resize-none font-sans"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">Example Sentence (Optional)</label>
              <textarea
                placeholder="e.g. We found the charming little restaurant by pure serendipity."
                value={newWordForm.example}
                onChange={(e) => setNewWordForm(prev => ({ ...prev, example: e.target.value }))}
                rows={2}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all focus:border-white/20 resize-none font-serif italic"
              />
            </div>

            <button
              type="submit"
              className="py-3 rounded-full bg-white text-black hover:bg-white/95 text-xs font-semibold hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 w-full"
            >
              <Plus className="w-3.5 h-3.5 text-black" />
              <span>Save to Vocabulary Store</span>
            </button>
          </form>
        ) : (
          // Review flashcard game mode
          savedVocab.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <BookOpen className="w-8 h-8 text-white/10" />
              <p className="text-xs text-white/40">Your saved words list is empty. Add words while shadowing to play!</p>
            </div>
          ) : reviewIndex >= savedVocab.length ? (
            <div className="py-16 text-center flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center animate-bounce">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="flex flex-col gap-2">
                <h4 className="text-base font-semibold text-white uppercase tracking-wider">Review Complete!</h4>
                <p className="text-xs text-white/60">You reviewed all the vocabulary saved in your notebook.</p>
              </div>
              <div className="px-8 py-4 rounded-2xl bg-black/45 border border-white/5 flex gap-8 text-left">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-white/40 uppercase">Reviewed</span>
                  <span className="text-lg font-bold text-white">{savedVocab.length} Words</span>
                </div>
                <div className="w-[1px] bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-white/40 uppercase">Mastered</span>
                  <span className="text-lg font-bold text-white">{reviewScores.correct} Words</span>
                </div>
              </div>
              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => {
                    setReviewIndex(0);
                    setIsCardFlipped(false);
                    setReviewScores({ correct: 0, total: 0 });
                  }}
                  className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-white/90 text-xs font-semibold hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  Restart Game
                </button>
                <button
                  onClick={() => setVocabSubTab("saved")}
                  className="px-6 py-2.5 rounded-full bg-white/5 text-white/80 hover:text-white hover:bg-white/10 text-xs font-semibold hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  Back to Notebook
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 items-center">
              <div className="w-full flex justify-between items-center text-[10px] font-mono text-white/40">
                <span>CARD {reviewIndex + 1} OF {savedVocab.length}</span>
                <span>SCORE: {reviewScores.correct} / {reviewIndex}</span>
              </div>

              {/* 3D Flippable card */}
              <div 
                className="w-full max-w-md aspect-[1.7/1] perspective-1000 cursor-pointer"
                onClick={() => setIsCardFlipped(!isCardFlipped)}
              >
                <div className={`relative w-full h-full duration-500 preserve-3d transition-transform ${isCardFlipped ? "rotate-y-180" : ""}`}>
                  
                  <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl border border-white/10 bg-black/40 flex flex-col items-center justify-center p-6 text-center select-none shadow-xl">
                    <span className="text-2xl font-bold tracking-tight text-white mb-2">{savedVocab[reviewIndex].word}</span>
                    <span className="text-xs font-mono text-white/50">{savedVocab[reviewIndex].ipa}</span>
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest mt-6 bg-white/5 px-2.5 py-1 rounded-full animate-pulse">
                      Click card to reveal definition
                    </span>
                  </div>

                  <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl border border-white/10 bg-black/50 flex flex-col justify-between p-6 select-none shadow-xl">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-white">{savedVocab[reviewIndex].word}</span>
                        <span className="text-xs font-mono text-white/40">{savedVocab[reviewIndex].ipa}</span>
                      </div>
                      <p className="text-xs text-white/80 leading-normal">{savedVocab[reviewIndex].definition}</p>
                      <p className="text-xs text-white/45 italic leading-normal font-serif">"{savedVocab[reviewIndex].example}"</p>
                    </div>
                    <span className="text-[8px] font-mono text-white/30 text-right uppercase tracking-wider block border-t border-white/5 pt-2">
                      Click card to flip back
                    </span>
                  </div>

                </div>
              </div>

              {/* Card Action controls */}
              <div className="flex gap-4 w-full max-w-xs mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCardFlipped(false);
                    setTimeout(() => {
                      setReviewIndex((prev) => prev + 1);
                      setReviewScores((prev) => ({ ...prev, total: prev.total + 1 }));
                    }, 200);
                  }}
                  className="flex-1 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-semibold text-white/80 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  Review Again
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCardFlipped(false);
                    setTimeout(() => {
                      setReviewIndex((prev) => prev + 1);
                      setReviewScores((prev) => ({ correct: prev.correct + 1, total: prev.total + 1 }));
                    }, 200);
                  }}
                  className="flex-1 py-3 rounded-full bg-white text-black hover:bg-white/95 text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  I Know It!
                </button>
              </div>

              {/* Mini progress line */}
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-white h-full transition-all duration-300"
                  style={{ width: `${((reviewIndex) / savedVocab.length) * 100}%` }}
                />
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}
