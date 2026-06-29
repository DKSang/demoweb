/**
 * ai-coach-harness.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * CLI test harness for the AI English Speaking Coach.
 *
 * Usage:
 *   npx tsx src/harness/ai-coach-harness.ts <command> [args]
 *
 * Commands:
 *   transcript <youtube-url>          Fetch & display transcript
 *   vocab <youtube-url>               Extract vocabulary from video
 *   session <youtube-url>             Run a full interactive speaking session
 *   whatif <youtube-url>              Test what-if prompt generation only
 *   feedback "<text>" "<context>"     Test speech feedback evaluation
 *   runall <youtube-url>              Run all tests in sequence (non-interactive)
 */

import dotenv from "dotenv";
dotenv.config();

import { fetchTranscript } from "./youtube.js";
import {
  extractVocabFromLesson,
  openSession,
  processTurn,
  generateWhatIfPrompt,
  evaluateSpeechTranscript,
  generateDebrief,
} from "./coach.js";
import { captureUserInput, cleanSttTranscript } from "./speech.js";
import {
  SessionContext,
  ConversationTurn,
  HarnessTestResult,
  SessionPhase,
} from "./types.js";

// ─── Colours ──────────────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

function log(color: string, prefix: string, msg: string) {
  console.log(`${color}${C.bold}${prefix}${C.reset} ${msg}`);
}

function divider(label = "") {
  const line = "─".repeat(60);
  if (label) {
    console.log(`\n${C.dim}${line}${C.reset}`);
    console.log(`${C.bold}${C.cyan}  ${label}${C.reset}`);
    console.log(`${C.dim}${line}${C.reset}\n`);
  } else {
    console.log(`\n${C.dim}${line}${C.reset}\n`);
  }
}

// ─── Command: transcript ──────────────────────────────────────────────────────

async function cmdTranscript(url: string): Promise<HarnessTestResult> {
  const start = Date.now();
  divider("TRANSCRIPT FETCH");
  log(C.blue, "[→]", `Fetching transcript for: ${url}`);

  try {
    const lesson = await fetchTranscript(url);
    log(C.green, "[✓]", `Video ID: ${lesson.videoId}`);
    log(C.green, "[✓]", `Segments: ${lesson.transcript.length}`);
    log(C.green, "[✓]", `Total chars: ${lesson.rawTranscript.length}`);
    console.log(
      `\n${C.dim}Preview (first 300 chars):\n${lesson.rawTranscript.slice(0, 300)}...${C.reset}\n`
    );
    return { testName: "transcript", passed: true, durationMs: Date.now() - start, output: lesson.videoId };
  } catch (err: any) {
    log(C.red, "[✗]", err.message);
    return { testName: "transcript", passed: false, durationMs: Date.now() - start, error: err.message };
  }
}

// ─── Command: vocab ───────────────────────────────────────────────────────────

async function cmdVocab(url: string): Promise<HarnessTestResult> {
  const start = Date.now();
  divider("VOCABULARY EXTRACTION");
  log(C.blue, "[→]", "Fetching transcript...");

  try {
    const lesson = await fetchTranscript(url);
    log(C.blue, "[→]", "Calling AI to extract vocabulary...");
    const vocab = await extractVocabFromLesson(lesson);

    log(C.green, "[✓]", `Topic detected: "${vocab.topic}"`);
    log(C.green, "[✓]", `Key phrases: ${vocab.keyPhrases.join(" | ")}`);
    console.log(`\n${C.bold}${C.yellow}📚 Vocabulary (${vocab.vocab.length} words):${C.reset}`);

    vocab.vocab.forEach((v, i) => {
      console.log(
        `  ${C.bold}${i + 1}. ${v.word}${C.reset} ${C.dim}[${v.ipa}]${C.reset} — ${v.definition}`
      );
      console.log(`     ${C.dim}Example: "${v.example}"${C.reset}`);
    });

    return { testName: "vocab", passed: true, durationMs: Date.now() - start, output: vocab };
  } catch (err: any) {
    log(C.red, "[✗]", err.message);
    return { testName: "vocab", passed: false, durationMs: Date.now() - start, error: err.message };
  }
}

// ─── Command: whatif ──────────────────────────────────────────────────────────

async function cmdWhatif(url: string): Promise<HarnessTestResult> {
  const start = Date.now();
  divider("WHAT-IF PROMPT GENERATION");

  try {
    const lesson = await fetchTranscript(url);
    const vocab = await extractVocabFromLesson(lesson);

    const ctx: SessionContext = {
      lesson,
      vocab,
      phase: "whatif",
      history: [],
      sessionStarted: new Date(),
      turnsCompleted: 0,
    };

    log(C.blue, "[→]", "Generating 3 what-if prompts...");

    for (let i = 1; i <= 3; i++) {
      const prompt = await generateWhatIfPrompt(ctx);
      console.log(`\n  ${C.bold}${C.magenta}What-if #${i}:${C.reset} ${prompt}`);
    }

    return { testName: "whatif", passed: true, durationMs: Date.now() - start };
  } catch (err: any) {
    log(C.red, "[✗]", err.message);
    return { testName: "whatif", passed: false, durationMs: Date.now() - start, error: err.message };
  }
}

