// ─── Core Domain Types ──────────────────────────────────────────────────────

export interface VideoLesson {
  youtubeUrl: string;
  videoId: string;
  title?: string;
  transcript: TranscriptSegment[];
  rawTranscript: string;
  fetchedAt: Date;
}

export interface TranscriptSegment {
  text: string;
  offset: number;  // ms
  duration: number; // ms
}

// ─── Vocabulary ──────────────────────────────────────────────────────────────

export interface VocabItem {
  word: string;
  ipa: string;
  partOfSpeech: string;
  definition: string;
  example: string;           // example from the actual video
  contextTimestamp?: number; // ms offset in video where it appears
}

export interface VocabExtractionResult {
  vocab: VocabItem[];
  topic: string;             // inferred topic of the video
  keyPhrases: string[];      // collocations/phrases to practice
}

// ─── Speaking Session ────────────────────────────────────────────────────────

export type SessionPhase = "shadow" | "practice" | "whatif" | "debrief";

export interface SessionContext {
  lesson: VideoLesson;
  vocab: VocabExtractionResult;
  phase: SessionPhase;
  history: ConversationTurn[];
  sessionStarted: Date;
  turnsCompleted: number;
}

export interface ConversationTurn {
  role: "coach" | "learner";
  text: string;
  timestamp: Date;
  phase: SessionPhase;
  feedbackScore?: number; // 1-5, set by coach on learner turns
}

// ─── AI Coach Response ───────────────────────────────────────────────────────

export interface CoachResponse {
  reply: string;                    // what the coach says next
  whatIfPrompt?: string;            // "What if..." follow-up question
  usedVocab: string[];              // vocab words coach wove into the reply
  feedbackOnLearner?: FeedbackNote; // if coach is reacting to learner speech
  suggestedNextPhase?: SessionPhase;
}

export interface FeedbackNote {
  score: number;           // 1–5
  strengths: string[];
  improvements: string[];
  naturalAlternative?: string; // more natural way to say what learner said
}

// ─── Harness Test Results ────────────────────────────────────────────────────

export interface HarnessTestResult {
  testName: string;
  passed: boolean;
  durationMs: number;
  output?: unknown;
  error?: string;
}

// ─── OpenRouter Config ───────────────────────────────────────────────────────

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  referer: string;
  appTitle: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
