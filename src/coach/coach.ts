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

// ─── Writing Style Guide (applied to ALL prompts) ────────────────────────────
//
//  TONE  : friendly, calm, direct — like a patient friend, not a teacher
//  WORDS : A2–B1 level only. No academic vocabulary.
//  SENTENCES: max 12 words each. One idea per sentence.
//  STRUCTURE: statement → example → question (like the video)
//  NEVER: "Furthermore", "It is important to note", "Excellent!", long praise
//  ALWAYS: short, real, useful
//
// Reference style from transcript:
//   "Your brain does not learn rules first. It learns through patterns."
//   "Think of it like carrying bags. One bag is easy. Five bags — you drop them."
//
// ─────────────────────────────────────────────────────────────────────────────

// ─── VOICE CONSTANTS ─────────────────────────────────────────────────────────

const VOICE_RULES = `
VOICE RULES — follow these strictly:
- Use simple words. A2-B1 level only.
- Keep each sentence under 12 words.
- One idea per sentence. Then stop.
- Use real examples. Not abstract ideas.
- Sound like a friend. Not a teacher.
- Never say: "Excellent!", "Great job!", "That's wonderful!"
- Never use: "Furthermore", "Additionally", "It is important to note"
- If you praise: one word only. "Good." or "Nice." Then move on.
- End every reply with one short question or one clear action.
`;

const STYLE_EXAMPLE = `
Good reply style:
"You said 'I go to school yesterday.' Small fix: use 'went'. Try again — 'I went to school yesterday.' Your turn."

Bad reply style:
"That was a wonderful attempt! However, I noticed a small grammatical error. It is important to use the past tense here. Please try to say 'went' instead of 'go'. You're doing amazingly well!"
`;

const JSON_STYLE_EXAMPLE = `
Good JSON output style (your entire response must be a single valid JSON block formatted like this):
{
  "reply": "You said 'I go to school yesterday.' Small fix: use 'went'. Try again — 'I went to school yesterday.' Your turn.",
  "whatIfPrompt": null,
  "usedVocab": [],
  "feedback": {
    "score": 3,
    "strengths": ["Clear meaning."],
    "improvements": ["Use past tense 'went' instead of 'go'."],
    "naturalAlternative": "I went to school yesterday."
  },
  "suggestPhase": "practice"
}
`;

// ─── 1. Vocabulary Extraction ─────────────────────────────────────────────────

export async function extractVocabFromLesson(
  lesson: VideoLesson,
  modelOverride?: string
): Promise<VocabExtractionResult> {
  // Guard: transcript must have real content
  if (lesson.rawTranscript.trim().length < 100) {
    throw new Error("Transcript too short to extract vocabulary.");
  }

  // Use up to 5000 chars — enough to get diverse vocab across the video
  const transcriptSample = lesson.rawTranscript.slice(0, 5000);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You extract vocabulary from a YouTube transcript.

STRICT RULES:
1. Every word MUST appear in the transcript. Do not invent words.
2. Pick words a beginner can use in daily conversation.
3. Skip rare academic words. Skip jargon.
4. The example sentence must show HOW to use the word in real life.
5. Keep definitions short — under 10 words.

Return ONLY valid JSON. You may format your response as a json code block (no other text outside of the JSON):
{
  "topic": "main subject of the video, 5 words max",
  "keyPhrases": ["4-6 short phrases taken directly from the transcript"],
  "vocab": [
    {
      "word": "word or short phrase from the transcript",
      "ipa": "/pronunciation/",
      "partOfSpeech": "noun|verb|adjective|adverb|phrase",
      "definition": "simple meaning, under 10 words",
      "example": "one natural sentence using this word",
      "contextTimestamp": null
    }
  ]
}

Extract exactly 8 vocab items.`,
    },
    {
      role: "user",
      content: `Transcript:\n"""\n${transcriptSample}\n"""`,
    },
  ];

  const result = await callAIJson<VocabExtractionResult>(messages, {
    temperature: 0.2,
    maxTokens: 1400,
    model: modelOverride
  });

  // Validate: all vocab words must exist in transcript (basic check)
  const transcriptLower = lesson.rawTranscript.toLowerCase();
  result.vocab = result.vocab.filter((v) => {
    const wordRoot = v.word.split(" ")[0].toLowerCase();
    return transcriptLower.includes(wordRoot);
  });

  if (result.vocab.length < 3) {
    throw new Error(
      "AI returned vocab not found in transcript. Check transcript quality."
    );
  }

  return result;
}

// ─── 2. Vocab List Handler ────────────────────────────────────────────────────
// Called when user asks "show me vocab" — returns from ctx, never calls AI

export function formatVocabList(vocab: VocabExtractionResult): string {
  const lines = vocab.vocab.map(
    (v, i) =>
      `${i + 1}. ${v.word} [${v.ipa}]\n   Meaning: ${v.definition}\n   Example: "${v.example}"`
  );
  return `Today's words:\n\n${lines.join("\n\n")}`;
}