// ─── Command: feedback ────────────────────────────────────────────────────────

async function cmdFeedback(
  spokenText: string,
  context: string,
  url?: string
): Promise<HarnessTestResult> {
  const start = Date.now();
  divider("SPEECH FEEDBACK EVALUATION");

  try {
    let lesson, vocab;

    if (url) {
      lesson = await fetchTranscript(url);
      vocab = await extractVocabFromLesson(lesson);
    } else {
      // Minimal mock for testing without a video
      lesson = {
        youtubeUrl: "",
        videoId: "test",
        transcript: [],
        rawTranscript: context,
        fetchedAt: new Date(),
      };
      vocab = {
        topic: "general conversation",
        keyPhrases: [],
        vocab: [],
      };
    }

    const ctx: SessionContext = {
      lesson,
      vocab,
      phase: "practice",
      history: [],
      sessionStarted: new Date(),
      turnsCompleted: 0,
    };

    const cleaned = cleanSttTranscript(spokenText);
    log(C.blue, "[→]", `Evaluating: "${cleaned}"`);

    const feedback = await evaluateSpeechTranscript(cleaned, context, ctx);

    console.log(`\n  ${C.bold}Score:${C.reset} ${"⭐".repeat(feedback.score)} (${feedback.score}/5)`);
    console.log(`  ${C.bold}${C.green}Strengths:${C.reset}`);
    feedback.strengths.forEach((s) => console.log(`    ✓ ${s}`));
    console.log(`  ${C.bold}${C.yellow}To improve:${C.reset}`);
    feedback.improvements.forEach((s) => console.log(`    → ${s}`));
    if (feedback.naturalAlternative) {
      console.log(`  ${C.bold}${C.cyan}More natural:${C.reset} "${feedback.naturalAlternative}"`);
    }

    return { testName: "feedback", passed: true, durationMs: Date.now() - start, output: feedback };
  } catch (err: any) {
    log(C.red, "[✗]", err.message);
    return { testName: "feedback", passed: false, durationMs: Date.now() - start, error: err.message };
  }
}

// ─── Command: session (interactive) ──────────────────────────────────────────

async function cmdSession(url: string): Promise<void> {
  divider("INTERACTIVE SPEAKING SESSION");
  log(C.blue, "[→]", "Setting up session...");

  const lesson = await fetchTranscript(url);
  log(C.green, "[✓]", `Transcript loaded (${lesson.transcript.length} segments)`);

  const vocab = await extractVocabFromLesson(lesson);
  log(C.green, "[✓]", `Topic: "${vocab.topic}" | Vocab: ${vocab.vocab.length} words`);

  const ctx: SessionContext = {
    lesson,
    vocab,
    phase: "shadow",
    history: [],
    sessionStarted: new Date(),
    turnsCompleted: 0,
  };

  divider("SESSION START");
  console.log(
    `${C.dim}Commands during session:\n  "skip"   — move to next phase\n  "vocab"  — show today's vocabulary\n  "quit"   — end session early${C.reset}\n`
  );

  // Opening message
  const opening = await openSession(ctx);
  log(C.magenta, "🤖 Coach:", opening.reply);
  if (opening.whatIfPrompt) {
    console.log(`\n  ${C.dim}[What-if queued]: ${opening.whatIfPrompt}${C.reset}`);
  }

  addToHistory(ctx, "coach", opening.reply, "shadow");

  // Main conversation loop
  const MAX_TURNS = 20;
  while (ctx.turnsCompleted < MAX_TURNS) {
    let userInput: string;

    try {
      userInput = await captureUserInput("Your turn (speak or type):");
    } catch {
      break; // stdin closed
    }

    if (!userInput) continue;

    // Meta-commands
    if (userInput.toLowerCase() === "quit") break;

    if (userInput.toLowerCase() === "vocab") {
      divider("TODAY'S VOCABULARY");
      vocab.vocab.forEach((v) => {
        console.log(`  ${C.bold}${v.word}${C.reset} [${v.ipa}] — ${v.definition}`);
      });
      continue;
    }

    if (userInput.toLowerCase() === "skip") {
      ctx.phase = nextPhase(ctx.phase);
      log(C.yellow, "[→]", `Skipping to phase: ${ctx.phase}`);
      continue;
    }

    // Clean STT artefacts
    const cleaned = cleanSttTranscript(userInput);
    addToHistory(ctx, "learner", cleaned, ctx.phase);

    // Get coach response
    log(C.dim, "...", "Coach is thinking...");
    try {
      const response = await processTurn(cleaned, ctx);

      console.log();
      log(C.magenta, "🤖 Coach:", response.reply);

      if (response.whatIfPrompt) {
        console.log(`\n  ${C.bold}${C.cyan}💭 What if...${C.reset} ${response.whatIfPrompt}`);
      }

      if (response.feedbackOnLearner) {
        const fb = response.feedbackOnLearner;
        console.log(
          `\n  ${C.dim}[Feedback] Score: ${fb.score}/5 | ${fb.strengths[0] ?? ""} | ${fb.improvements[0] ?? ""}${C.reset}`
        );
        if (response.feedbackOnLearner) {
          addFeedbackScore(ctx, fb.score);
        }
      }

      if (response.usedVocab.length) {
        console.log(
          `  ${C.dim}[Vocab used]: ${response.usedVocab.join(", ")}${C.reset}`
        );
      }

      addToHistory(ctx, "coach", response.reply, ctx.phase);

      if (response.suggestedNextPhase && response.suggestedNextPhase !== ctx.phase) {
        ctx.phase = response.suggestedNextPhase;
        log(C.yellow, "[→]", `Phase → ${ctx.phase}`);
      }

      ctx.turnsCompleted++;

      if (ctx.phase === "debrief") break;
    } catch (err: any) {
      log(C.red, "[!]", `Coach error: ${err.message}`);
    }
  }

  // Debrief
  divider("SESSION DEBRIEF");
  log(C.blue, "[→]", "Generating your session summary...");
  try {
    ctx.phase = "debrief";
    const debrief = await generateDebrief(ctx);
    log(C.magenta, "🤖 Coach:", debrief);
    log(C.green, "[✓]", `Session complete! Turns: ${ctx.turnsCompleted}`);
  } catch (err: any) {
    log(C.red, "[!]", `Debrief error: ${err.message}`);
  }
}

