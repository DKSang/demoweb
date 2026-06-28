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
  Settings,
  Pencil
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

const StreakSprout = ({ streak }: { streak: number }) => {
  // 0: seed, 1-2: sprout, 3-4: plant, 5+: flower
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
            {/* Stem */}
            <path d="M 60 120 Q 60 90 55 75" className="stroke-white/70" strokeWidth="3" />
            {/* First pair of leaves */}
            <path d="M 58 100 Q 40 95 45 85 Q 55 90 58 100" className="fill-white/10 stroke-white/60" />
            <path d="M 59 95 Q 75 90 70 80 Q 62 85 59 95" className="fill-white/10 stroke-white/60" />
          </>
        )}

        {/* Plant Stage */}
        {(stage === "plant" || stage === "flower") && (
          <>
            {/* Upper stem */}
            <path d="M 55 75 Q 50 50 60 35" className="stroke-white/90" />
            {/* Second pair of leaves */}
            <path d="M 53 70 Q 35 60 42 50 Q 50 60 53 70" className="fill-white/20 stroke-white/80" />
            <path d="M 54 62 Q 70 52 68 42 Q 58 50 54 62" className="fill-white/20 stroke-white/80" />
          </>
        )}

        {/* Flower Stage */}
        {stage === "flower" && (
          <>
            {/* Flower head */}
            <circle cx="60" cy="35" r="8" className="fill-white/10 stroke-white animate-pulse" />
            {/* Petals */}
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
  
  // Shadowing hub state declarations moved to top to prevent use-before-declaration errors
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isPlayingSegment, setIsPlayingSegment] = useState(false);
  const [shadowScore, setShadowScore] = useState<number | null>(null);
  const [customVideoUrl, setCustomVideoUrl] = useState("");
  const [customTranscriptText, setCustomTranscriptText] = useState("");
  const [isCustomLoading, setIsCustomLoading] = useState(false);
  const playerRef = useRef<any>(null);
  const playCheckIntervalRef = useRef<any>(null);
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
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
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const changeTab = (tabId: "shadow" | "coach" | "vocab") => {
    setActiveTab(tabId);
    if (tabId === "shadow") {
      window.location.hash = "#shadowing-lab";
    } else if (tabId === "coach") {
      window.location.hash = "#ai-coach";
    } else if (tabId === "vocab") {
      window.location.hash = "#vocab-notebook";
    }
  };

  // Local state persistence keys
  const [savedVocab, setSavedVocab] = useState<SavedWord[]>([]);
  const [streakDays, setStreakDays] = useState<string[]>([]);
  const [lessonsList, setLessonsList] = useState<Lesson[]>([]);
  const [isInitializingLesson, setIsInitializingLesson] = useState(false);

  // Notebook/Review Game states
  const [vocabSubTab, setVocabSubTab] = useState<"saved" | "foundational" | "review" | "add">("saved");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [reviewScores, setReviewScores] = useState({ correct: 0, total: 0 });

  // Add new word form state
  const [newWordForm, setNewWordForm] = useState({
    word: "",
    ipa: "",
    definition: "",
    example: ""
  });
  const [isInferring, setIsInferring] = useState(false);

  // Daily task lock & status states
  const [hasShadowedToday, setHasShadowedToday] = useState(false);
  const [hasChattedToday, setHasChattedToday] = useState(false);

  // Common vocabulary database state
  const [commonVocab, setCommonVocab] = useState<VocabWord[]>([]);
  const [flippedWords, setFlippedWords] = useState<string[]>([]);
  const [foundationalPage, setFoundationalPage] = useState(1);
  const wordsPerPage = 12;

  // Timezone-safe local date string generator (YYYY-MM-DD)
  const getLocalDateString = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  };

  const toggleFlippedWord = (word: string) => {
    setFlippedWords(prev => 
      prev.includes(word) ? prev.filter(w => w !== word) : [...prev, word]
    );
  };

  const getConsecutiveStreak = (days: string[]): number => {
    if (days.length === 0) return 0;
    
    // Sort descending by day timestamp
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
      return 0; // Streak broken
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

  // Speech Web API instances
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionText, setRecognitionText] = useState("");
  const recognitionRef = useRef<any>(null);

  // Text-To-Speech (TTS) Settings
  const [ttsSpeed, setTtsSpeed] = useState(0.95);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [voicesList, setVoicesList] = useState<SpeechSynthesisVoice[]>([]);
  const [ollamaModel, setOllamaModel] = useState<string>("llama3");

  // Daily Progression and Tasks State
  const [userProgress, setUserProgress] = useState<any>({
    currentDay: 1,
    completedDays: {},
    todayTasks: { listen: false, shadow: false, speak: false, quiz: false }
  });

  const [quizState, setQuizState] = useState<{
    questions: { word: string; question: string; correctAnswer: string; options: string[] }[];
    currentQuestionIndex: number;
    selectedAnswers: Record<number, string>;
    isFinished: boolean;
    score: number;
  }>({
    questions: [],
    currentQuestionIndex: 0,
    selectedAnswers: {},
    isFinished: false,
    score: 0
  });

  // Load local state
  useEffect(() => {
    // Fetch vocabulary from backend
    fetch("/api/vocabulary")
      .then(res => res.json())
      .then(data => setSavedVocab(data))
      .catch(err => console.error("Failed to fetch vocabulary:", err));

    // Fetch foundational common vocabulary from backend
    fetch("/api/common-vocabulary")
      .then(res => res.json())
      .then(data => setCommonVocab(data))
      .catch(err => console.error("Failed to fetch common vocabulary:", err));

    // Fetch streaks from backend
    fetch("/api/streaks")
      .then(res => res.json())
      .then(data => setStreakDays(data))
      .catch(err => console.error("Failed to fetch streaks:", err));

    // Fetch progression from backend
    fetch("/api/progress")
      .then(res => res.json())
      .then(data => setUserProgress(data))
      .catch(err => console.error("Failed to fetch user progress:", err));

    // Fetch lessons list from backend
    fetch("/api/lessons")
      .then(res => res.json())
      .then(data => {
        setLessonsList(data);
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
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-GB";

      rec.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          if (activeTabRef.current === "shadow") {
            setRecognitionText(prev => prev + finalTranscript);
          } else {
            setChatInput(prev => prev + finalTranscript);
          }
        }
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

  // Automatically select/lock lesson based on active day progression
  useEffect(() => {
    if (lessonsList.length > 0 && userProgress?.currentDay) {
      const activeDay = userProgress.currentDay;
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
  }, [userProgress?.currentDay, lessonsList]);

  // Generate quiz when subtab is quiz or selectedLesson changes
  useEffect(() => {
    if (vocabSubTab === "quiz") {
      generateQuiz();
    }
  }, [vocabSubTab, selectedLesson]);

  // Automatically initialize lesson if not already initialized
  useEffect(() => {
    if (selectedLesson && !selectedLesson.isInitialized && !isInitializingLesson) {
      handleInitializeLesson();
    }
  }, [selectedLesson]);

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
  // (State declarations moved to top)

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
    const container = document.getElementById("youtube-player");
    if (playerRef.current && container && container.tagName === "IFRAME") {
      try {
        playerRef.current.loadVideoById(videoId);
        return;
      } catch (err) {
        console.warn("Failed to load video on existing player iframe, recreating...", err);
      }
    }

    // If container was unmounted (reverted to a DIV), the old player iframe is dead.
    // We clean up the old instance and construct a new YT player.
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {}
      playerRef.current = null;
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
    updateProgressTask("listen", true);

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
      if (score >= 50) {
        setHasShadowedToday(true);
        updateProgressTask("shadow", true);
      }
    }
  }, [recognitionText]);

  // Save word to backend database
  const handleSaveWord = async (wordObj: VocabWord) => {
    if (savedVocab.some(w => w.word.toLowerCase() === wordObj.word.toLowerCase())) return;
    const newWord = {
      ...wordObj,
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

  // Handle adding a new custom word from the form
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
      example: newWordForm.example.trim() || ""
    };

    await handleSaveWord(wordObj);
    
    // Reset form and switch to saved tab
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
          model: ollamaModel,
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
      alert("Could not connect to Ollama. Make sure Ollama is active locally.");
    } finally {
      setIsInferring(false);
    }
  };

  const updateProgressTask = async (taskName: "listen" | "shadow" | "speak" | "quiz", completed: boolean) => {
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

  const generateQuiz = () => {
    if (!selectedLesson || !selectedLesson.vocab || selectedLesson.vocab.length === 0) {
      setQuizState({
        questions: [],
        currentQuestionIndex: 0,
        selectedAnswers: {},
        isFinished: false,
        score: 0
      });
      return;
    }

    const vocabList = selectedLesson.vocab;
    const questions = vocabList.map(item => {
      const correctAnswer = item.definition;
      const distractors: string[] = [];
      const allPossibleDistractors = [
        ...commonVocab.map((w: any) => w.definition),
        ...(lessonsList.flatMap(l => l.vocab || []).map(w => w.definition))
      ].filter(def => def && def.toLowerCase() !== correctAnswer.toLowerCase());

      const shuffledDistractors = allPossibleDistractors.sort(() => 0.5 - Math.random());
      for (const def of shuffledDistractors) {
        if (distractors.length < 3 && !distractors.includes(def)) {
          distractors.push(def);
        }
      }

      while (distractors.length < 3) {
        distractors.push(`Definition placeholder ${distractors.length + 1}`);
      }

      const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());

      return {
        word: item.word,
        question: `What does the word "${item.word}" mean?`,
        correctAnswer,
        options
      };
    });

    setQuizState({
      questions,
      currentQuestionIndex: 0,
      selectedAnswers: {},
      isFinished: false,
      score: 0
    });
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
    const vocabList = selectedLesson?.vocab?.map(v => v.word).join(", ") || "";
    const lessonTitle = selectedLesson?.title ? selectedLesson.title.replace("🇬🇧", "").trim() : "English Conversation";
    
    // Extract all transcript lines of the video to give the model full contextual understanding
    const transcriptSnippet = selectedLesson?.lines?.map(l => l.text).join(" | ") || "";
    
    const baseRules = `You are a patient, friendly local British English Coach. We are practicing conversational English based on the lesson: "${lessonTitle}".
    The learner is at A2/B1 level. Use simple vocabulary. Always keep your conversational responses short (maximum 2 sentences).
    Today's lesson vocabulary words you should encourage the user to practice: [${vocabList}].
    ${transcriptSnippet ? `Context of the video lesson (subtitles snippet): "${transcriptSnippet}". Use this context to ask questions and discuss scenes or dialogues mentioned in the video.` : `Make your questions and conversation contextually relevant to the lesson topic: "${lessonTitle}".`}
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

    const lessonTitle = selectedLesson?.title ? selectedLesson.title.replace("🇬🇧", "").trim() : "this lesson";
    const welcomeMsg = `Hello! Let's start Week ${currentWeek} of your English Coach. Today we will practice speaking about "${lessonTitle}". Try to use vocabulary words like: ${selectedLesson?.vocab?.map(v => v.word).slice(0, 3).join(", ") || "our target words"}. Ready?`;
    
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

  const handleSendChat = async (overrideText?: string) => {
    const textToSend = overrideText || chatInput;
    if (!textToSend.trim()) return;

    setHasChattedToday(true);
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

    const botId = `bot-${Date.now()}`;
    const placeholderMsg: ChatMessage = {
      id: botId,
      role: "assistant",
      content: ""
    };
    setChatHistory(prev => [...prev, placeholderMsg]);
    setIsLlamaLoading(false); // set to false because stream displays immediately

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
          model: ollamaModel,
          messages: ollamaMessages,
          stream: true,
          options: {
            temperature: 0.7,
            num_predict: 60, // limit to 60 tokens to speed up local Ollama response
            num_ctx: 2048   // reduce context memory window size for faster inference
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

      // Stream is complete! Parse grammar correction and speak.
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
                id: `error-${Date.now()}`,
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
    if (!recognitionRef.current) {
      alert("Speech recognition not supported on this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      // Wait briefly for final recognition results to flush and populate chatInput
      setTimeout(() => {
        setChatInput(prev => {
          const finalVal = prev.trim();
          if (finalVal) {
            handleSendChat(finalVal);
          }
          return "";
        });
      }, 400);
    } else {
      setChatInput("");
      setRecognitionText("");
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };


  const isDayComplete = !!(userProgress?.todayTasks?.listen && userProgress?.todayTasks?.shadow && userProgress?.todayTasks?.speak && userProgress?.todayTasks?.quiz);

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
                value={ollamaModel} 
                onChange={(e) => setOllamaModel(e.target.value)}
                className="bg-transparent border-none text-white focus:outline-none cursor-pointer max-w-[120px]"
                title="Select Ollama Model"
              >
                <option value="llama3" className="bg-zinc-950 text-white">llama3</option>
                <option value="llama3.2" className="bg-zinc-950 text-white">llama3.2</option>
                <option value="llama3.2:3b" className="bg-zinc-950 text-white">llama3.2:3b</option>
                <option value="llama3.2:1b" className="bg-zinc-950 text-white">llama3.2:1b</option>
                <option value="gemma2:2b" className="bg-zinc-950 text-white">gemma2:2b</option>
              </select>
            </div>
          </div>
        </div>

        {/* Progression Status Bar Card */}
        <div className="w-full rounded-2xl bg-white/5 border border-white/5 p-5 mt-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-white text-black font-bold font-mono text-[10px]">
                DAY {userProgress.currentDay}
              </span>
              <span className="text-white font-medium text-sm">
                Active Lesson: <span className="font-serif italic text-white/95">{selectedLesson?.title.replace("🇬🇧", "").trim() || "Loading..."}</span>
              </span>
            </div>
            <p className="text-white/40 text-[10px] font-mono">
              Complete the 4 tasks below to unlock the next day's lesson.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Task 1: Listen */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/35 border border-white/5">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                userProgress.todayTasks.listen 
                  ? "bg-green-500 border-green-500 text-black" 
                  : "border-white/20 text-transparent"
              }`}>
                {userProgress.todayTasks.listen && <Check className="w-2.5 h-2.5" />}
              </div>
              <span className={userProgress.todayTasks.listen ? "text-green-300 font-semibold" : "text-white/60"}>1. Listen</span>
            </div>

            {/* Task 2: Shadow */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/35 border border-white/5">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                userProgress.todayTasks.shadow 
                  ? "bg-green-500 border-green-500 text-black" 
                  : "border-white/20 text-transparent"
              }`}>
                {userProgress.todayTasks.shadow && <Check className="w-2.5 h-2.5" />}
              </div>
              <span className={userProgress.todayTasks.shadow ? "text-green-300 font-semibold" : "text-white/60"}>2. Shadow</span>
            </div>

            {/* Task 3: Speak */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/35 border border-white/5">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                userProgress.todayTasks.speak 
                  ? "bg-green-500 border-green-500 text-black" 
                  : "border-white/20 text-transparent"
              }`}>
                {userProgress.todayTasks.speak && <Check className="w-2.5 h-2.5" />}
              </div>
              <span className={userProgress.todayTasks.speak ? "text-green-300 font-semibold" : "text-white/60"}>3. Speak</span>
            </div>

            {/* Task 4: Quiz */}
            <button
              onClick={() => {
                setActiveTab("vocab");
                setVocabSubTab("quiz");
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/35 hover:bg-black/60 border border-white/5 hover:border-white/20 transition-all cursor-pointer text-left"
            >
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                userProgress.todayTasks.quiz 
                  ? "bg-green-500 border-green-500 text-black" 
                  : "border-white/20 text-transparent"
              }`}>
                {userProgress.todayTasks.quiz && <Check className="w-2.5 h-2.5" />}
              </div>
              <span className={userProgress.todayTasks.quiz ? "text-green-300 font-semibold" : "text-white/60"}>4. Quiz</span>
            </button>

            {/* Reset progress */}
            <button
              onClick={async () => {
                if (confirm("Are you sure you want to reset your progression back to Day 1?")) {
                  const res = await fetch("/api/progress/reset", { method: "POST" });
                  if (res.ok) {
                    const data = await res.json();
                    setUserProgress(data);
                  }
                }
              }}
              className="px-2.5 py-1.5 rounded-xl hover:bg-white/5 text-[9px] font-mono text-white/30 hover:text-white/60 border border-transparent hover:border-white/5 transition-all cursor-pointer"
              title="Reset Progression"
            >
              Reset
            </button>
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

          {/* ======================================= */}
          {/* TAB 1: YOUTUBE SHADOWING HUB            */}
          {/* ======================================= */}
          <div className={`lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start ${activeTab === "shadow" ? "" : "hidden"}`}>
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
                      {(() => {
                        const todayStr = getLocalDateString();
                        const isDailyCompleted = streakDays.includes(todayStr) || (hasShadowedToday && hasChattedToday);
                        
                        return lessonsList.map((l, idx) => {
                          const isLocked = !isDailyCompleted && idx > 0 && l.id !== selectedLesson?.id;
                          return (
                            <option key={l.id} value={l.id} disabled={isLocked} className="bg-zinc-950 text-white text-xs">
                              {isLocked ? `🔒 ${l.title.replace("🇬🇧", "").replace("⏰", "").trim()}` : l.title.replace("🇬🇧", "").replace("⏰", "").trim()}
                            </option>
                          );
                        });
                      })()}
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
                      "{selectedLesson?.lines?.[currentLineIndex]?.text || "No active line selected."}"
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
                    <span className="text-[10px] text-white/30">{selectedLesson?.vocab?.length || 0} items</span>
                  </div>

                  <div className="flex flex-col gap-3.5 max-h-[400px] overflow-y-auto pr-1">
                    {(selectedLesson?.vocab || []).map((item, idx) => (
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
          </div>

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
              {/* Left Column: Streak calendar & growth sprout */}
              <div className="lg:col-span-5 rounded-[2.5rem] liquid-glass p-6 lg:p-8 flex flex-col gap-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <h3 className="text-sm font-semibold tracking-wide text-white/90 uppercase">Progress Dashboard</h3>
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <Calendar className="w-3.5 h-3.5 text-white/50" />
                    <span>{streakDays.length} active days</span>
                  </div>
                </div>

                {/* Animated Botanical Sprout Growth Sprout */}
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

                {/* Minimal calendar grid */}
                <div className="grid grid-cols-7 gap-2 bg-black/45 p-4 rounded-2xl border border-white/5">
                  {Array.from({ length: 28 }).map((_, idx) => {
                    const date = new Date();
                    date.setHours(12, 0, 0, 0); // avoid DST shift
                    date.setDate(date.getDate() - (27 - idx));
                    const dateStr = getLocalDateString(date);
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
                      <span className="text-white/60">2. Message Ollama AI Coach</span>
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
                        setVocabSubTab("quiz");
                        setQuizState({
                          questions: [],
                          currentQuestionIndex: 0,
                          selectedAnswers: {},
                          isFinished: false,
                          score: 0
                        });
                      }}
                      className={`text-xs font-semibold tracking-wide uppercase pb-2 border-b-2 transition-all cursor-pointer ${
                        vocabSubTab === "quiz" ? "text-white border-white" : "text-white/40 border-transparent hover:text-white/70"
                      }`}
                    >
                      Daily Quiz
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
                  savedVocab.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-3">
                      <BookOpen className="w-8 h-8 text-white/10" />
                      <p className="text-xs text-white/40">Your saved words list is empty. Save words during shadowing!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[480px] overflow-y-auto pr-1">
                      {savedVocab.map((item, idx) => (
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
                  )
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
                              
                              {/* Front Face */}
                              <div className="absolute inset-0 w-full h-full backface-hidden rounded-xl border border-white/5 bg-black/45 flex flex-col items-center justify-center p-3 text-center shadow">
                                <span className="text-xs font-bold text-white tracking-wide">{item.word}</span>
                                <span className="text-[9px] font-mono text-white/40 mt-1">{item.ipa}</span>
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
                ) : vocabSubTab === "quiz" ? (
                  quizState.questions.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-3 bg-black/45 rounded-2xl border border-white/5 p-6">
                      <Sparkles className="w-8 h-8 text-white/10" />
                      <p className="text-xs text-white/40">No vocabulary words available for this lesson. Please initialize the lesson to start the quiz.</p>
                    </div>
                  ) : quizState.isFinished ? (
                    <div className="py-16 text-center flex flex-col items-center gap-6 bg-black/45 rounded-2xl border border-white/5 p-6">
                      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center animate-bounce">
                        <Sparkles className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <h4 className="text-base font-semibold text-white uppercase tracking-wider">Quiz Completed!</h4>
                        <p className="text-xs text-white/60">
                          {quizState.score === quizState.questions.length
                            ? "Perfect! You got all definitions correct and finished the quiz!"
                            : `You scored ${quizState.score} out of ${quizState.questions.length}. You need 100% correct to complete this task.`}
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={generateQuiz}
                          className="px-6 py-3 rounded-full bg-white text-black text-xs font-semibold hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          Retry Quiz
                        </button>
                        {quizState.score === quizState.questions.length && (
                          <button
                            onClick={() => setVocabSubTab("saved")}
                            className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold hover:scale-105 active:scale-95 transition-all cursor-pointer"
                          >
                            Back to Saved
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black/45 p-6 rounded-2xl border border-white/5 flex flex-col gap-5">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                          Question {quizState.currentQuestionIndex + 1} of {quizState.questions.length}
                        </span>
                        <span className="text-[10px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded">
                          Word: {quizState.questions[quizState.currentQuestionIndex].word}
                        </span>
                      </div>
                      <p className="text-xs text-white font-medium">
                        {quizState.questions[quizState.currentQuestionIndex].question}
                      </p>
                      <div className="flex flex-col gap-3 mt-2">
                        {quizState.questions[quizState.currentQuestionIndex].options.map((option, idx) => {
                          const isSelected = quizState.selectedAnswers[quizState.currentQuestionIndex] === option;
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                setQuizState(prev => {
                                  const answers = { ...prev.selectedAnswers, [prev.currentQuestionIndex]: option };
                                  const isLast = prev.currentQuestionIndex === prev.questions.length - 1;
                                  if (isLast) {
                                    let score = 0;
                                    prev.questions.forEach((q, qidx) => {
                                      if (answers[qidx] === q.correctAnswer) {
                                        score++;
                                      }
                                    });
                                    if (score === prev.questions.length) {
                                      updateProgressTask("quiz", true);
                                    }
                                    return {
                                      ...prev,
                                      selectedAnswers: answers,
                                      isFinished: true,
                                      score
                                    };
                                  } else {
                                    return {
                                      ...prev,
                                      selectedAnswers: answers,
                                      currentQuestionIndex: prev.currentQuestionIndex + 1
                                    };
                                  }
                                });
                              }}
                              className={`w-full text-left p-3.5 rounded-xl text-xs leading-relaxed border transition-all duration-200 hover:scale-[1.01] active:scale-95 cursor-pointer ${
                                isSelected
                                  ? "bg-white text-black border-white font-medium"
                                  : "bg-black/60 text-white/80 border-white/5 hover:border-white/10 hover:bg-black/85"
                              }`}
                            >
                              <span className="font-mono text-white/40 mr-2">{String.fromCharCode(65 + idx)}.</span>
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )
                ) : (
                  // Review flashcard game mode
                  savedVocab.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-3">
                      <BookOpen className="w-8 h-8 text-white/10" />
                      <p className="text-xs text-white/40">Your saved words list is empty. Add words while shadowing to play!</p>
                    </div>
                  ) : reviewIndex >= savedVocab.length ? (
                    // Game completion state
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
                    // Active card game view
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
                          
                          {/* Front Side */}
                          <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl border border-white/10 bg-black/40 flex flex-col items-center justify-center p-6 text-center select-none shadow-xl">
                            <span className="text-2xl font-bold tracking-tight text-white mb-2">{savedVocab[reviewIndex].word}</span>
                            <span className="text-xs font-mono text-white/50">{savedVocab[reviewIndex].ipa}</span>
                            <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest mt-6 bg-white/5 px-2.5 py-1 rounded-full animate-pulse">
                              Click card to reveal definition
                            </span>
                          </div>

                          {/* Back Side */}
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
                  Congratulations! You completed all daily tasks (Listen, Shadow, Speak with AI, and Quiz) for the lesson:
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
                      // Fetch updated streaks
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