// ─── 3. Session Opener ────────────────────────────────────────────────────────

export async function openSession(
  ctx: SessionContext,
  modelOverride?: string
): Promise<CoachResponse> {
  const { vocab } = ctx;

  // Pick the first shadow sentence from keyPhrases — short and speakable
  const shadowSentence = vocab.keyPhrases[0] ?? vocab.vocab[0]?.example ?? "";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an English speaking coach. You start today's session.
${VOICE_RULES}
${STYLE_EXAMPLE}`,
    },
    {
      role: "user",
      content: `Topic: "${vocab.topic}"
Shadow sentence for learner to repeat: "${shadowSentence}"

Write the opening. Do this:
1. One sentence: what we practice today.
2. One sentence: why it helps them speak better.
3. Say: "Let's start. Repeat after me:" then give the shadow sentence.

Keep it under 5 sentences total.`,
    },
  ];

  const reply = await callAI(messages, { temperature: 0.6, maxTokens: 150, model: modelOverride });

  return {
    reply,
    usedVocab: [],
    whatIfPrompt: undefined,
    feedbackOnLearner: undefined,
    suggestedNextPhase: undefined,
  };
}

// ─── 4. Conversation Turn ─────────────────────────────────────────────────────

export async function processTurn(
  learnerInput: string,
  ctx: SessionContext,
  modelOverride?: string
): Promise<CoachResponse> {

  // Intercept vocab requests — no AI call needed
  if (/show.*vocab|vocabulary|từ vựng|list.*word/i.test(learnerInput)) {
    return {
      reply: formatVocabList(ctx.vocab),
      usedVocab: [],
      whatIfPrompt: undefined,
      feedbackOnLearner: undefined,
      suggestedNextPhase: undefined,
    };
  }

  const vocabBank = ctx.vocab.vocab
    .map((v) => `"${v.word}" — ${v.definition}`)
    .join("\n");

  const recentHistory = ctx.history.slice(-6);
  const turnsSinceWhatIf = recentHistory.filter(
    (t) => t.role === "coach" && t.text.toLowerCase().includes("what if")
  ).length;

  // Trigger what-if every 3 learner turns
  const shouldAskWhatIf =
    ctx.turnsCompleted > 0 &&
    ctx.turnsCompleted % 3 === 0 &&
    turnsSinceWhatIf === 0 &&
    ctx.phase !== "shadow";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildTurnSystemPrompt(ctx, vocabBank, shouldAskWhatIf),
    },
    ...historyToMessages(recentHistory),
    {
      role: "user",
      content: learnerInput,
    },
  ];

  const raw = await callAIJson<{
    reply: string;
    whatIfPrompt: string | null;
    usedVocab: string[];
    feedback: {
      score: number;
      strengths: string[];
      improvements: string[];
      naturalAlternative: string | null;
    } | null;
    suggestPhase: SessionPhase | null;
  }>(messages, { temperature: 0.65, maxTokens: 500, model: modelOverride });

  return {
    reply: raw.reply,
    whatIfPrompt: raw.whatIfPrompt ?? undefined,
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

// ─── 5. What-If Generator ─────────────────────────────────────────────────────

export async function generateWhatIfPrompt(
  ctx: SessionContext,
  modelOverride?: string
): Promise<string> {
  const { vocab, history } = ctx;

  const recentLearnerWords = history
    .filter((t) => t.role === "learner")
    .slice(-3)
    .map((t) => t.text)
    .join(" ");

  // Pick 1-2 vocab words to weave into the scenario
  const targetWords = vocab.vocab
    .slice(0, 2)
    .map((v) => v.word)
    .join(" and ");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You write "What if..." questions for English speaking practice.
${VOICE_RULES}

The question must:
- Connect to the video topic: "${vocab.topic}"
- Use these words naturally: ${targetWords}
- Be something the learner can answer in 3-4 sentences
- Feel like a real conversation, not a test

Return ONLY the question. Nothing else.`,
    },
    {
      role: "user",
      content: `Learner has been saying: "${recentLearnerWords.slice(0, 150)}"
Write one "What if..." question now.`,
    },
  ];

  return callAI(messages, { temperature: 0.85, maxTokens: 80, model: modelOverride });
}

