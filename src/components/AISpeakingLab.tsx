import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Mic, 
  MicOff, 
  Volume2, 
  Check, 
  Plus, 
  Trash2,
  Calendar,
  Sparkles,
  BookOpen,
  ArrowRight,
  Send,
  HelpCircle,
  Video,
  Settings
} from "lucide-react";

// Types
interface VocabWord {
  word: string;
  ipa: string;
  definition: string;
  example: string;
}

interface ShadowLine {
  start: number;
  end: number;
  text: string;
}

interface Lesson {
  id: string;
  title: string;
  videoId: string;
  vocab: VocabWord[];
  lines: ShadowLine[];
}

interface SavedWord extends VocabWord {
  dateSaved: string;
}

interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  correction?: {
    original: string;
    corrected: string;
    explanation: string;
  };
}

// Helper to clean punctuation and normalize for matching
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

// Calculate similarity using simple Levenshtein ratio
const getSimilarity = (s1: string, s2: string): number => {
  const n1 = normalizeText(s1);
  const n2 = normalizeText(s2);
  if (n1 === n2) return 100;
  if (!n1 || !n2) return 0;

  const track = Array(n2.length + 1).fill(null).map(() =>
    Array(n1.length + 1).fill(null));
  for (let i = 0; i <= n1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= n2.length; j += 1) track[j][0] = j;
  for (let j = 1; j <= n2.length; j += 1) {
    for (let i = 1; i <= n1.length; i += 1) {
      const indicator = n1[i - 1] === n2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j - 1][i] + 1, // deletion
        track[j][i - 1] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  const distance = track[n2.length][n1.length];
  const maxLen = Math.max(n1.length, n2.length);
  return Math.round(((maxLen - distance) / maxLen) * 100);
};

export default function AISpeakingLab() {
  const [activeTab, setActiveTab] = useState<"shadow" | "coach" | "vocab">("shadow");

  // Local state persistence keys
  const [savedVocab, setSavedVocab] = useState<SavedWord[]>([]);
  const [streakDays, setStreakDays] = useState<string[]>([]);
  const [lessonsList, setLessonsList] = useState<Lesson[]>([]);
  const [isInitializingLesson, setIsInitializingLesson] = useState(false);

  // Speech Web API instances
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionText, setRecognitionText] = useState("");
  const recognitionRef = useRef<any>(null);

  // Text-To-Speech (TTS) Settings
  const [ttsSpeed, setTtsSpeed] = useState(0.95);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [voicesList, setVoicesList] = useState<SpeechSynthesisVoice[]>([]);

  // Load local state
  useEffect(() => {
    // Fetch vocabulary from backend
    fetch("/api/vocabulary")
      .then(res => res.json())
      .then(data => setSavedVocab(data))
      .catch(err => console.error("Failed to fetch vocabulary:", err));

    // Fetch streaks from backend
    fetch("/api/streaks")
      .then(res => res.json())
      .then(data => setStreakDays(data))
      .catch(err => console.error("Failed to fetch streaks:", err));

    // Fetch lessons list from backend
    fetch("/api/lessons")
      .then(res => res.json())
      .then(data => {
        setLessonsList(data);
        if (data.length > 0) {
          setSelectedLesson(data[0]);
        }
      })
      .catch(err => console.error("Failed to fetch lessons list:", err));

    // Initialize TTS voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setVoicesList(voices.filter(v => v.lang.startsWith("en")));
      const defaultVoice = voices.find(v => v.lang === "en-GB" || v.lang === "en-US")?.name || voices[0]?.name;
      setSelectedVoice(defaultVoice || "");
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-GB";

      rec.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        setRecognitionText(result);
        setIsRecording(false);
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error: ", event.error);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

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

  // TTS Output speak helper
  const speakAIResponse = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      const voice = voicesList.find(v => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
    }
    utterance.rate = ttsSpeed;
    window.speechSynthesis.speak(utterance);
  };

  // --- TAB 1: SHADOWING HUB ---
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isPlayingSegment, setIsPlayingSegment] = useState(false);
  const [shadowScore, setShadowScore] = useState<number | null>(null);
  
  // Custom video imports state
  const [customVideoUrl, setCustomVideoUrl] = useState("");
  const [customTranscriptText, setCustomTranscriptText] = useState("");
  const [isCustomLoading, setIsCustomLoading] = useState(false);

  // YouTube player references
  const playerRef = useRef<any>(null);
  const playCheckIntervalRef = useRef<any>(null);

  // YouTube API loading script
  useEffect(() => {
    if (!selectedLesson || !selectedLesson.isInitialized || !selectedLesson.videoId) return;

    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    (window as any).onYouTubeIframeAPIReady = () => {
      if (selectedLesson) initPlayer(selectedLesson.videoId);
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer(selectedLesson.videoId);
    }

    return () => {
      clearInterval(playCheckIntervalRef.current);
    };
  }, [selectedLesson]);

  const initPlayer = (videoId: string) => {
    if (playerRef.current) {
      playerRef.current.loadVideoById(videoId);
      return;
    }

    playerRef.current = new (window as any).YT.Player("youtube-player", {
      height: "100%",
      width: "100%",
      videoId: videoId,
      playerVars: {
        playsinline: 1,
        controls: 1,
        rel: 0
      },
      events: {
        onReady: () => {
          console.log("YouTube Player is ready");
        }
      }
    });
  };

  const playSegment = (lineIndex: number) => {
    if (!playerRef.current || !playerRef.current.seekTo) return;
    if (!selectedLesson || !selectedLesson.isInitialized || !selectedLesson.lines[lineIndex]) return;
    const line = selectedLesson.lines[lineIndex];
    setCurrentLineIndex(lineIndex);
    setRecognitionText("");
    setShadowScore(null);
    setIsPlayingSegment(true);

    playerRef.current.seekTo(line.start, true);
    playerRef.current.playVideo();

    // Check time loop to stop
    clearInterval(playCheckIntervalRef.current);
    playCheckIntervalRef.current = setInterval(() => {
      if (!playerRef.current || !playerRef.current.getCurrentTime) return;
      const currentTime = playerRef.current.getCurrentTime();
      if (currentTime >= line.end) {
        playerRef.current.pauseVideo();
        setIsPlayingSegment(false);
        clearInterval(playCheckIntervalRef.current);
      }
    }, 100);
  };

  const toggleRecordShadow = () => {
    if (!selectedLesson || !selectedLesson.isInitialized) {
      alert("Please load and initialize the lesson captions first.");
      return;
    }

    if (!recognitionRef.current) {
      alert("Speech Recognition not supported on this browser. Try Google Chrome.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setRecognitionText("");
      setShadowScore(null);
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  // Compare shadow transcript
  useEffect(() => {
    if (recognitionText && activeTab === "shadow" && selectedLesson?.lines?.[currentLineIndex]) {
      const target = selectedLesson.lines[currentLineIndex].text;
      const score = getSimilarity(target, recognitionText);
      setShadowScore(score);
      markDayPracticed();
    }
  }, [recognitionText]);

  // Save word to backend database
  const handleSaveWord = async (wordObj: VocabWord) => {
    if (savedVocab.some(w => w.word.toLowerCase() === wordObj.word.toLowerCase())) return;
    const newWord = {
      ...wordObj,
      dateSaved: new Date().toLocaleDateString()
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
        method: "POST"
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

  // Import custom YT transcripts parser
  const handleImportCustom = () => {
    if (!customVideoUrl || !customTranscriptText) return;
    setIsCustomLoading(true);

    // Extract video ID
    let videoId = "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = customVideoUrl.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      alert("Invalid YouTube URL");
      setIsCustomLoading(false);
      return;
    }

    // Parse transcript lines (format: [00:15] sentence or 0:15 sentence or 00:15.20 sentence)
    const lines: ShadowLine[] = [];
    const textLines = customTranscriptText.split("\n");
    let currentStart = 0;

    textLines.forEach((rawLine, idx) => {
      const cleanLine = rawLine.trim();
      if (!cleanLine) return;

      // Match timestamp e.g. (00:15) or [01:23] or 1:23 or 00:05.10
      const timeMatch = cleanLine.match(/^[\[\(\s]*(\d+):(\d+)(?:\.(\d+))?[\]\)\s]*/);
      if (timeMatch) {
        const mins = parseInt(timeMatch[1]);
        const secs = parseInt(timeMatch[2]);
        const calculatedSeconds = mins * 60 + secs;
        const textOnly = cleanLine.replace(/^[\[\(\s]*\d+:\d+(?:\.\d+)?[\]\)\s]*/, "").trim();

        if (textOnly) {
          lines.push({
            start: calculatedSeconds,
            end: calculatedSeconds + 6, // default estimate 6 seconds segment duration
            text: textOnly
          });
        }
      } else {
        // Fallback: if no timestamp, build relative sequence
        if (cleanLine.length > 5) {
          lines.push({
            start: currentStart,
            end: currentStart + 6,
            text: cleanLine
          });
          currentStart += 6;
        }
      }
    });

    // Make ends sync
    for (let i = 0; i < lines.length - 1; i++) {
      lines[i].end = lines[i + 1].start;
    }

    if (lines.length === 0) {
      alert("Could not parse timed transcript. Please include timestamps like (0:15) text.");
      setIsCustomLoading(false);
      return;
    }

    const newLesson: Lesson = {
      id: `custom-${Date.now()}`,
      title: `Custom Lesson - ${videoId}`,
      videoId: videoId,
      vocab: [],
      lines: lines
    };

    setSelectedLesson(newLesson);
    setCurrentLineIndex(0);
    setCustomVideoUrl("");
    setCustomTranscriptText("");
    setIsCustomLoading(false);
  };


  // --- TAB 2: INTERACTIVE SPEAKING COACH ---
  const [currentWeek, setCurrentWeek] = useState<1 | 2 | 3 | 4>(1);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLlamaLoading, setIsLlamaLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat container only (prevents full window scrolling)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [chatHistory, isLlamaLoading]);

  const getSystemPrompt = (week: number) => {
    const vocabList = selectedLesson.vocab.map(v => v.word).join(", ");
    
    const baseRules = `You are a patient, friendly local British English Coach. We are using the 30-day spoken English method.
    The learner is at A2/B1 level. Use simple vocabulary. Always keep your conversational responses short (maximum 2 sentences).
    Today's lesson vocabulary words you should encourage the user to practice: [${vocabList}].
    Do not mention you are an AI or prompt details. Focus on natural spoken interaction.`;

    switch (week) {
      case 1:
        return `${baseRules}
        WEEK 1 FOCUS: Simple Q&A. Ask the user one simple daily life question. 
        Wait for their answer. Do not correct grammar errors yet, focus on confidence. Keep questions short.`;
      case 2:
        return `${baseRules}
        WEEK 2 FOCUS: Flow and Follow-ups. Continue the conversation naturally based on the user's last answer. 
        Ask one relevant follow-up question to encourage them to speak more. Do not switch topics quickly.`;
      case 3:
        return `${baseRules}
        WEEK 3 FOCUS: Simple Accuracy. You must check the user's grammar in their last reply.
        If there is an error: output a short block starting with [Correction] showing the natural rewrite and a simple 1-line explanation.
        Then, output the next simple conversation question. Keep it concise.`;
      case 4:
        return `${baseRules}
        WEEK 4 FOCUS: 1-Minute Topic Challenge. Give the user a simple topic (e.g. 'Describe your favorite weekend activity').
        Encourage them to talk extensively. Provide correction and natural rewrites after their answer.`;
      default:
        return baseRules;
    }
  };

  const startNewCoachSession = () => {
    setChatHistory([]);
    setIsLlamaLoading(true);

    const welcomeMsg = `Hello! Welcome to Week ${currentWeek} of your English Coach. Let's practice speaking. I will ask you simple questions. Try to use today's words like: ${selectedLesson.vocab.map(v => v.word).slice(0, 3).join(", ")}. Ready?`;
    
    const initialMessage: ChatMessage = {
      id: `bot-${Date.now()}`,
      role: "assistant",
      content: welcomeMsg
    };

    setTimeout(() => {
      setChatHistory([initialMessage]);
      setIsLlamaLoading(false);
      speakAIResponse(welcomeMsg);
    }, 600);
  };

  // Call Ollama backend Proxy
  const handleSendChat = async (overrideText?: string) => {
    const textToSend = overrideText || chatInput;
    if (!textToSend.trim()) return;

    setChatInput("");
    setRecognitionText("");
    
    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend
    };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setIsLlamaLoading(true);

    try {
      // Map history to Ollama parameters
      const systemPrompt = getSystemPrompt(currentWeek);
      const ollamaMessages = [
        { role: "system", content: systemPrompt },
        ...updatedHistory.map(h => ({ role: h.role, content: h.content }))
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3",
          messages: ollamaMessages,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 150
          }
        })
      });

      if (!response.ok) {
        throw new Error("Local Ollama connection failed.");
      }

      const data = await response.json();
      const botResponse = data.message?.content || "";

      // Parse grammar correction if in Week 3/4
      let cleanText = botResponse;
      let correctionData = undefined;

      // Extract simple correction tags [Correction] ...
      if (currentWeek >= 3 && botResponse.toLowerCase().includes("[correction]")) {
        const parts = botResponse.split(/\[correction\]/i);
        cleanText = parts[0].trim();
        const correctionBlock = parts[1]?.trim() || "";

        // Attempt basic parse of the correction text
        correctionData = {
          original: textToSend,
          corrected: correctionBlock.split("\n")[0] || "",
          explanation: correctionBlock.split("\n").slice(1).join(" ") || ""
        };
      }

      const assistantMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: cleanText,
        correction: correctionData
      };

      setChatHistory(prev => [...prev, assistantMsg]);
      speakAIResponse(cleanText);
      markDayPracticed();
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Oops! I could not connect to your local Ollama. Please make sure Ollama is running (`ollama run llama3`) on port 11434, and that the Vite proxy is active."
        }
      ]);
    } finally {
      setIsLlamaLoading(false);
    }
  };

  const handleRecordChatInput = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported on this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setRecognitionText("");
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  // Trigger send immediately on speech result in Chat Coach
  useEffect(() => {
    if (recognitionText && activeTab === "coach") {
      handleSendChat(recognitionText);
    }
  }, [recognitionText]);


  return (
    <section id="ai-speaking-lab" className="py-24 px-4 lg:px-8 relative z-10 max-w-7xl mx-auto border-t border-white/5">
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
          </div>
        </div>

        {/* Custom tabs selector using design system */}
        <div className="flex gap-2">
          {[
            { id: "shadow", label: "YouTube Shadowing", icon: Video },
            { id: "coach", label: "Ollama Llama3 Coach", icon: Sparkles },
            { id: "vocab", label: "Vocabulary & Streak", icon: BookOpen }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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

          {/* ======================================= */}
          {/* TAB 1: YOUTUBE SHADOWING HUB            */}
          {/* ======================================= */}
          {activeTab === "shadow" && (
            <>
              {/* Left Column: Player & Subtitles */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="rounded-[2rem] liquid-glass p-6 flex flex-col gap-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-2">
                    <div>
                      <h3 className="text-sm font-semibold tracking-wide text-white/90 uppercase">Shadowing Interactive Player</h3>
                      <p className="text-[10px] font-mono text-white/40 mt-1">Select a video from Jay's Sprout English playlist (36 lessons)</p>
                    </div>

                    <select
                      value={selectedLesson?.id || ""}
                      onChange={(e) => {
                        const target = lessonsList.find(l => l.id === e.target.value);
                        if (target) {
                          setSelectedLesson(target);
                          setCurrentLineIndex(0);
                          setShadowScore(null);
                        }
                      }}
                      className="bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer max-w-xs"
                    >
                      {lessonsList.map(l => (
                        <option key={l.id} value={l.id} className="bg-zinc-950 text-white text-xs">
                          {l.title.replace("🇬🇧", "").replace("⏰", "").trim()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!selectedLesson ? (
                    <div className="py-20 text-center text-xs text-white/40">Loading playlist lessons...</div>
                  ) : !selectedLesson.isInitialized ? (
                    <div className="py-12 px-6 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center text-center gap-4">
                      <Sparkles className="w-10 h-10 text-white/20 animate-pulse" />
                      <div className="max-w-md">
                        <h4 className="text-xs font-semibold text-white tracking-wide uppercase mb-1">Lesson Captions Not Loaded</h4>
                        <p className="text-[11px] text-white/50 leading-relaxed">
                          This lesson hasn't been initialized yet. We need to fetch real English subtitles from YouTube and run Llama-3 locally to extract key vocabulary.
                        </p>
                      </div>
                      <button
                        onClick={handleInitializeLesson}
                        disabled={isInitializingLesson}
                        className="px-6 py-2.5 rounded-full bg-white text-black text-xs font-semibold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:scale-100"
                      >
                        {isInitializingLesson ? (
                          <>
                            <span className="w-3 h-3 rounded-full border border-black border-t-transparent animate-spin inline-block mr-1" />
                            Running Llama-3 Lexicographer...
                          </>
                        ) : (
                          "Load Captions & Vocabulary"
                        )}
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* YouTube Player Container */}
                      <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-white/5">
                        <div id="youtube-player" className="absolute inset-0 w-full h-full" />
                      </div>

                      {/* Subtitles & Timed Lines list */}
                      <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-2">
                        {selectedLesson.lines.map((line, idx) => (
                          <button
                            key={idx}
                            onClick={() => playSegment(idx)}
                            className={`p-4 rounded-xl text-left transition-all flex justify-between items-center gap-4 ${
                              currentLineIndex === idx 
                                ? "bg-white/10 border border-white/20 text-white font-medium" 
                                : "bg-transparent border border-white/5 text-white/50 hover:text-white/80"
                            }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs">{line.text}</span>
                              <span className="text-[9px] font-mono opacity-50">
                                Time: {Math.floor(line.start / 60)}:{String(line.start % 60).padStart(2, "0")} - {Math.floor(line.end / 60)}:{String(line.end % 60).padStart(2, "0")}
                              </span>
                            </div>
                            <Play className="w-3.5 h-3.5 opacity-60 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Custom Sandbox Import Card */}
                <div className="rounded-3xl liquid-glass p-6">
                  <h4 className="text-xs font-semibold text-white tracking-wide uppercase mb-3">Custom YouTube Shadowing Sandbox</h4>
                  <div className="flex flex-col gap-4">
                    <input
                      type="text"
                      placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                      value={customVideoUrl}
                      onChange={(e) => setCustomVideoUrl(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                    />
                    <textarea
                      placeholder="Paste script with timestamps, e.g.:&#10;(00:15) Are you ready to crack on with the lesson?&#10;(00:21) We woke up at stupid o'clock."
                      value={customTranscriptText}
                      onChange={(e) => setCustomTranscriptText(e.target.value)}
                      rows={4}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 font-mono focus:outline-none focus:border-white/30 resize-none"
                    />
                    <button
                      onClick={handleImportCustom}
                      disabled={isCustomLoading}
                      className="py-2.5 rounded-full bg-white text-black hover:bg-white/90 text-xs font-semibold hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCustomLoading ? "Processing..." : "Import & Practice Custom Video"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Active Pronunciation Feedback & Vocab */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Active Line Shadowing Practice */}
                <div className="rounded-[2rem] liquid-glass p-6 flex flex-col gap-5 text-center">
                  <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block">Active Shadow Line</span>
                  
                  <div className="min-h-[60px] flex items-center justify-center">
                    <p className="text-sm font-medium leading-relaxed italic text-white">
                      "{selectedLesson.lines[currentLineIndex]?.text}"
                    </p>
                  </div>

                  {/* Micro scoring circular gauge */}
                  {shadowScore !== null && (
                    <div className="flex flex-col items-center gap-1.5 py-4 border-y border-white/5">
                      <div className="text-3xl font-bold tracking-tight font-mono">{shadowScore}%</div>
                      <span className="text-[10px] tracking-wide text-white/50 uppercase">Pronunciation Score</span>
                      <p className="text-xs mt-2 text-white/80">
                        {shadowScore >= 90 ? "Excellent pronunciation! Match is solid." :
                         shadowScore >= 70 ? "Good job! Try repeating once more for natural rhythm." :
                         "Keep practicing. Listen to Jay and copy the accent."}
                      </p>
                    </div>
                  )}

                  {/* Live speech match visual comparison */}
                  {recognitionText && (
                    <div className="text-left bg-black/45 p-4 rounded-2xl border border-white/5">
                      <span className="text-[9px] font-mono text-white/40 block mb-1">Your Speech:</span>
                      <p className="text-xs text-white/90 font-mono leading-relaxed">
                        {recognitionText}
                      </p>
                    </div>
                  )}

                  {/* Recording control button */}
                  <button
                    onClick={toggleRecordShadow}
                    className={`py-4 rounded-full flex items-center justify-center gap-3 transition-all hover:scale-[1.03] active:scale-95 cursor-pointer ${
                      isRecording 
                        ? "bg-white text-black font-semibold animate-pulse" 
                        : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-4 h-4 text-black animate-spin" />
                        <span className="text-xs font-semibold text-black uppercase">Recording... (Speak Now)</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 text-white" />
                        <span className="text-xs font-semibold uppercase">Shadow This Line</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Lesson Target Vocabulary card */}
                <div className="rounded-[2rem] liquid-glass p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Lesson Vocabulary</span>
                    <span className="text-[10px] text-white/30">{selectedLesson.vocab.length} items</span>
                  </div>

                  <div className="flex flex-col gap-3.5 max-h-[400px] overflow-y-auto pr-1">
                    {selectedLesson.vocab.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1.5 relative group">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-white">{item.word}</span>
                          <span className="text-[10px] font-mono text-white/50">{item.ipa}</span>
                        </div>
                        <p className="text-[11px] text-white/60 leading-normal">{item.definition}</p>
                        
                        <button
                          onClick={() => handleSaveWord(item)}
                          className="absolute right-3.5 bottom-3.5 w-6 h-6 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Save to notebook"
                        >
                          <Plus className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          )}

          {/* ======================================= */}
          {/* TAB 2: INTERACTIVE SPEAKING COACH       */}
          {/* ======================================= */}
          {activeTab === "coach" && (
            <div className="lg:col-span-12 rounded-[2.5rem] liquid-glass p-6 lg:p-8 flex flex-col justify-between min-h-[500px]">
              
              {/* Top settings row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono tracking-wider text-white/40 uppercase">30-Day Coach Progression</span>
                  <div className="flex gap-1.5">
                    {([1, 2, 3, 4] as const).map(w => (
                      <button
                        key={w}
                        onClick={() => setCurrentWeek(w)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-all border ${
                          currentWeek === w
                            ? "bg-white/10 border-white/20 text-white font-semibold"
                            : "bg-transparent border-white/5 text-white/40 hover:text-white"
                        }`}
                      >
                        W{w}
                      </button>
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
                      Select your week above, make sure your local Ollama is active, and click 'Reset AI Chat Session' to start practicing.
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
                        {msg.content}
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
              <div className="flex items-center gap-3 mt-6 border-t border-white/5 pt-4">
                
                {/* Hold to speak walkie talkie */}
                <button
                  onClick={handleRecordChatInput}
                  className={`px-5 py-3 rounded-full flex items-center justify-center gap-2 border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                    isRecording 
                      ? "bg-white text-black border-white animate-pulse" 
                      : "bg-white/5 text-white/80 hover:text-white border-white/10"
                  }`}
                >
                  {isRecording ? <MicOff className="w-4 h-4 text-black animate-spin" /> : <Mic className="w-4 h-4" />}
                  <span className="text-xs font-semibold uppercase">{isRecording ? "Listening..." : "Speak Input"}</span>
                </button>

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
          )}

          {/* ======================================= */}
          {/* TAB 3: VOCABULARY & STREAK NOTEBOOK     */}
          {/* ======================================= */}
          {activeTab === "vocab" && (
            <>
              {/* Left Column: Streak calendar */}
              <div className="lg:col-span-5 rounded-[2.5rem] liquid-glass p-6 lg:p-8 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold tracking-wide text-white/90 uppercase">Streak Tracker</h3>
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <Calendar className="w-3.5 h-3.5 text-white/50" />
                    <span>{streakDays.length} days active</span>
                  </div>
                </div>

                <p className="text-xs text-white/60 leading-relaxed">
                  Completing shadowing or conversation coach sessions marks the day practiced on your local calendar. Practice daily to reinforce learning!
                </p>

                {/* Minimal calendar grid */}
                <div className="grid grid-cols-7 gap-2 bg-black/45 p-4 rounded-2xl border border-white/5">
                  {Array.from({ length: 28 }).map((_, idx) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (27 - idx));
                    const dateStr = date.toISOString().split("T")[0];
                    const isPracticed = streakDays.includes(dateStr);
                    const dayLabel = date.getDate();
                    
                    return (
                      <div 
                        key={idx}
                        className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-mono transition-all border ${
                          isPracticed 
                            ? "bg-white text-black font-bold border-white" 
                            : "bg-transparent border-white/5 text-white/20"
                        }`}
                        title={dateStr}
                      >
                        {dayLabel}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Vocabulary notebooks list */}
              <div className="lg:col-span-7 rounded-[2.5rem] liquid-glass p-6 lg:p-8 flex flex-col gap-6 w-full">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <h3 className="text-sm font-semibold tracking-wide text-white/90 uppercase">Saved Vocabulary Notebook</h3>
                  <span className="text-[10px] font-mono text-white/40">{savedVocab.length} words saved</span>
                </div>

                {savedVocab.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center gap-3">
                    <BookOpen className="w-8 h-8 text-white/10" />
                    <p className="text-xs text-white/40">Your saved words list is currently empty. Add words while shadowing!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5 max-h-[480px] overflow-y-auto pr-1">
                    {savedVocab.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex justify-between items-start gap-4 relative group">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-white">{item.word}</span>
                            <span className="text-[10px] font-mono text-white/50">{item.ipa}</span>
                            <span className="text-[8px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                              {item.dateSaved}
                            </span>
                          </div>
                          <p className="text-xs text-white/70 leading-normal">{item.definition}</p>
                          <p className="text-xs text-white/45 italic leading-normal">"{item.example}"</p>
                        </div>
                        
                        <button
                          onClick={() => handleDeleteWord(item.word)}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                          title="Delete word"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white/60 hover:text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

        </div>

      </div>
    </section>
  );
}
