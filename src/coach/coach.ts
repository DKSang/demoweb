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
  // Use first ~3000 chars to stay within token budget while capturing main content
  const transcriptSample = lesson.rawTranscript.slice(0, 3000);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an expert English teacher specialising in spoken English and vocabulary acquisition.
Analyze the given YouTube transcript and extract the most useful vocabulary for a speaking learner.
Focus on:
- Naturally spoken phrases, collocations, and idioms
- Words that appear in meaningful conversational contexts
- Expressions the learner can immediately reuse in conversation

Respond ONLY with valid JSON matching this exact schema:
{
  "topic": "string — the video's main subject in 5 words or less",
  "keyPhrases": ["array of 4-6 collocations or phrases from the video"],
  "vocab": [
    {
      "word": "the word or short phrase",
      "ipa": "/IPA pronunciation/",
      "partOfSpeech": "noun|verb|adjective|adverb|phrase",
      "definition": "clear definition in simple English",
      "example": "a natural example sentence using context from the video",
      "contextTimestamp": null
    }
  ]
}
Extract exactly 6-8 vocab items. No markdown, no extra text.`,
    },
    {
      role: "user",
      content: `Transcript:\n"""\n${transcriptSample}\n"""`,
    },
  ];

  return callAIJson<VocabExtractionResult>(messages, {
    temperature: 0.3,
    maxTokens: 1200,
    model: modelOverride
  });
}

// ─── 2. Session Opener ────────────────────────────────────────────────────────

export async function openSession(ctx: SessionContext, modelOverride?: string): Promise<CoachResponse> {
  const { vocab, lesson } = ctx;
  const vocabList = vocab.vocab.map((v) => `"${v.word}" — ${v.definition}`).join("\n");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildCoachSystemPrompt(ctx),
    },
    {
      role: "user",
      content: `Start the speaking session for topic: "${vocab.topic}".
Video URL: ${lesson.youtubeUrl}

Today's vocabulary (weave these naturally into the conversation):
${vocabList}

Open with:
1. A warm welcome and very brief topic intro (1-2 sentences)
2. One shadow exercise: give the learner a sentence from the video to repeat
3. After they shadow, you'll move to practice conversation`,
    },
  ];

  const reply = await callAI(messages, { temperature: 0.8, maxTokens: 350, model: modelOverride });
  return buildCoachResponse(reply, vocab.vocab.map((v) => v.word).slice(0, 2));
}

// ─── 3. Conversation Turn ─────────────────────────────────────────────────────

export async function processTurn(
  learnerInput: string,
  ctx: SessionContext,
  modelOverride?: string
): Promise<CoachResponse> {
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

// ─── 4. What-If Generator ─────────────────────────────────────────────────────

export async function generateWhatIfPrompt(ctx: SessionContext, modelOverride?: string): Promise<string> {
  const { vocab, history } = ctx;
  const recentTopics = history
    .filter((t) => t.role === "learner")
    .slice(-3)
    .map((t) => t.text)
    .join(" | ");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a creative English speaking coach. Generate a single "What if..." scenario question
that:
- Is directly related to the video topic: "${vocab.topic}"
- Uses 1-2 of these vocab words naturally: ${vocab.vocab.map((v) => v.word).join(", ")}
- Builds on what the learner has been saying: "${recentTopics.slice(0, 200)}"
- Is open-ended and encourages a 3-5 sentence spoken response
- Feels like a real conversation, not a test

Return ONLY the question. No preamble. No explanation.`,
    },
    {
      role: "user",
      content: "Generate the what-if question now.",
    },
  ];

  return callAI(messages, { temperature: 0.9, maxTokens: 120, model: modelOverride });
}

// ─── 5. STT Feedback Evaluator ────────────────────────────────────────────────

export async function evaluateSpeechTranscript(
  transcribedText: string,
  expectedContext: string,
  ctx: SessionContext,
  modelOverride?: string
): Promise<FeedbackNote> {
  const vocabWords = ctx.vocab.vocab.map((v) => v.word).join(", ");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a professional English speaking coach evaluating a learner's spoken response.
Topic context: "${ctx.vocab.topic}"
Key vocabulary to encourage: ${vocabWords}
Expected conversational context: "${expectedContext}"

Evaluate the transcribed speech and respond with ONLY valid JSON:
{
  "score": 1-5,
  "strengths": ["up to 2 specific strengths"],
  "improvements": ["1-2 concrete actionable suggestions"],
  "naturalAlternative": "a more natural version of what they said, or null if already natural"
}

Scoring guide: 1=very basic, 2=developing, 3=communicates well, 4=fluent and natural, 5=excellent`,
    },
    {
      role: "user",
      content: `Learner said: "${transcribedText}"`,
    },
  ];

  return callAIJson<FeedbackNote>(messages, {
    temperature: 0.3,
    maxTokens: 400,
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
      role: "system",
      content: `You are wrapping up an English speaking session on "${ctx.vocab.topic}".
Average learner score this session: ${avgScore.toFixed(1)}/5
Session had ${learnerTurns.length} learner turns.

Write a warm, encouraging debrief (3-4 sentences) that:
- Celebrates specific progress
- Names 1-2 vocab words they used well  
- Gives ONE clear thing to practice before next session
- Ends with motivation`,
    },
    {
      role: "user",
      content: `Learner's responses this session:\n${allLearnerText.slice(0, 1000)}`,
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