// ─── 6. STT Feedback Evaluator ────────────────────────────────────────────────

export async function evaluateSpeechTranscript(
  transcribedText: string,
  expectedContext: string,
  ctx: SessionContext,
  modelOverride?: string
): Promise<FeedbackNote> {
  const vocabWords = ctx.vocab.vocab.map((v) => v.word).join(", ");

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

Respond ONLY with a valid JSON object matching this schema. You may format your response as a json code block (no other text outside of the JSON):
{
  "score": 3,
  "strengths": ["Good use of vocabulary.", "Grammatically correct."],
  "improvements": ["Try to elaborate more on your reasons."],
  "naturalAlternative": "A more natural way to say it"
}

Keep every string under 15 words.`,
    },
  ];

  return callAIJson<FeedbackNote>(messages, {
    temperature: 0.25,
    maxTokens: 300,
    model: modelOverride
  });
}

// ─── 7. Session Debrief ───────────────────────────────────────────────────────

export async function generateDebrief(
  ctx: SessionContext,
  modelOverride?: string
): Promise<string> {
  const learnerTurns = ctx.history.filter((t) => t.role === "learner");
  const avgScore =
    learnerTurns.reduce((sum, t) => sum + (t.feedbackScore ?? 3), 0) /
    (learnerTurns.length || 1);

  const allLearnerText = learnerTurns
    .map((t) => t.text)
    .join(" ")
    .slice(0, 800);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You end an English speaking session. Write a short debrief.
${VOICE_RULES}
${STYLE_EXAMPLE}

Keep it to 4 sentences max:
1. One thing they did well — be specific.
2. One thing to practice next — tell them exactly what.
3. One sentence of encouragement — simple, real, not fake.
4. One action: what to do before the next session.`,
    },
    {
      role: "user",
      content: `Topic: "${ctx.vocab.topic}"
Score this session: ${avgScore.toFixed(1)}/5
Learner said: "${allLearnerText}"`,
    },
  ];

  return callAI(messages, { temperature: 0.65, maxTokens: 180, model: modelOverride });
}

// ─── Private: Turn System Prompt ─────────────────────────────────────────────

function buildTurnSystemPrompt(
  ctx: SessionContext,
  vocabBank: string,
  shouldAskWhatIf: boolean
): string {
  const { vocab, phase } = ctx;

  const phaseInstructions: Record<SessionPhase, string> = {
    shadow: `Phase: SHADOW
- Give one sentence from the video. Ask them to repeat it.
- If they repeat correctly: say "Good." then give the next sentence.
- If they make a mistake: say the correct version. Ask them to try again.
- Keep replies under 3 sentences.`,

    practice: `Phase: PRACTICE
- Have a real conversation about the topic: "${vocab.topic}"
- Use 1-2 vocab words naturally in your reply.
- React to what they said. Then ask one question.
- Max 3 sentences in your reply.`,

    whatif: `Phase: WHAT-IF
- You just gave them a "What if..." scenario.
- Listen to their answer. React to the content, not just the grammar.
- Ask one follow-up question using a vocab word.
- Max 3 sentences.`,

    debrief: `Phase: DEBRIEF
- Session is ending. Be warm but short.
- Name one thing they did well. Name one thing to practice.
- Max 3 sentences.`,
  };

  const whatIfInstruction = shouldAskWhatIf
    ? `\nIMPORTANT: This turn, include a "What if..." question in whatIfPrompt.`
    : "";

  return `You are an English speaking coach. Topic today: "${vocab.topic}"

${phaseInstructions[phase]}
${whatIfInstruction}

${VOICE_RULES}

Vocab bank — use 1-2 of these naturally when they fit:
${vocabBank}

${JSON_STYLE_EXAMPLE}

Respond ONLY as JSON:
{
  "reply": "your coach reply — short, simple, direct",
  "whatIfPrompt": "What if... question (string) or null",
  "usedVocab": ["vocab words you used"],
  "feedback": {
    "score": 1-5,
    "strengths": ["max 2, specific, under 12 words each"],
    "improvements": ["1-2, actionable, under 12 words each"],
    "naturalAlternative": "better version of what they said, or null"
  },
  "suggestPhase": "shadow|practice|whatif|debrief or null"
}`;
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

function historyToMessages(history: ConversationTurn[]): ChatMessage[] {
  return history.map((turn) => ({
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
