import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Play, Mic, MicOff, Plus, Sparkles, ArrowRight } from "lucide-react";
import type { Lesson, VocabWord, ShadowLine, UserProgress } from "./types";

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
        track[j - 1][i] + 1,
        track[j][i - 1] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  const distance = track[n2.length][n1.length];
  const maxLen = Math.max(n1.length, n2.length);
  return Math.round(((maxLen - distance) / maxLen) * 100);
};

interface ShadowingTabProps {
  selectedLesson: Lesson | null;
  isInitializingLesson: boolean;
  handleInitializeLesson: () => void;
  handleSaveWord: (word: VocabWord) => void;
  userProgress: UserProgress;
  updateProgressTask: (task: "listen" | "shadow" | "speak" | "game", completed: boolean) => void;
  setHasShadowedToday: (v: boolean) => void;
  changeTab: (tab: "shadow" | "coach" | "vocab" | "games") => void;
  // Speech recognition props passed from parent
  isRecording: boolean;
  volumeLevel: number;
  recognitionText: string;
  isSpeechSupported: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  setRecognitionText: (text: string) => void;
  audioQuality?: "poor" | "good" | "excellent";
  backgroundNoise?: number;
}

export default function ShadowingTab({
  selectedLesson,
  isInitializingLesson,
  handleInitializeLesson,
  handleSaveWord,
  userProgress,
  updateProgressTask,
  setHasShadowedToday,
  changeTab,
  isRecording,
  volumeLevel,
  recognitionText,
  isSpeechSupported,
  startRecording,
  stopRecording,
  setRecognitionText,
  audioQuality = "good",
  backgroundNoise = 0
}: ShadowingTabProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isPlayingSegment, setIsPlayingSegment] = useState(false);
  const [shadowScore, setShadowScore] = useState<number | null>(null);
  const [voicePlayMode, setVoicePlayMode] = useState<"none" | "loud" | "quiet" | "fast" | "slow">("none");
  const [customVideoUrl, setCustomVideoUrl] = useState("");
  const [customTranscriptText, setCustomTranscriptText] = useState("");
  const [isCustomLoading, setIsCustomLoading] = useState(false);
  const [localLesson, setLocalLesson] = useState<Lesson | null>(null);

  const playerRef = useRef<any>(null);
  const playCheckIntervalRef = useRef<any>(null);

  // Track the effective lesson (could be overridden by custom import)
  const effectiveLesson = localLesson || selectedLesson;

  // Reset local lesson when parent lesson changes
  useEffect(() => {
    setLocalLesson(null);
    setCurrentLineIndex(0);
    setShadowScore(null);
  }, [selectedLesson?.id]);

  // YouTube API loading script
  useEffect(() => {
    if (!effectiveLesson || !effectiveLesson.videoId) return;

    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    (window as any).onYouTubeIframeAPIReady = () => {
      if (effectiveLesson) initPlayer(effectiveLesson.videoId);
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer(effectiveLesson.videoId);
    }

    return () => {
      clearInterval(playCheckIntervalRef.current);
    };
  }, [effectiveLesson?.id]);

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
    if (!effectiveLesson || !effectiveLesson.isInitialized || !effectiveLesson.lines[lineIndex]) return;
    const line = effectiveLesson.lines[lineIndex];
    setCurrentLineIndex(lineIndex);
    setRecognitionText("");
    setShadowScore(null);
    setIsPlayingSegment(true);
    updateProgressTask("listen", true);

    playerRef.current.seekTo(line.start, true);
    playerRef.current.playVideo();

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
    if (!effectiveLesson || !effectiveLesson.isInitialized) {
      alert("Please load and initialize the lesson captions first.");
      return;
    }

    if (!isSpeechSupported) {
      alert("Speech Recognition not supported on this browser. Try Google Chrome.");
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      setShadowScore(null);
      startRecording();
    }
  };

  // Compare shadow transcript
  useEffect(() => {
    if (recognitionText && effectiveLesson?.lines?.[currentLineIndex]) {
      const target = effectiveLesson.lines[currentLineIndex].text;
      const score = getSimilarity(target, recognitionText);
      setShadowScore(score);
      if (score >= 80) {
        setHasShadowedToday(true);
        updateProgressTask("shadow", true);
        stopRecording();
      }
    }
  }, [recognitionText, effectiveLesson, currentLineIndex]);

  // Import custom YT transcripts parser
  const handleImportCustom = () => {
    if (!customVideoUrl || !customTranscriptText) return;
    setIsCustomLoading(true);

    let videoId = "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = customVideoUrl.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      alert("Invalid YouTube URL");
      setIsCustomLoading(false);
      return;
    }

    const lines: ShadowLine[] = [];
    const textLines = customTranscriptText.split("\n");
    let currentStart = 0;

    textLines.forEach((rawLine) => {
      const cleanLine = rawLine.trim();
      if (!cleanLine) return;

      const timeMatch = cleanLine.match(/^[\[\(\s]*(\d+):(\d+)(?:\.(\d+))?[\]\)\s]*/);
      if (timeMatch) {
        const mins = parseInt(timeMatch[1]);
        const secs = parseInt(timeMatch[2]);
        const calculatedSeconds = mins * 60 + secs;
        const textOnly = cleanLine.replace(/^[\[\(\s]*\d+:\d+(?:\.\d+)?[\]\)\s]*/, "").trim();

        if (textOnly) {
          lines.push({
            start: calculatedSeconds,
            end: calculatedSeconds + 6,
            text: textOnly
          });
        }
      } else {
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
      isInitialized: true,
      vocab: [],
      lines: lines
    };

    setLocalLesson(newLesson);
    setCurrentLineIndex(0);
    setCustomVideoUrl("");
    setCustomTranscriptText("");
    setIsCustomLoading(false);
  };

  return (
    <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Player & Subtitles */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        <div className="rounded-[2rem] liquid-glass p-6 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-2">
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-white/90 uppercase">Shadowing Interactive Player</h3>
              <p className="text-[10px] font-mono text-white/40 mt-1">Select a video from Jay's Sprout English playlist (36 lessons)</p>
            </div>

            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/95 font-medium font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>DAY {userProgress.currentDay} LOCK</span>
            </div>
          </div>

          {!effectiveLesson ? (
            <div className="py-20 text-center text-xs text-white/40">Loading playlist lessons...</div>
          ) : (
            <>
              {/* YouTube Player Container - ALWAYS MOUNTED to prevent black screen issues */}
              <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-white/5">
                <div id="youtube-player" className="absolute inset-0 w-full h-full" />
              </div>

              {!effectiveLesson.isInitialized ? (
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
                /* Subtitles & Timed Lines list */
                <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-2">
                  {effectiveLesson.lines.map((line, idx) => (
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
              )}
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
              placeholder={"Paste script with timestamps, e.g.:\n(00:15) Are you ready to crack on with the lesson?\n(00:21) We woke up at stupid o'clock."}
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
              "{effectiveLesson?.lines?.[currentLineIndex]?.text || "No active line selected."}"
            </p>
          </div>

          {/* Voice Play Modes (Piano Practice) */}
          <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
            <span className="text-[9px] font-mono tracking-wider text-white/30 uppercase block">Voice Play Challenge (Piano Practice)</span>
            <div className="grid grid-cols-4 gap-2">
              {[
                { mode: "loud", label: "Loud", icon: "🔊" },
                { mode: "quiet", label: "Quiet", icon: "🤫" },
                { mode: "fast", label: "Fast", icon: "⚡" },
                { mode: "slow", label: "Slow", icon: "🐌" }
              ].map((item) => {
                const isSelected = voicePlayMode === item.mode;
                return (
                  <button
                    key={item.mode}
                    onClick={() => setVoicePlayMode(voicePlayMode === item.mode ? "none" : (item.mode as any))}
                    className={`py-2 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white text-black border-white scale-[1.03]"
                        : "bg-black/20 border-white/5 text-white/70 hover:text-white"
                    }`}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-[9px] font-mono">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {voicePlayMode !== "none" && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-2xl border text-left text-xs leading-relaxed ${
                  voicePlayMode === "loud" ? "bg-red-950/20 border-red-500/10 text-red-300" :
                  voicePlayMode === "quiet" ? "bg-blue-950/20 border-blue-500/10 text-blue-300" :
                  voicePlayMode === "fast" ? "bg-yellow-950/20 border-yellow-500/10 text-yellow-300" :
                  "bg-green-950/20 border-green-500/10 text-green-300"
                }`}
              >
                <div className="font-semibold uppercase tracking-wider text-[9px] font-mono mb-1">
                  Active Exercise: Play with your {voicePlayMode === "loud" || voicePlayMode === "quiet" ? "Volume" : "Speed"}!
                </div>
                <p className="text-[10px] opacity-95">
                  {voicePlayMode === "loud" && "Speak at maximum volume. Open your mouth wide, project from your diaphragm, and exaggerate articulation. This builds mouth muscle memory and confidence."}
                  {voicePlayMode === "quiet" && "Speak in a quiet whisper or soft tone. Slow down your rate of speech and pay extreme attention to the precise placement of your tongue and lips. Perfect for high-detail accuracy."}
                  {voicePlayMode === "fast" && "Speak as fast as you can while trying to keep up. This challenges your tongue, lips, and jaw to coordinate quickly under speed pressure. Repeat multiple times."}
                  {voicePlayMode === "slow" && "Speak at a very slow, deliberate pace. Focus on complete clarity, making sure to fully enunciate every single syllable and vowel length. Builds baseline precision."}
                </p>
              </motion.div>
            )}
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
          {isSpeechSupported ? (
            <button
              onClick={toggleRecordShadow}
              disabled={isRecording}
              className={`py-4 rounded-full flex items-center justify-center gap-3 transition-all hover:scale-[1.03] active:scale-95 cursor-pointer ${
                isRecording 
                  ? "bg-white text-black font-semibold opacity-70 cursor-not-allowed" 
                  : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4 text-black" />
                  <span className="text-xs font-semibold text-black uppercase">Recording... (Speak Now)</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-white" />
                  <span className="text-xs font-semibold uppercase">Shadow This Line</span>
                </>
              )}
            </button>
          ) : (
            <div 
              className="py-4 rounded-full bg-red-950/20 border border-red-500/10 text-red-400 text-xs font-semibold text-center"
              title="Speech recognition requires Google Chrome or Chromium browsers."
            >
              Speech Recognition Unsupported
            </div>
          )}

          {isRecording && (
            <div className="flex flex-col items-center gap-1.5 mt-2 bg-black/30 py-3 rounded-2xl border border-white/5">
              {/* Enhanced Audio Quality Indicator */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider ${
                  audioQuality === "excellent" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                  audioQuality === "good" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                  "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                }`}>
                  {audioQuality === "excellent" ? "✓ Excellent Mic" : audioQuality === "good" ? "✓ Good Mic" : "⚠ Adjust Mic"}
                </div>
                {backgroundNoise > 0 && (
                  <span className="text-[9px] font-mono text-white/40">
                    Noise: {backgroundNoise}%
                  </span>
                )}
              </div>
              
              {/* Voice Level Meter */}
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
                        active ? 
                          audioQuality === "excellent" ? "bg-green-400" :
                          audioQuality === "good" ? "bg-blue-400" : "bg-yellow-400"
                          : "bg-white/10"
                      }`}
                      style={{ height: `${height}px` }}
                    />
                  );
                })}
              </div>
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest animate-pulse">
                Voice Level (Auto-stop on silence)
              </span>
              
              {/* Shadowing Tips based on quality */}
              {audioQuality === "poor" && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-[9px] text-yellow-300 text-center"
                >
                  💡 Tip: Move closer to microphone or reduce background noise for better recognition
                </motion.div>
              )}
            </div>
          )}

          {/* Task transition guidance card */}
          {userProgress.todayTasks.listen && userProgress.todayTasks.shadow && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-center flex flex-col gap-3 mt-4"
            >
              <p className="text-xs text-green-300 font-medium">
                ✓ Listen & Shadow tasks completed!
              </p>
              <button
                onClick={() => changeTab("coach")}
                className="py-2.5 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-semibold hover:scale-102 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                <span>Start Speaking with AI Coach</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </button>
            </motion.div>
          )}
        </div>

        {/* Lesson Target Vocabulary card */}
        <div className="rounded-[2rem] liquid-glass p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Lesson Vocabulary</span>
            <span className="text-[10px] text-white/30">{effectiveLesson?.vocab?.length || 0} items</span>
          </div>

          <div className="flex flex-col gap-3.5 max-h-[400px] overflow-y-auto pr-1">
            {(effectiveLesson?.vocab || []).map((item, idx) => (
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
  );
}
