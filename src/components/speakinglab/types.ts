/**
 * Shared type definitions for the AI Speaking Lab component system.
 */

export interface VocabWord {
  word: string;
  ipa: string;
  definition: string;
  example: string;
  day?: number;
}

export interface ShadowLine {
  start: number;
  end: number;
  text: string;
}

export interface Lesson {
  id: string;
  title: string;
  videoId: string;
  isInitialized?: boolean;
  vocab: VocabWord[];
  lines: ShadowLine[];
  theme?: string;
  gameStartWords?: string[];
}

export interface SavedWord extends VocabWord {
  dateSaved: string;
}

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  correction?: {
    original: string;
    corrected: string;
    explanation: string;
  };
}

export interface UserProgress {
  currentDay: number;
  completedDays: Record<number, { listen: boolean; shadow: boolean; speak: boolean; quiz: boolean }>;
  todayTasks: {
    listen: boolean;
    shadow: boolean;
    speak: boolean;
    quiz: boolean;
  };
}

export interface QuizState {
  questions: { word: string; question: string; correctAnswer: string; options: string[] }[];
  currentQuestionIndex: number;
  selectedAnswers: Record<number, string>;
  isFinished: boolean;
  score: number;
}
