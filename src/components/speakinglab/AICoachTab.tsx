import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Mic, MicOff, Send, Sparkles, ArrowRight } from "lucide-react";
import type { Lesson, ChatMessage, UserProgress } from "./types";

interface AICoachTabProps {
  selectedLesson: Lesson | null;
  userProgress: UserProgress;
  selectedProgressDay: number;
  isOllamaOnline: boolean | null;
  openRouterModel: string;
  ttsSpeed: number;
  selectedVoice: string;
  voicesList: SpeechSynthesisVoice[];
  updateProgressTask: (task: "listen" | "shadow" | "speak" | "game", completed: boolean) => void;
  markDayPracticed: () => void;
  setHasChattedToday: (v: boolean) => void;
  changeTab: (tab: "shadow" | "coach" | "vocab" | "games") => void;
  setVocabSubTab: (sub: "saved" | "foundational" | "review" | "add") => void;
  // Speech recognition props
  isRecording: boolean;
  volumeLevel: number;
  isSpeechSupported: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  chatInput: string;
  setChatInput: (v: string) => void;
  setRecognitionText: (v: string) => void;
  pendingSpeechSend?: string | null;
  clearPendingSpeechSend?: () => void;
  recognitionText: string;
}

export default function AICoachTab({
  selectedLesson,
  userProgress,
  selectedProgressDay,
  isOllamaOnline,
  openRouterModel,
  ttsSpeed,
  selectedVoice,
  voicesList,
  updateProgressTask,
  markDayPracticed,
  setHasChattedToday,
  changeTab,
  setVocabSubTab,
  isRecording,
  volumeLevel,
  isSpeechSupported,
  startRecording,
  stopRecording,
  chatInput,
  setChatInput,
  setRecognitionText,
  pendingSpeechSend,
  clearPendingSpeechSend,
  recognitionText
}: AICoachTabProps) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<"shadow" | "practice" | "whatif" | "debrief">("shadow");
  const [isQwenLoading, setIsQwenLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const lastLoadedDayRef = useRef<number | null>(null);
  const sessionStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-calculate week from selected progress day (1-7 -> W1, 8-14 -> W2, etc.)
  const currentWeek = Math.min(4, Math.ceil((selectedProgressDay || 1) / 7)) as 1 | 2 | 3 | 4;

  // Load chat history when day or lesson changes
  useEffect(() => {
    if (!selectedLesson) return;

    const day = selectedProgressDay;
    if (lastLoadedDayRef.current === day) return;
    lastLoadedDayRef.current = day;

    const loadChatHistory = async () => {
      try {
        setChatHistory([]);
        const response = await fetch(`/api/chat-history?lessonId=${selectedLesson.id}&day=${day}`);
        if (response.ok) {
          const history = await response.json();
          if (history && history.length > 0) {
            setChatHistory(history);
            // Restore phase state from last assistant message
            const lastAssistantMsg = [...history].reverse().find(m => m.role === "assistant");
            if (lastAssistantMsg && lastAssistantMsg.phase) {
              setPhase(lastAssistantMsg.phase);
            } else {
              setPhase("shadow");
            }
          } else {
            startNewCoachSession(false);
          }
        } else {
          startNewCoachSession(false);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
        startNewCoachSession(false);
      }
    };
    loadChatHistory();
  }, [selectedLesson?.id, selectedProgressDay]);

  // Helper to persist chat history to backend
  const persistChatHistory = useCallback(async (messages: ChatMessage[]) => {
    if (!selectedLesson || messages.length === 0) return;
    try {
      const response = await fetch("/api/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          day: selectedProgressDay,
          messages
        })
      });
      if (!response.ok) {
        console.error("Failed to save chat history:", await response.text());
      }
    } catch (err) {
      console.error("Failed to save chat history:", err);
    }
  }, [selectedLesson, selectedProgressDay]);

  // Throttled save: persist on new messages
  const prevChatLenRef = useRef(0);
  const lastSaveTimeRef = useRef(0);
  useEffect(() => {
    if (chatHistory.length > 0 && lastLoadedDayRef.current === selectedProgressDay) {
      const lastMsg = chatHistory[chatHistory.length - 1];
      if (lastMsg.role === "assistant" && !lastMsg.content) return;
      const now = Date.now();
      const isNewMessage = chatHistory.length !== prevChatLenRef.current;
      if (isNewMessage) {
        prevChatLenRef.current = chatHistory.length;
        lastSaveTimeRef.current = now;
        persistChatHistory(chatHistory);
      }
    }
  }, [chatHistory, selectedProgressDay, persistChatHistory]);

  // Auto-scroll chat container
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [chatHistory, isQwenLoading]);

  // Listen to pending speech sends from parent
  useEffect(() => {
    if (pendingSpeechSend && !isQwenLoading) {
      handleSendChat(pendingSpeechSend);
      if (clearPendingSpeechSend) {
        clearPendingSpeechSend();
      }
    }
  }, [pendingSpeechSend, isQwenLoading]);

  // TTS Output speak helper
  const speakAIResponse = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    if (selectedVoice) {
      const voice = voicesList.find(v => v.name === selectedVoice);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
    }
    utterance.rate = ttsSpeed;
    window.speechSynthesis.speak(utterance);
  };

  const startNewCoachSession = async (speakWelcome: boolean = true) => {
    if (sessionStartTimerRef.current) {
      clearTimeout(sessionStartTimerRef.current);
      sessionStartTimerRef.current = null;
    }

    if (!selectedLesson) return;

    setIsQwenLoading(true);
    setPhase("shadow");
    setChatHistory([]);

    try {
      const response = await fetch("/api/coach/open-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          day: selectedProgressDay,
          model: openRouterModel
        })
      });

      if (!response.ok) throw new Error("Failed to initialize session");

      const welcomeMsg = await response.json();
      setChatHistory([welcomeMsg]);

      if (speakWelcome && welcomeMsg.content) {
        speakAIResponse(welcomeMsg.content);
      }
    } catch (err) {
      console.error("Failed to start new session:", err);
      const lessonTitle = selectedLesson?.title ? selectedLesson.title.replace("🇬🇧", "").trim() : "this lesson";
      const fallbackMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: `Hello! Let's start practicing speaking about "${lessonTitle}". Try to use target vocabulary words. Ready?`,
        phase: "shadow"
      };
      setChatHistory([fallbackMsg]);
    } finally {
      setIsQwenLoading(false);
    }
  };

  const handleSendChat = async (overrideText?: string) => {
    const textToSend = overrideText || chatInput;
    if (!textToSend.trim()) return;

    setHasChattedToday(true);
    setChatInput("");
    setRecognitionText("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      phase: phase
    };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setIsQwenLoading(true);

    const botId = `bot-${Date.now()}`;
    const placeholderMsg: ChatMessage = {
      id: botId,
      role: "assistant",
      content: "",
      phase: phase
    };
    setChatHistory(prev => [...prev, placeholderMsg]);

    try {
      const response = await fetch("/api/coach/process-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: selectedLesson?.id,
          day: selectedProgressDay,
          message: textToSend,
          phase: phase,
          model: openRouterModel
        })
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with AI Coach.");
      }

      const botMsg = await response.json();

      setChatHistory(prev =>
        prev.map(msg =>
          msg.id === botId ? botMsg : msg
        )
      );

      if (botMsg.phase) {
        setPhase(botMsg.phase);
      }

      if (botMsg.content) {
        speakAIResponse(botMsg.content);
      }
      markDayPracticed();
      updateProgressTask("speak", true);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => {
        const newHistory = prev.map(msg =>
          msg.id === botId
            ? {
                id: botId,
                role: "assistant",
                content: "Sorry, my brain feels a bit dizzy right now. 😵 Can you please try sending that again? I want to practice speaking with you!",
                phase: phase
              }
            : msg
        );
        persistChatHistory(newHistory);
        return newHistory;
      });
    } finally {
      setIsQwenLoading(false);
    }
  };

  const triggerDebrief = async () => {
    if (!selectedLesson) return;
    setIsQwenLoading(true);
    setPhase("debrief");

    const botId = `bot-${Date.now()}`;
    const placeholderMsg: ChatMessage = {
      id: botId,
      role: "assistant",
      content: "",
      phase: "debrief"
    };
    setChatHistory(prev => [...prev, placeholderMsg]);

    try {
      const response = await fetch("/api/coach/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          day: selectedProgressDay,
          model: openRouterModel
        })
      });

      if (!response.ok) throw new Error("Failed to generate debrief");
      const botMsg = await response.json();

      setChatHistory(prev =>
        prev.map(msg =>
          msg.id === botId ? botMsg : msg
        )
      );

      if (botMsg.content) {
        speakAIResponse(botMsg.content);
      }
      updateProgressTask("speak", true);
    } catch (err) {
      console.error("Debrief error:", err);
      setChatHistory(prev =>
        prev.map(msg =>
          msg.id === botId
            ? {
                id: botId,
                role: "assistant",
                content: "Failed to generate session wrap-up. Thank you for practicing today!",
                phase: "debrief"
              }
            : msg
        )
      );
    } finally {
      setIsQwenLoading(false);
    }
  };
  const handleRecordChatInput = () => {
    if (!isSpeechSupported) {
      alert("Speech recognition not supported on this browser.");
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      setChatInput("");
      startRecording();
    }
  };

  // Expose handleSendChat for parent speech end callback
  // We use an effect to handle speech end by checking chatInput changes
  useEffect(() => {
    // Parent sets chatInput via onTextUpdate, onSpeechEnd triggers handleSendChat via the parent
  }, []);

  return (
    <div className="lg:col-span-12 rounded-[2.5rem] liquid-glass p-6 lg:p-8 flex flex-col justify-between min-h-[500px]">

      {/* OpenRouter Connection Alert Banner */}
      {isOllamaOnline === false && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-500/20 text-red-200 text-xs flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span><strong>OpenRouter Offline:</strong> Could not connect to OpenRouter API. Please verify your API key and connection.</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs font-mono tracking-wider text-white/40 uppercase">Day {selectedProgressDay} Coach</span>
        </div>

        <div className="flex items-center gap-2">
          {phase !== "debrief" && chatHistory.length > 1 && (
            <button
              onClick={triggerDebrief}
              className="px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-semibold text-red-200 hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Wrap-up & Debrief
            </button>
          )}
          <button
            onClick={() => startNewCoachSession(true)}
            className="px-4 py-1.5 rounded-full liquid-glass border border-white/10 text-[10px] font-semibold text-white/80 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Reset AI Chat Session
          </button>
        </div>
      </div>

      {/* Chat Conversation History Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 bg-zinc-950/80 rounded-2xl p-6 min-h-[320px] max-h-[420px] overflow-y-auto flex flex-col gap-4 border border-white/5"
      >
        {chatHistory.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
            <Sparkles className="w-8 h-8 text-white/20 animate-pulse" />
            <p className="text-xs text-white/50 max-w-sm">
              Type a message or use voice input to start your personalized AI English Coach session for Day {selectedProgressDay}.
            </p>
          </div>
        ) : (
          chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "self-end items-end" : "self-start items-start"}`}
            >
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-white text-black font-medium rounded-tr-none"
                    : "bg-white/5 border border-white/5 text-white rounded-tl-none"
                }`}
              >
                {msg.role === "assistant" && msg.content === "" ? (
                  <div className="flex items-center gap-1.5 py-1" title="Coach is writing...">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="font-mono text-[9px] text-white/40 ml-1.5 tracking-wider">Coach is thinking...</span>
                  </div>
                ) : (
                  msg.content
                )}

                {/* Display used vocab words in response */}
                {msg.role === "assistant" && msg.usedVocab && msg.usedVocab.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2 pt-2 border-t border-white/5">
                    {msg.usedVocab.map((v, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-white/10 text-[9px] font-mono text-white/60">
                        🔑 {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Display evaluation feedback card if present */}
              {msg.role === "assistant" && msg.feedback && (
                <div className="mt-2 p-4 rounded-2xl bg-zinc-950 border border-white/5 text-left flex flex-col gap-2 w-full shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest font-semibold">AI Coach Feedback</span>
                    <span className="text-[11px] font-semibold text-yellow-400">{"⭐".repeat(msg.feedback.score)} ({msg.feedback.score}/5)</span>
                  </div>
                  {msg.feedback.naturalAlternative && (
                    <div className="mt-1">
                      <p className="text-[10px] text-white/40 line-through">You said: "{chatHistory.find((h, idx) => chatHistory[idx + 1]?.id === msg.id)?.content || ""}"</p>
                      <p className="text-[11px] text-green-300 font-semibold mt-0.5">&rarr; "{msg.feedback.naturalAlternative}"</p>
                    </div>
                  )}
                  {msg.feedback.strengths && msg.feedback.strengths.length > 0 && (
                    <div className="mt-1">
                      <span className="text-[9px] font-mono text-green-400 uppercase font-semibold">Strengths</span>
                      <ul className="list-disc pl-4 text-[10px] text-white/70 mt-0.5">
                        {msg.feedback.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {msg.feedback.improvements && msg.feedback.improvements.length > 0 && (
                    <div className="mt-1">
                      <span className="text-[9px] font-mono text-yellow-400 uppercase font-semibold">Suggestions</span>
                      <ul className="list-disc pl-4 text-[10px] text-white/70 mt-0.5">
                        {msg.feedback.improvements.map((imp, idx) => <li key={idx}>{imp}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Backwards compatible fallback correction */}
              {msg.role === "assistant" && !msg.feedback && msg.correction && (
                <div className="mt-2 p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 text-left flex flex-col gap-1 w-full">
                  <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider font-semibold">AI Grammar Correction</span>
                  <p className="text-[11px] text-white/80 line-through">"{msg.correction.original}"</p>
                  <p className="text-[11px] text-green-300 font-semibold">&rarr; "{msg.correction.corrected}"</p>
                  <p className="text-[10px] text-white/55 mt-1">{msg.correction.explanation}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Speaking Coach Chat Inputs Row */}
      <div className="flex flex-col gap-3 mt-6 border-t border-white/5 pt-4">
        {isRecording && (
          <div className="flex flex-col gap-3 max-w-md mx-auto w-full">
            {/* Volume Meter */}
            <div className="flex items-center justify-center gap-3 py-1 bg-black/20 rounded-2xl border border-white/5 max-w-xs mx-auto px-4 w-full">
              <div className="flex items-center gap-0.5 h-6">
                {Array.from({ length: 15 }).map((_, i) => {
                  const active = volumeLevel > (i * 6.5);
                  const distanceFromCenter = Math.abs(i - 7);
                  const maxHeight = 24 - distanceFromCenter * 2;
                  const height = active ? Math.max(4, Math.round((volumeLevel / 100) * maxHeight)) : 4;
                  return (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        active ? "bg-white" : "bg-white/10"
                      }`}
                      style={{ height: `${height}px` }}
                    />
                  );
                })}
              </div>
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest animate-pulse">Voice Level</span>
            </div>

            {/* Realtime Speech Text */}
            {recognitionText && (
              <div className="text-left bg-black/45 p-4 rounded-2xl border border-white/5 w-full">
                <span className="text-[9px] font-mono text-white/40 block mb-1">Your Speech:</span>
                <p className="text-xs text-white/90 font-mono leading-relaxed">
                  {recognitionText}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {isSpeechSupported ? (
            <button
              onClick={handleRecordChatInput}
              className={`px-5 py-3 rounded-full flex items-center justify-center gap-2 border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                isRecording
                  ? "bg-white text-black border-white"
                  : "bg-white/5 text-white/80 hover:text-white border-white/10"
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4 text-black" /> : <Mic className="w-4 h-4" />}
              <span className="text-xs font-semibold uppercase">{isRecording ? "Tap to Stop" : "Speak Input"}</span>
            </button>
          ) : (
            <div
              className="px-4 py-2.5 rounded-full bg-red-950/20 border border-red-500/10 text-red-400 text-[10px] font-medium"
              title="Speech recognition requires Google Chrome or Chromium browsers."
            >
              Mic Unsupported
            </div>
          )}

          <input
            type="text"
            placeholder="Type your reply here..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
            disabled={isQwenLoading}
            className="flex-1 bg-black/60 border border-white/10 rounded-full px-5 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />

          <button
            onClick={() => handleSendChat()}
            disabled={isQwenLoading || !chatInput.trim()}
            className="w-10 h-10 rounded-full bg-white text-black hover:bg-white/90 flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task transition guidance card for Speak */}
      {userProgress.todayTasks.speak && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-center flex flex-col gap-3"
        >
          <p className="text-xs text-green-300 font-medium">
            ✓ AI Coach Speaking task completed!
          </p>
          <button
            onClick={() => {
              changeTab("games");
            }}
            className="py-2.5 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-semibold hover:scale-102 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
          >
            <span>Play Word Games</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </button>
        </motion.div>
      )}

    </div>
  );
}