// ─── Command: runall (non-interactive batch test) ─────────────────────────────

async function cmdRunAll(url: string): Promise<void> {
  divider("BATCH HARNESS TEST — ALL MODULES");
  const results: HarnessTestResult[] = [];

  results.push(await cmdTranscript(url));
  results.push(await cmdVocab(url));
  results.push(await cmdWhatif(url));
  results.push(
    await cmdFeedback(
      "um I think the topic is very um interesting you know",
      "Discussing the video topic",
    )
  );

  divider("TEST SUMMARY");
  let passed = 0;
  results.forEach((r) => {
    const icon = r.passed ? `${C.green}✓` : `${C.red}✗`;
    console.log(
      `  ${icon}${C.reset} ${r.testName.padEnd(15)} ${C.dim}${r.durationMs}ms${C.reset}${r.error ? `  ${C.red}${r.error}${C.reset}` : ""}`
    );
    if (r.passed) passed++;
  });
  console.log(
    `\n  ${C.bold}Result: ${passed}/${results.length} passed${C.reset}\n`
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addToHistory(
  ctx: SessionContext,
  role: "coach" | "learner",
  text: string,
  phase: SessionPhase
) {
  ctx.history.push({ role, text, timestamp: new Date(), phase });
}

function addFeedbackScore(ctx: SessionContext, score: number) {
  const last = [...ctx.history].reverse().find((t) => t.role === "learner");
  if (last) last.feedbackScore = score;
}

function nextPhase(current: SessionPhase): SessionPhase {
  const order: SessionPhase[] = ["shadow", "practice", "whatif", "debrief"];
  const idx = order.indexOf(current);
  return order[Math.min(idx + 1, order.length - 1)];
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log(
    `\n${C.bold}${C.cyan}🎙️  AI English Speaking Coach — Harness${C.reset}\n`
  );

  if (!process.env.OPENROUTER_API_KEY) {
    log(C.red, "[!]", "OPENROUTER_API_KEY not found in .env — aborting.");
    process.exit(1);
  }

  const HELP = `
Commands:
  transcript <url>              Fetch YouTube transcript
  vocab <url>                   Extract vocabulary from video  
  whatif <url>                  Test what-if prompt generation
  feedback "<text>" "<context>" Evaluate a spoken response
  session <url>                 Full interactive speaking session
  runall <url>                  Run all module tests (non-interactive)

Example:
  npx tsx src/harness/ai-coach-harness.ts vocab https://youtu.be/dQw4w9WgXcQ
  npx tsx src/harness/ai-coach-harness.ts runall https://youtu.be/dQw4w9WgXcQ
`;

  switch (command) {
    case "transcript":
      if (!args[1]) { console.log(HELP); break; }
      await cmdTranscript(args[1]);
      break;

    case "vocab":
      if (!args[1]) { console.log(HELP); break; }
      await cmdVocab(args[1]);
      break;

    case "whatif":
      if (!args[1]) { console.log(HELP); break; }
      await cmdWhatif(args[1]);
      break;

    case "feedback":
      if (!args[1]) { console.log(HELP); break; }
      await cmdFeedback(args[1], args[2] || "general English conversation", args[3]);
      break;

    case "session":
      if (!args[1]) { console.log(HELP); break; }
      await cmdSession(args[1]);
      break;

    case "runall":
      if (!args[1]) { console.log(HELP); break; }
      await cmdRunAll(args[1]);
      break;

    default:
      console.log(HELP);
  }
}

main().catch((err) => {
  console.error(`\n${C.red}Fatal error:${C.reset}`, err.message);
  process.exit(1);
});
