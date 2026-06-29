import React, { useState, useEffect } from "react";
import { useSilenceDetection } from "../hooks/useSilenceDetection";
import { useOpenRouterHealth } from "../hooks/useOllamaHealth";
import { motion, AnimatePresence } from "motion/react";
import { 
  Video,
  Sparkles,
  BookOpen,
  ArrowRight,
  Settings,
  Volume2,
  Gamepad2
} from "lucide-react";
import type { Lesson, VocabWord, SavedWord, UserProgress } from "./speakinglab/types";
import ProgressionBar from "./speakinglab/ProgressionBar";
import ShadowingTab from "./speakinglab/ShadowingTab";
import AICoachTab from "./speakinglab/AICoachTab";
import VocabNotebookTab from "./speakinglab/VocabNotebookTab";
import WordGamesTab from "./speakinglab/WordGamesTab";

export default function AISpeakingLab() {
  const [activeTab, setActiveTab] = useState<"shadow" | "coach" | "vocab" | "games">("shadow");

  // OpenRouter Health via custom hook
  const { isOpenRouterOnline } = useOpenRouterHealth(10000);

  // Custom Hook for Speech Recognition & Silence Auto-Stop with Enhanced Features
  const {
    isRecording,
    volumeLevel,
    recognitionText,
    isSpeechSupported,
    startRecording,
    stopRecording,
    setRecognitionText,
    audioQuality,
    backgroundNoise
  } = useSilenceDetection({
    lang: activeTab === "shadow" ? "en-GB" : "en-US",
    enableNoiseCancellation: true,
    enableEnhancedProcessing: true,
    onTextUpdate: (text) => {
      if (activeTab === "coach") {
        setChatInput(text);
      } else {
        setRecognitionText(text);
      }
    },
    onSpeechEnd: (finalText) => {
      if (activeTab === "coach") {
        const finalVal = finalText.trim();
        if (finalVal) {
          // The AICoachTab handles sending via chatInput being set
          setChatInput(finalVal);
          // We need to trigger send - set a flag
          setPendingSpeechSend(finalVal);
        }
        setChatInput("");
      }
    }
  });

  // State for pending speech sends to coach tab
  const [pendingSpeechSend, setPendingSpeechSend] = useState<string | null>(null);

  // Chat input shared between parent and AICoachTab
  const [chatInput, setChatInput] = useState("");

  // Stop recording when switching tabs
  useEffect(() => {
    if (isRecording) {
      stopRecording();
    }
  }, [activeTab]);

  // Cancel Speech Synthesis on tab change or component unmount
  useEffect(() => {
    window.speechSynthesis.cancel();
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [activeTab]);

  // Synchronize tab active state with URL hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#shadowing-lab") {
        setActiveTab("shadow");
      } else if (hash === "#ai-coach") {
        setActiveTab("coach");
      } else if (hash === "#vocab-notebook") {
        setActiveTab("vocab");
      } else if (hash === "#word-games") {
        setActiveTab("games");
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const changeTab = (tabId: "shadow" | "coach" | "vocab" | "games") => {
    setActiveTab(tabId);
    if (tabId === "shadow") {
      window.location.hash = "#shadowing-lab";
    } else if (tabId === "coach") {
      window.location.hash = "#ai-coach";
    } else if (tabId === "vocab") {
      window.location.hash = "#vocab-notebook";
    } else if (tabId === "games") {
      window.location.hash = "#word-games";
    }
  };

  // Core data state
  const [savedVocab, setSavedVocab] = useState<SavedWord[]>([]);
  const [streakDays, setStreakDays] = useState<string[]>([]);
  const [lessonsList, setLessonsList] = useState<Lesson[]>([]);
  const [isInitializingLesson, setIsInitializingLesson] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [commonVocab, setCommonVocab] = useState<VocabWord[]>([]);
  
  // Daily task state
  const [hasShadowedToday, setHasShadowedToday] = useState(false);
  const [hasChattedToday, setHasChattedToday] = useState(false);

  // Text-To-Speech (TTS) Settings
  const [ttsSpeed, setTtsSpeed] = useState(0.95);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [voicesList, setVoicesList] = useState<SpeechSynthesisVoice[]>([]);
  const [openRouterModel, setOpenRouterModel] = useState<string>("qwen/qwen3-next-80b-a3b-instruct");

  // Daily Progression State
  const [userProgress, setUserProgress] = useState<UserProgress>({
    currentDay: 1,
    completedDays: {},
    todayTasks: { listen: false, shadow: false, speak: false, quiz: false }
  });
  const [selectedProgressDay, setSelectedProgressDay] = useState<number>(1);

  // Vocab sub-tab state (shared between parent and VocabNotebookTab for tab switching)
  const [vocabSubTab, setVocabSubTab] = useState<"saved" | "foundational" | "review" | "add" | "quiz">("saved");

  // Timezone-safe local date string generator
  const getLocalDateString = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  };

  // Load initial data from backend
  useEffect(() => {
    fetch("/api/vocabulary")
      .then(res => res.json())
      .then(data => setSavedVocab(data))
      .catch(err => console.error("Failed to fetch vocabulary:", err));

    fetch("/api/common-vocabulary")
      .then(res => res.json())
      .then(data => setCommonVocab(data))
      .catch(err => console.error("Failed to fetch common vocabulary:", err));

    fetch("/api/streaks")
      .then(res => res.json())
      .then(data => setStreakDays(data))
      .catch(err => console.error("Failed to fetch streaks:", err));

    fetch("/api/progress")
      .then(res => res.json())
      .then(data => setUserProgress(data))
      .catch(err => console.error("Failed to fetch user progress:", err));

    fetch("/api/lessons")
      .then(res => res.json())
      .then(data => {
        setLessonsList(data);
      })
      .catch(err => console.error("Failed to fetch lessons list:", err));
  }, []);

  // Sync selectedProgressDay with active day
  useEffect(() => {
    if (userProgress?.currentDay) {
      setSelectedProgressDay(userProgress.currentDay);
    }
  }, [userProgress?.currentDay]);

  // Automatically select/lock lesson based on selected progression Day
  useEffect(() => {
    if (lessonsList.length > 0 && selectedProgressDay) {
      const activeDay = selectedProgressDay;
      let targetLesson = lessonsList.find(l => l.id === "RJbUtcaoNCY" || l.title.toLowerCase().includes("haircut"));
      
      if (activeDay > 1) {
        const otherLessons = lessonsList.filter(l => l.id !== "RJbUtcaoNCY" && !l.title.toLowerCase().includes("haircut"));
        const seqIndex = (activeDay - 2) % otherLessons.length;
        targetLesson = otherLessons[seqIndex] || lessonsList[0];
      }

      if (targetLesson && (!selectedLesson || selectedLesson.id !== targetLesson.id)) {
        setSelectedLesson(targetLesson);
      }
    }
  }, [selectedProgressDay, lessonsList]);

  // Automatically initialize lesson if not already initialized
  useEffect(() => {
    if (selectedLesson && !selectedLesson.isInitialized && !isInitializingLesson) {
      handleInitializeLesson();
    }
  }, [selectedLesson]);

  // Load TTS voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter(v => v.lang.startsWith("en"));
      setVoicesList(englishVoices);
      if (englishVoices.length > 0 && !selectedVoice) {
        const defaultVoice = englishVoices.find(v => v.lang === "en-GB") || englishVoices[0];
        setSelectedVoice(defaultVoice.name);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Sync today's completed state if date is already in database
  useEffect(() => {
    const todayStr = getLocalDateString();
    if (streakDays.includes(todayStr)) {
      setHasShadowedToday(true);
      setHasChattedToday(true);
    }
  }, [streakDays]);

  // Automatically submit streak to backend once both tasks are finished today
  useEffect(() => {
    if (hasShadowedToday && hasChattedToday) {
      const todayStr = getLocalDateString();
      if (!streakDays.includes(todayStr)) {
        markDayPracticed();
      }
    }
  }, [hasShadowedToday, hasChattedToday, streakDays]);

  // Update backend stats triggers
  const markDayPracticed = async () => {
    try {
      const res = await fetch("/api/streaks", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setStreakDays(data);
      }
    } catch (err) {
      console.error("Failed to log streak:", err);
    }
  };

  const updateProgressTask = async (taskName: "listen" | "shadow" | "speak" | "game", completed: boolean) => {
    try {
      const res = await fetch("/api/progress/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskName, completed })
      });
      if (res.ok) {
        const data = await res.json();
        setUserProgress(data);
      }
    } catch (err) {
      console.error("Failed to update progress task:", err);
    }
  };

  // Save word to backend database
  const handleSaveWord = async (wordObj: VocabWord) => {
    if (savedVocab.some(w => w.word.toLowerCase() === wordObj.word.toLowerCase())) return;
    const newWord = {
      ...wordObj,
      day: wordObj.day || selectedProgressDay,
      dateSaved: getLocalDateString()
    };

    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWord)
      });
      if (res.ok) {
        const data = await res.json();
        setSavedVocab(data);
      }
    } catch (err) {
      console.error("Failed to save vocab word:", err);
    }
  };

  // Delete word from backend database
  const handleDeleteWord = async (word: string) => {
    try {
      const res = await fetch(`/api/vocabulary/${encodeURIComponent(word)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const data = await res.json();
        setSavedVocab(data);
      }
    } catch (err) {
      console.error("Failed to delete word:", err);
    }
  };

  const handleInitializeLesson = async () => {
    if (!selectedLesson) return;
    setIsInitializingLesson(true);
    try {
      const res = await fetch(`/api/lessons/${selectedLesson.id}/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: openRouterModel })
      });
      if (res.ok) {
        const updatedLesson = await res.json();
        setLessonsList(prev => prev.map(l => l.id === updatedLesson.id ? updatedLesson : l));
        setSelectedLesson(updatedLesson);
      } else {
        const errData = await res.json();
        alert(`Failed to initialize: ${errData.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Initialization error:", err);
      alert("Failed to connect to server for initialization.");
    } finally {
      setIsInitializingLesson(false);
    }
  };

  const handleResetProgress = async () => {
    if (confirm("Are you sure you want to reset your progression back to Day 1?")) {
      const res = await fetch("/api/progress/reset", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true })
      });
      if (res.ok) {
        const data = await res.json();
        setUserProgress(data);
        setSelectedProgressDay(1);
      }
    }
  };

  const isDayComplete = !!(userProgress?.todayTasks?.listen && userProgress?.todayTasks?.shadow && userProgress?.todayTasks?.speak && userProgress?.todayTasks?.game);

  return (
    <section id="ai-speaking-lab" className="py-24 px-4 lg:px-8 relative z-10 max-w-7xl mx-auto border-t border-white/5">
      {/* Target scroll anchors for sticky navbar navigation */}
      <div id="shadowing-lab" className="absolute -top-24" />
      <div id="ai-coach" className="absolute -top-24" />
      <div id="vocab-notebook" className="absolute -top-24" />
      <div className="flex flex-col gap-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <span className="text-xs tracking-[0.3em] uppercase text-white/50 font-mono block mb-2">Bloom Interactive Spoken Suite</span>
            <h2 className="text-4xl lg:text-5xl font-medium tracking-[-0.04em] text-white">
              AI <span className="font-serif italic text-white/80">Speaking</span> Lab.
            </h2>
          </div>

          {/* Settings Config Card (TTS speed/voice) */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="px-4 py-2 rounded-xl bg-white/5 flex items-center gap-3 text-xs font-mono">
              <Settings className="w-3.5 h-3.5 text-white/50" />
              <div className="flex items-center gap-1.5">
                <span>Speed:</span>
                <input 
                  type="range" 
                  min="0.75" 
                  max="1.25" 
                  step="0.05"
                  value={ttsSpeed}
                  onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-white/10 rounded accent-white cursor-pointer"
                />
                <span>{ttsSpeed.toFixed(2)}x</span>
              </div>
            </div>

            <div className="px-4 py-2 rounded-xl bg-white/5 flex items-center gap-3 text-xs font-mono">
              <Volume2 className="w-3.5 h-3.5 text-white/50" />
              <select 
                value={selectedVoice} 
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="bg-transparent border-none text-white focus:outline-none cursor-pointer max-w-[150px]"
              >
                {voicesList.map(voice => (
                  <option key={voice.name} value={voice.name} className="bg-zinc-950 text-white text-xs">
                    {voice.name.replace("Microsoft", "").replace("Google", "").trim()}
                  </option>
                ))}
              </select>
            </div>

            <div className="px-4 py-2 rounded-xl bg-white/5 flex items-center gap-3 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-white/50" />
              <select 
                value={openRouterModel} 
                onChange={(e) => setOpenRouterModel(e.target.value)}
                className="bg-transparent border-none text-white focus:outline-none cursor-pointer max-w-[135px]"
                title="Select AI Model"
              >
                <option value="openrouter/free" className="bg-zinc-950 text-white">Auto Free Model</option>
                <option value="qwen/qwen3-next-80b-a3b-instruct" className="bg-zinc-950 text-white">Qwen3 Next 80B A3B Instruct</option>
              </select>
            </div>
          </div>
        </div>

        {/* Progression Status Bar */}
        <ProgressionBar
          userProgress={userProgress}
          selectedProgressDay={selectedProgressDay}
          setSelectedProgressDay={setSelectedProgressDay}
          selectedLesson={selectedLesson}
          changeTab={changeTab}
          setVocabSubTab={setVocabSubTab}
          handleResetProgress={handleResetProgress}
        />

        {/* Custom tabs selector using design system */}
        <div className="flex gap-2">
          {[
            { id: "shadow", label: "YouTube Shadowing", icon: Video },
            { id: "coach", label: "AI Coach", icon: Sparkles },
            { id: "games", label: "Word Games", icon: Gamepad2 },
            { id: "vocab", label: "Vocabulary & Streak", icon: BookOpen }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => changeTab(tab.id as any)}
                className={`px-5 py-3 rounded-full flex items-center gap-2.5 text-xs font-medium tracking-wide transition-all ${
                  activeTab === tab.id 
                    ? "bg-white text-black font-semibold shadow-lg" 
                    : "liquid-glass text-white/70 hover:text-white hover:scale-105 active:scale-95"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-4">

          {/* TAB 1: YOUTUBE SHADOWING HUB */}
          <div className={`lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start ${activeTab === "shadow" ? "" : "hidden"}`}>
            <ShadowingTab
              selectedLesson={selectedLesson}
              isInitializingLesson={isInitializingLesson}
              handleInitializeLesson={handleInitializeLesson}
              handleSaveWord={handleSaveWord}
              userProgress={userProgress}
              updateProgressTask={updateProgressTask}
              setHasShadowedToday={setHasShadowedToday}
              changeTab={changeTab}
              isRecording={isRecording}
              volumeLevel={volumeLevel}
              recognitionText={recognitionText}
              isSpeechSupported={isSpeechSupported}
              startRecording={startRecording}
              stopRecording={stopRecording}
              setRecognitionText={setRecognitionText}
              audioQuality={audioQuality}
              backgroundNoise={backgroundNoise}
            />
          </div>

          {/* TAB 2: INTERACTIVE SPEAKING COACH */}
          {activeTab === "coach" && (
            <AICoachTab
              selectedLesson={selectedLesson}
              userProgress={userProgress}
              selectedProgressDay={selectedProgressDay}
              isOllamaOnline={isOpenRouterOnline}
              openRouterModel={openRouterModel}
              ttsSpeed={ttsSpeed}
              selectedVoice={selectedVoice}
              voicesList={voicesList}
              updateProgressTask={updateProgressTask}
              markDayPracticed={markDayPracticed}
              setHasChattedToday={setHasChattedToday}
              changeTab={changeTab}
              setVocabSubTab={setVocabSubTab}
              isRecording={isRecording}
              volumeLevel={volumeLevel}
              isSpeechSupported={isSpeechSupported}
              startRecording={startRecording}
              stopRecording={stopRecording}
              chatInput={chatInput}
              setChatInput={setChatInput}
              setRecognitionText={setRecognitionText}
              pendingSpeechSend={pendingSpeechSend}
              clearPendingSpeechSend={() => setPendingSpeechSend(null)}
            />
          )}

          {/* TAB 4: WORD GAMES */}
          {activeTab === "games" && (
            <div className="lg:col-span-12">
              <WordGamesTab
                selectedLesson={selectedLesson}
                savedVocab={savedVocab}
                openRouterModel={openRouterModel}
                userProgress={userProgress}
                updateProgressTask={updateProgressTask}
              />
            </div>
          )}

          {/* TAB 3: VOCABULARY & STREAK NOTEBOOK */}
          {activeTab === "vocab" && (
            <VocabNotebookTab
              selectedLesson={selectedLesson}
              selectedProgressDay={selectedProgressDay}
              setSelectedProgressDay={setSelectedProgressDay}
              savedVocab={savedVocab}
              commonVocab={commonVocab}
              streakDays={streakDays}
              userProgress={userProgress}
              lessonsList={lessonsList}
              hasShadowedToday={hasShadowedToday}
              hasChattedToday={hasChattedToday}
              openRouterModel={openRouterModel}
              handleSaveWord={handleSaveWord}
              handleDeleteWord={handleDeleteWord}
              updateProgressTask={updateProgressTask}
              vocabSubTab={vocabSubTab}
              setVocabSubTab={setVocabSubTab}
            />
          )}

        </div>

      </div>

      <AnimatePresence>
        {isDayComplete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="max-w-md w-full bg-zinc-950/90 rounded-[2.5rem] p-8 border border-white/10 text-center flex flex-col items-center gap-6 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg animate-bounce">
                <Sparkles className="w-8 h-8 text-black" />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Day Completed</span>
                <h3 className="text-xl font-semibold text-white">Day {userProgress.currentDay} Accomplished!</h3>
                <p className="text-xs text-white/60 mt-1">
                  Congratulations! You completed all daily tasks (Listen, Shadow, Speak with AI, and Word Games) for the lesson:
                  <br />
                  <span className="font-serif italic text-white/95 mt-2 block font-medium">"{selectedLesson?.title.replace("🇬🇧", "").trim()}"</span>
                </p>
              </div>

              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/progress/next-day", { method: "POST" });
                    if (res.ok) {
                      const data = await res.json();
                      setUserProgress(data);
                      setVocabSubTab("saved");
                      fetch("/api/streaks")
                        .then(res => res.json())
                        .then(streakData => setStreakDays(streakData));
                    }
                  } catch (err) {
                    console.error("Failed to unlock next day:", err);
                  }
                }}
                className="w-full py-3.5 rounded-full bg-white text-black hover:bg-white/95 text-xs font-semibold hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Unlock Day {userProgress.currentDay + 1}</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
