/**
 * speech.ts — STT integration layer
 *
 * In the browser (React app): use the Web Speech API
 * In CLI harness: provide a readline-based text stub for testing
 *
 * The real React component should use useSpeechRecognition() hook
 * or the browser's SpeechRecognition API directly.
 */

import * as readline from "readline";

// ─── CLI Stub (for harness testing) ──────────────────────────────────────────

/**
 * In CLI mode, simulates the learner "speaking" by typing.
 * In production, this is replaced by the browser's SpeechRecognition API.
 */
export async function captureUserInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\n🎤 ${prompt}\n> `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─── Browser STT Config (for React integration) ───────────────────────────────

/**
 * Drop this into your React component for mic-based STT.
 * Requires browser with Web Speech API support (Chrome, Edge).
 *
 * Usage in React:
 *   const { transcript, start, stop, isListening } = useSpeechRecognition();
 */
export const BROWSER_STT_CODE = `
// Place this in src/hooks/useSpeechRecognition.ts
import { useState, useRef, useCallback } from "react";

interface UseSpeechRecognitionResult {
  transcript: string;
  isListening: boolean;
  start: () => void;
  stop: () => void;
  error: string | null;
  reset: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const start = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser. Use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      setTranscript(result);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(\`STT error: \${event.error}\`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  return { transcript, isListening, start, stop, error, reset };
}
`;

// ─── Transcript Cleaner ───────────────────────────────────────────────────────

/**
 * Cleans raw STT output before sending to the AI coach:
 * - Removes filler words
 * - Normalises whitespace
 * - Removes duplicate phrases (STT repetition artefact)
 */
export function cleanSttTranscript(raw: string): string {
  const fillerWords = /\b(um+|uh+|er+|ah+|like|you know|i mean|basically)\b/gi;
  let cleaned = raw.replace(fillerWords, "").replace(/\s+/g, " ").trim();

  // Remove consecutive duplicate words (STT artefact)
  cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, "$1");

  return cleaned;
}
