import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Mic, MicOff, Send, Sparkles, ArrowRight } from "lucide-react";
import type { Lesson, ChatMessage, UserProgress } from "./types";

interface AICoachTabProps {
  selectedLesson: Lesson | null;
  userProgress: UserProgress;
  selectedProgressDay: number;
  isOllamaOnline: boolean | null;
  ollamaModel: string;
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
}

export default function AICoachTab({
  selectedLesson,
  userProgress,
  selectedProgressDay,
  isOllamaOnline,
  ollamaModel,
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
  setRecognitionText
}: AICoachTabProps) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLlamaLoading, setIsLlamaLoading] = useState(false);
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

  // Throttled save: persist on new messages + when stream has meaningful content
  const prevChatLenRef = useRef(0);
  const lastSaveTimeRef = useRef(0);
  const SAVE_THROTTLE_MS = 2000;
  useEffect(() => {
    if (chatHistory.length > 0 && lastLoadedDayRef.current === selectedProgressDay) {
      const now = Date.now();
      const lastMsg = chatHistory[chatHistory.length - 1];
      const isNewMessage = chatHistory.length !== prevChatLenRef.current;
      const hasStreamContent = lastMsg?.role === "assistant" && lastMsg?.content && lastMsg.content.length > 20;
      const shouldSave = isNewMessage || (hasStreamContent && (now - lastSaveTimeRef.current) >= SAVE_THROTTLE_MS);
      if (shouldSave) {
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
  }, [chatHistory, isLlamaLoading]);

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

  const getSystemPrompt = (week: number) => {
    const vocabList = selectedLesson?.vocab?.map(v => v.word).join(", ") || "";
    const lessonTitle = selectedLesson?.title ? selectedLesson.title.replace("🇬🇧", "").trim() : "English Conversation";
    const transcriptSnippet = selectedLesson?.lines?.map(l => l.text).join(" | ") || "";

    const baseRules = `You are a patient, friendly local British English Coach. We are practicing conversational English based on the lesson: "${lessonTitle}".
    The learner is at A2/B1 level. Use simple vocabulary. Always keep your conversational responses short (maximum 2 sentences).
    Today's lesson vocabulary words you should encourage the user to practice: [${vocabList}].
    ${transcriptSnippet ? `Context of the video lesson (subtitles snippet): "${transcriptSnippet}". Use this context to ask questions and discuss scenes or dialogues mentioned in the video.` : `Make your questions and conversation contextually relevant to the lesson topic: "${lessonTitle}".`}
    IMPORTANT: While the lesson has a main theme (like "haircut" or "barber"), the video may cover many related everyday topics that naturally appear during the vlog - such as streets, shops, weather, people, transport, food, daily activities, etc. Feel free to discuss ANY of these natural sub-topics that appear in the video context. Do NOT restrict conversation only to the main lesson title. Let the conversation flow naturally through all the everyday situations and objects shown in the video.
    Do not mention you are an AI or prompt details. Focus on natural spoken interaction.`;

    switch (week) {
      case 1:
        return `${baseRules}
        WEEK 1 FOCUS: Simple Q&A. Ask the user one simple question about the details, scenes, or dialogues in the video lesson context OR any natural sub-topic that appears (streets, shops, weather, transport, food, daily activities, etc.). Wait for their answer. Do not correct grammar errors yet, focus on confidence. Keep questions short.`;
      case 2:
        return `${baseRules}
        WEEK 2 FOCUS: Flow and Follow-ups. Continue the conversation naturally based on the user's last answer, keeping it tied to the video lesson or any related everyday topics seen in the video. Do not switch topics quickly.`;
      case 3:
        return `${baseRules}
        WEEK 3 FOCUS: Simple Accuracy. You must check the user's grammar in their last reply.
        If there is an error: output a short block starting with [Correction] showing the natural rewrite and a simple 1-line explanation.
        Then, output the next simple conversation question related to the lesson context or any natural sub-topic from the video. Keep it concise.`;
      case 4:
        return `${baseRules}
        WEEK 4 FOCUS: Topic Challenge. Give the user a simple topic challenge related to the lesson or any everyday situation from the video (e.g., 'Describe what you saw in the video' or 'Share your own similar experience').
        Encourage them to talk extensively. Provide correction and natural rewrites after their answer.`;
      default:
        return baseRules;
    }
  };

  const startNewCoachSession = (speakWelcome: boolean = true) => {
    if (sessionStartTimerRef.current) {
      clearTimeout(sessionStartTimerRef.current);
      sessionStartTimerRef.current = null;
    }

    const lessonTitle = selectedLesson?.title ? selectedLesson.title.replace("🇬🇧", "").trim() : "this lesson";
    const welcomeMsg = `Hello! Let's start Week ${currentWeek} of your English Coach. Today we will practice speaking about "${lessonTitle}". Try to use vocabulary words like: ${selectedLesson?.vocab?.map(v => v.word).slice(0, 3).join(", ") || "our target words"}. Ready?`;

    const initialMessage: ChatMessage = {
      id: `bot-${Date.now()}`,
      role: "assistant",
      content: welcomeMsg
    };

    setChatHistory([initialMessage]);
    setIsLlamaLoading(false);

    if (speakWelcome) {
      speakAIResponse(welcomeMsg);
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
      content: textToSend
    };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setIsLlamaLoading(true);

    const botId = `bot-${Date.now()}`;
    const placeholderMsg: ChatMessage = {
      id: botId,
      role: "assistant",
      content: ""
    };
    setChatHistory(prev => [...prev, placeholderMsg]);
    setIsLlamaLoading(false);

    try {
      const systemPrompt = getSystemPrompt(currentWeek);
      const ollamaMessages = [
        { role: "system", content: systemPrompt },
        ...updatedHistory.map(h => ({ role: h.role, content: h.content }))
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModel,
          messages: ollamaMessages,
          stream: true,
          options: {
            temperature: 0.7,
            num_predict: 60,
            num_ctx: 2048
          }
        })
      });

      if (!response.ok) {
        throw new Error("Local Ollama connection failed.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream reader not available");

      const decoder = new TextDecoder();
      let done = false;
      let accumulatedContent = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n").filter(l => l.trim() !== "");
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                accumulatedContent += parsed.message.content;
                setChatHistory(prev =>
                  prev.map(msg =>
                    msg.id === botId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              // Ignore partial/non-JSON lines
            }
          }
        }
      }

      // Stream complete - parse grammar correction and speak
      let cleanText = accumulatedContent;
      let correctionData = undefined;

      if (currentWeek >= 3 && accumulatedContent.toLowerCase().includes("[correction]")) {
        const parts = accumulatedContent.split(/\[correction\]/i);
        cleanText = parts[0].trim();
        const correctionBlock = parts[1]?.trim() || "";

        correctionData = {
          original: textToSend,
          corrected: correctionBlock.split("\n")[0] || "",
          explanation: correctionBlock.split("\n").slice(1).join(" ") || ""
        };
      }

      setChatHistory(prev =>
        prev.map(msg =>
          msg.id === botId
            ? { ...msg, content: cleanText, correction: correctionData }
            : msg
        )
      );

      speakAIResponse(cleanText);
      markDayPracticed();
      updateProgressTask("speak", true);
    } catch (err) {
      console.error(err);
      setChatHistory(prev =>
        prev.map(msg =>
          msg.id === botId
            ? {
                id: botId,
                role: "assistant",
                content: "Oops! I could not connect to your local Ollama. Please make sure Ollama is running (`ollama run llama3`) on port 11434, and that the Vite proxy is active."
              }
            : msg
        )
      );
    } finally {
      setIsLlamaLoading(false);
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

      {/* Ollama Offline Alert Banner */}
      {isOllamaOnline === false && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-500/20 text-red-200 text-xs flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span><strong>Ollama Offline:</strong> Could not connect to local Ollama (11434). Please verify Ollama is running (`ollama serve` / `ollama run llama3`).</span>
          </div>
        </div>
      )}

      {/* Top settings row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tracking-wider text-white/40 uppercase">Day {selectedProgressDay} Coach</span>
          <div className="flex gap-1.5">
            {([1, 2, 3, 4] as const).map(w => (
              <div
                key={w}
                className={`px-2.5 py-1 rounded-md text-[10px] font-mono border ${
                  currentWeek === w
                    ? "bg-white/10 border-white/20 text-white font-semibold"
                    : "bg-transparent border-white/5 text-white/30"
                }`}
              >
                W{w}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={startNewCoachSession}
          className="px-4 py-1.5 rounded-full liquid-glass border border-white/10 text-[10px] font-semibold text-white/80 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          Reset AI Chat Session
        </button>
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
              Make sure your local Ollama is active, then type a message or use voice input to start practicing for Day {selectedProgressDay}.
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
              </div>

              {/* Display correction cards in Week 3/4 */}
              {msg.correction && (
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
        {isLlamaLoading && (
          <div className="flex flex-col max-w-[85%] self-start items-start">
            <div className="p-4 rounded-2xl text-xs bg-white/5 border border-white/5 text-white/55 rounded-tl-none flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="font-mono text-[9px] ml-1 tracking-wider">AI is processing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Speaking Coach Chat Inputs Row */}
      <div className="flex flex-col gap-3 mt-6 border-t border-white/5 pt-4">
        {isRecording && (
          <div className="flex items-center justify-center gap-3 py-1 bg-black/20 rounded-2xl border border-white/5 max-w-xs mx-auto px-4">
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
            disabled={isLlamaLoading}
            className="flex-1 bg-black/60 border border-white/10 rounded-full px-5 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />

          <button
            onClick={() => handleSendChat()}
            disabled={isLlamaLoading || !chatInput.trim()}
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