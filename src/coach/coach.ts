import { callAI, callAIJson } from "./ai.js";
import {
  VideoLesson,
  VocabExtractionResult,
  SessionContext,
  CoachResponse,
  FeedbackNote,
  ConversationTurn,
  SessionPhase,
  ChatMessage,
} from "./types.js";

// ─── 1. Vocabulary Extraction ─────────────────────────────────────────────────

export async function extractVocabFromLesson(
  lesson: VideoLesson,
  modelOverride?: string
): Promise<VocabExtractionResult> {
  // Use the entire raw transcript to ensure context is fully captured
  const transcriptSample = lesson.rawTranscript;

  if (!transcriptSample || transcriptSample.trim().length < 50) {
    throw new Error("Transcript quá ngắn hoặc không khả dụng, không thể extract vocab");
  }

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `You are an expert English teacher. Analyze this video transcript and extract exactly 6 useful vocabulary words or phrases for speaking practice.

Transcript:
"""
${transcriptSample}
"""

⚠️ CRITICAL CONSTRAINTS:
1. ALL vocabulary words/phrases MUST come directly from the transcript above. Do NOT invent words.
2. The topic must be the video's actual subject. If it is about money slang, do NOT extract haircut words.

Respond ONLY with a valid JSON object matching this schema. You may format your response as a json code block (no other text outside of the JSON):
{
  "topic": "subject in 5 words or less",
  "keyPhrases": ["4-6 collocations or phrases from the transcript"],
  "vocab": [
    {
      "word": "the word or phrase",
      "ipa": "/pronunciation/",
      "partOfSpeech": "noun|verb|adjective|phrase",
      "definition": "definition in simple English",
      "example": "example sentence using the word"
    }
  ]
}`,
    },
  ];

  return callAIJson<VocabExtractionResult>(messages, {
    temperature: 0.2,
    maxTokens: 1000,
    model: modelOverride
  });
}

// ─── 2. Session Opener ────────────────────────────────────────────────────────

export async function openSession(ctx: SessionContext, modelOverride?: string): Promise<CoachResponse> {
  const { vocab } = ctx;
  const vocabList = vocab.vocab.map((v) => `"${v.word}" — ${v.definition}`).join("\n");

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `You are a friendly English speaking coach.
Start a speaking session for the topic: "${vocab.topic}".
Today's vocabulary words:
${vocabList}

Please do two things in your welcome response:
1. Greet the student and briefly introduce the topic (1-2 sentences).
2. Give them exactly one short sentence from the video to repeat (Shadowing exercise).

Write ONLY your spoken greeting. No metadata, no extra text.`,
    },
  ];

  const reply = await callAI(messages, { temperature: 0.7, maxTokens: 200, model: modelOverride });
  return buildCoachResponse(reply, vocab.vocab.map((v) => v.word).slice(0, 2));
}

// ─── 3. Conversation Turn ─────────────────────────────────────────────────────

export async function processTurn(
  learnerInput: string,
  ctx: SessionContext,
  modelOverride?: string
): Promise<CoachResponse> {
  // Intercept user asking for vocab/vocabulary/từ vựng
  if (/vocabulary|vocab|từ vựng/i.test(learnerInput)) {
    return {
      reply: formatVocabList(ctx.vocab),
      usedVocab: [],
      whatIfPrompt: undefined,
      feedbackOnLearner: undefined,
      suggestedNextPhase: undefined,
    };
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildCoachSystemPrompt(ctx),
    },
    ...historyToMessages(ctx.history),
    {
      role: "user",
      content: learnerInput,
    },
  ];

  const raw = await callAIJson<{
    reply: string;
    whatIfPrompt: string;
    usedVocab: string[];
    feedback: {
      score: number;
      strengths: string[];
      improvements: string[];
      naturalAlternative: string | null;
    } | null;
    suggestPhase: SessionPhase | null;
  }>(messages, { temperature: 0.75, maxTokens: 600, model: modelOverride });

  return {
    reply: raw.reply,
    whatIfPrompt: raw.whatIfPrompt || undefined,
    usedVocab: raw.usedVocab ?? [],
    feedbackOnLearner: raw.feedback
      ? {
          score: raw.feedback.score,
          strengths: raw.feedback.strengths,
          improvements: raw.feedback.improvements,
          naturalAlternative: raw.feedback.naturalAlternative ?? undefined,
        }
      : undefined,
    suggestedNextPhase: raw.suggestPhase ?? undefined,
  };
}

function formatVocabList(vocab: VocabExtractionResult): string {
  return "Here is the vocabulary list for this lesson:\n\n" + vocab.vocab
    .map((v, i) => `${i + 1}. **${v.word}** [${v.ipa}] — ${v.definition}\n   Example: "${v.example}"`)
    .join("\n\n");
}

// ─── 4. What-If Generator ─────────────────────────────────────────────────────

