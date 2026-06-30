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
  "classifiedIntent": "practice",
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
  if (!Array.isArray(result.vocab)) result.vocab = [];
  if (!Array.isArray(result.keyPhrases)) result.keyPhrases = [];
  result.vocab = result.vocab.filter((v) => {
    const wordRoot = v.word.split(" ")[0].toLowerCase();
    return transcriptLower.includes(wordRoot);
  });

  if (result.vocab.length < 3) {
    console.warn("[Coach] Vocab validation failed (< 3 words found). Retrying with higher temperature...");
    const retried = await callAIJson<VocabExtractionResult>(messages, {
      temperature: 0.5,
      maxTokens: 1400,
      model: modelOverride
    });
    if (!Array.isArray(retried.vocab)) retried.vocab = [];
    if (!Array.isArray(retried.keyPhrases)) retried.keyPhrases = [];
    retried.vocab = retried.vocab.filter((v) => {
      const wordRoot = v.word.split(" ")[0].toLowerCase();
      return transcriptLower.includes(wordRoot);
    });
    if (retried.vocab.length >= 3) return retried;

    // If still failing, use a minimal safe fallback so the session can start
    console.warn("[Coach] Vocab retry also failed. Using safe minimal fallback vocab.");
    return {
      topic: "Everyday English",
      keyPhrases: ["practice English", "use it naturally"],
      vocab: [
        { word: "practice", ipa: "/ˈpræktɪs/", partOfSpeech: "verb", definition: "repeat to improve", example: "I practice English every day.", contextTimestamp: null },
        { word: "natural", ipa: "/ˈnætʃərəl/", partOfSpeech: "adjective", definition: "not forced, real", example: "Speak in a natural way.", contextTimestamp: null },
        { word: "learn", ipa: "/lɜːrn/", partOfSpeech: "verb", definition: "gain knowledge or skill", example: "I learn new words every week.", contextTimestamp: null },
      ]
    };
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
  const shadowSentence = vocab.keyPhrases?.[0] ?? vocab.vocab?.[0]?.example ?? "";

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

// ─── 4. Dynamic System Prompt Selection ──────────────────────────────────────

function buildTurnSystemPrompt(
  ctx: SessionContext,
  vocabBank: string
): string {
  const { vocab } = ctx;
  
  return `You are a friendly, patient English practice partner. Topic today: "${vocab.topic}"

${VOICE_RULES}

Vocab available (use naturally if fits):
${vocabBank}

YOUR ROLE & INTENT-BASED RESPONDING:
As a companion, you must dynamically classify the user's message and follow these rules:
1. "question" (User asks why/how/what about a word, phrase, or grammar rule):
   - Answer their question FIRST.
   - Explain simply, use a real life example. Keep under 3 sentences.
   - Then ask if they want to try using it in a sentence.
   - Set "classifiedIntent" to "question". Do NOT fill in feedback scores unless they made a mistake in their question itself.
2. "practice" (User makes an English sentence trying to practice or talk about the topic):
   - React to the content like a friend.
   - If they made a small mistake, suggest ONE quick correction.
   - Ask a follow-up question.
   - Set "classifiedIntent" to "practice". Fill in the feedback score (1-5), strengths, improvements, and naturalAlternative.
3. "chat" (User makes a casual comment, opinion, greeting or small talk like "this is hard", "good morning", "yes"):
   - Chat naturally, show empathy or share your experience.
   - Keep it short, friendly and supportive.
   - Set "classifiedIntent" to "chat". Do NOT provide score/feedback.

JSON OUTPUT FORMAT:
You must return ONLY a valid JSON block matching this structure (no other text outside JSON):
{
  "reply": "your response following the rules above",
  "classifiedIntent": "question|practice|chat|command",
  "whatIfPrompt": "a 'What if...' challenge question (string) related to the topic if the learner has spoken 3-4 turns and you want to challenge them, otherwise null",
  "usedVocab": ["vocab words you used in the reply"],
  "feedback": {
    "score": 1-5,
    "strengths": ["max 2, specific, under 12 words each"],
    "improvements": ["1-2, actionable, under 12 words each"],
    "naturalAlternative": "better version of what they said, or null"
  },
  "suggestPhase": "shadow|practice|whatif|debrief or null"
}`;
}

// ─── 5. History Context Optimization ─────────────────────────────────────────

function buildContextualHistory(
  history: ConversationTurn[]
): ChatMessage[] {
  // Keep 5 recent turns for stable contextual understanding without overloading
  const recent = history.slice(-5);
  return recent.map(turn => ({
    role: turn.role === "coach" ? ("assistant" as const) : ("user" as const),
    content: turn.text,
  }));
}

// ─── 6. Response Validation & Retry ─────────────────────────────────────────

function validateResponse(response: any): boolean {
  if (!response || !response.reply) return false;
  
  // Check if response is too long/lecture-like
  const sentences = response.reply.split('.').filter((s: string) => s.trim().length > 0);
  if (sentences.length > 5) return false;
  
  const intent = response.classifiedIntent || "practice";
  
  // For questions, check if it actually answers and doesn't tell them to practice
  if (intent === "question") {
    const forbidden = ["stage", "phase", "exercise", "practice this"];
    const hasForbidden = forbidden.some(word => 
      response.reply.toLowerCase().includes(word)
    );
    if (hasForbidden) return false;
  }
  
  return true;
}

async function validateAndRetry(
  messages: ChatMessage[],
  modelOverride?: string,
  maxRetries = 2
): Promise<any> {
  const localMessages = [...messages];
  for (let i = 0; i < maxRetries; i++) {
    try {
      const raw = await callAIJson<any>(localMessages, {
        temperature: 0.7,
        maxTokens: 500,
        model: modelOverride,
      });

      const isValid = validateResponse(raw);
      if (isValid) return raw;
      
      console.warn(`[Coach] Validation failed on attempt ${i + 1}. Retrying...`);
      
      localMessages.push({
        role: "system",
        content: "Your previous response was too mechanical or too long. Be more natural, simple and conversational like a friend. Keep it under 4 sentences.",
      });
    } catch (err) {
      console.error(`[Coach] Error in validateAndRetry attempt ${i + 1}:`, err);
    }
  }
  
  console.warn(`[Coach] All retries failed. Returning safe fallback response.`);
  return {
    reply: "Can you tell me more about that? Keep going, you are doing great!",
    classifiedIntent: "chat",
    whatIfPrompt: null,
    usedVocab: [],
    feedback: null,
    suggestPhase: null
  };
}

// ─── 7. Conversation Turn ─────────────────────────────────────────────────────

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

  // Local Rule-Based Responses for Greetings, Thanks, and Goodbyes (Latency: 0ms)
  const cleanInput = learnerInput.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");

  if (/^(hello|hi|hey|good\s*morning|good\s*afternoon|good\s*evening)$/i.test(cleanInput)) {
    return {
      reply: `Hey! Good to chat with you. How are you feeling today? Ready to practice speaking?`,
      usedVocab: [],
      whatIfPrompt: undefined,
      feedbackOnLearner: undefined,
      suggestedNextPhase: "practice",
    };
  }

  if (/^(thank\s*you|thanks|cám\s*ơn|cảm\s*ơn)$/i.test(cleanInput)) {
    return {
      reply: `You're welcome! We are in this together. Ready to practice some more?`,
      usedVocab: [],
      whatIfPrompt: undefined,
      feedbackOnLearner: undefined,
      suggestedNextPhase: "practice",
    };
  }

  if (/^(bye|goodbye|tạm\s*biệt)$/i.test(cleanInput)) {
    return {
      reply: `Goodbye! You did a good job today. Click the 'Wrap-up & Debrief' button above to end our session.`,
      usedVocab: [],
      whatIfPrompt: undefined,
      feedbackOnLearner: undefined,
      suggestedNextPhase: "debrief",
    };
  }

  const vocabBank = ctx.vocab.vocab
    .map((v) => `"${v.word}" — ${v.definition}`)
    .join("\n");

  const recentHistory = buildContextualHistory(ctx.history);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildTurnSystemPrompt(ctx, vocabBank),
    },
    ...recentHistory,
    {
      role: "user",
      content: learnerInput,
    },
  ];

  // Call AI only ONCE!
  const raw = await validateAndRetry(messages, modelOverride);
  
  const intent = raw.classifiedIntent || "practice";
  console.log(`[Coach] AI classified user intent as: "${intent}"`);

  // Conditional Feedback: only show feedback if classifiedIntent is "practice"
  const feedbackOnLearner =
    intent === "practice" && raw.feedback
      ? {
          score: raw.feedback.score,
          strengths: raw.feedback.strengths,
          improvements: raw.feedback.improvements,
          naturalAlternative: raw.feedback.naturalAlternative ?? undefined,
        }
      : undefined;

  return {
    reply: raw.reply,
    whatIfPrompt: raw.whatIfPrompt ?? undefined,
    usedVocab: raw.usedVocab ?? [],
    feedbackOnLearner,
    suggestedNextPhase: raw.suggestPhase ?? undefined,
  };
}

// ─── 8. What-If Generator ─────────────────────────────────────────────────────

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

// ─── 9. STT Feedback Evaluator ────────────────────────────────────────────────

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

// ─── 10. Session Debrief ───────────────────────────────────────────────────────

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

// ─── Private Helpers ──────────────────────────────────────────────────────────

function historyToMessages(history: ConversationTurn[]): ChatMessage[] {
  return history.map((turn) => ({
    role: turn.role === "coach" ? ("assistant" as const) : ("user" as const),
    content: turn.text,
  }));
}