export async function generateWhatIfPrompt(ctx: SessionContext, modelOverride?: string): Promise<string> {
  const { vocab, history } = ctx;
  const recentTopics = history
    .filter((t) => t.role === "learner")
    .slice(-3)
    .map((t) => t.text)
    .join(" | ");

  const vocabWords = vocab.vocab.map((v) => v.word).slice(0, 3).join(", ");

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `You are a friendly English speaking coach.
Generate a single "What if..." scenario question for the student based on these details:
- Video Topic: "${vocab.topic}"
- Vocabulary to include (use 1 or 2 of these): ${vocabWords}
- Student's recent conversation: "${recentTopics || "None yet"}"

Example What-if questions:
- Topic: Money -> "What if someone offered you a grand to stop using cash for a year—would you do it?"
- Topic: Travel -> "What if you lost your passport in a foreign country—who would you call first?"

Return ONLY the question. No intro, no chat prefix, no quotes. Just the question itself.`,
    },
  ];

  return callAI(messages, { temperature: 0.8, maxTokens: 100, model: modelOverride });
}

// ─── 5. STT Feedback Evaluator ────────────────────────────────────────────────

export async function evaluateSpeechTranscript(
  transcribedText: string,
  expectedContext: string,
  ctx: SessionContext,
  modelOverride?: string
): Promise<FeedbackNote> {
  const vocabWords = ctx.vocab.vocab.map((v) => v.word).slice(0, 4).join(", ");

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `You are a professional English speaking coach.
Evaluate this student's spoken response.

Details:
- Video Topic: "${ctx.vocab.topic}"
- Student spoke: "${transcribedText}"
- Target vocabulary: ${vocabWords}
- Expected context: "${expectedContext}"

Respond ONLY with a valid JSON object matching this schema:
{
  "score": 3,
  "strengths": ["Good use of vocabulary.", "Grammatically correct."],
  "improvements": ["Try to elaborate more on your reasons."],
  "naturalAlternative": "A more natural way to say it"
}

Do NOT write any preamble, intro, or markdown. Just the JSON object.`,
    },
  ];

  return callAIJson<FeedbackNote>(messages, {
    temperature: 0.2,
    maxTokens: 300,
    model: modelOverride
  });
}

// ─── 6. Session Debrief ───────────────────────────────────────────────────────

export async function generateDebrief(ctx: SessionContext, modelOverride?: string): Promise<string> {
  const learnerTurns = ctx.history.filter((t) => t.role === "learner");
  const avgScore =
    learnerTurns.reduce((sum, t) => sum + (t.feedbackScore ?? 3), 0) /
    (learnerTurns.length || 1);

  const allLearnerText = learnerTurns.map((t) => t.text).join("\n");

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `You are wrapping up an English speaking session on "${ctx.vocab.topic}".
Average learner score this session: ${avgScore.toFixed(1)}/5
Session had ${learnerTurns.length} learner turns.

Learner's responses this session:
"""
${allLearnerText.slice(0, 1000)}
"""

Write a warm, encouraging debrief (3-4 sentences) that:
- Celebrates specific progress
- Names 1-2 vocab words they used well  
- Gives ONE clear thing to practice before next session
- Ends with motivation`,
    },
  ];

  return callAI(messages, { temperature: 0.8, maxTokens: 250, model: modelOverride });
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

function buildCoachSystemPrompt(ctx: SessionContext): string {
  const { vocab, phase } = ctx;
  const vocabList = vocab.vocab
    .map((v) => `• ${v.word} [${v.ipa}] — ${v.definition}`)
    .join("\n");
  const keyPhrases = vocab.keyPhrases.join(", ");

  return `You are an enthusiastic, patient AI English speaking coach.
Today's topic: "${vocab.topic}"
Current phase: ${phase}

Your vocabulary bank for this session — weave these naturally into every response:
${vocabList}

Key phrases from the video: ${keyPhrases}

COACHING RULES:
1. Always respond in conversational English (not formal/academic)
2. Use "What if..." questions every 2-3 turns to deepen practice
3. Gently correct pronunciation or grammar by modeling the right form (never just saying "that's wrong")
4. Keep responses SHORT for shadow phase (1 sentence to repeat), MEDIUM for practice (2-3 sentences)
5. Always end your turn with either a question or a clear invitation for the learner to speak
6. When in 'whatif' phase: pose a scenario, then let learner respond fully before commenting
7. ⚠️ CRITICAL: Only discuss topics related to the video topic ("${vocab.topic}"). Do NOT talk about unrelated topics (like haircuts, weather, etc.) unless they are part of the video context. Do NOT invent unrelated conversation.

Respond as JSON:
{
  "reply": "your spoken coach response",
  "whatIfPrompt": "a What if... question (or null if not appropriate this turn)",
  "usedVocab": ["vocab words you used in reply"],
  "feedback": { "score": 1-5, "strengths": [], "improvements": [], "naturalAlternative": null } or null,
  "suggestPhase": "shadow|practice|whatif|debrief or null"
}`;
}

function historyToMessages(history: ConversationTurn[]): ChatMessage[] {
  return history.slice(-10).map((turn) => ({
    role: turn.role === "coach" ? ("assistant" as const) : ("user" as const),
    content: turn.text,
  }));
}

function buildCoachResponse(reply: string, usedVocab: string[]): CoachResponse {
  return {
    reply,
    usedVocab,
    whatIfPrompt: undefined,
    feedbackOnLearner: undefined,
    suggestedNextPhase: undefined,
  };
}
