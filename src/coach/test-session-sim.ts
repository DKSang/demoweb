import dotenv from "dotenv";
dotenv.config();

import { openSession, processTurn, generateDebrief } from "./coach.js";
import { fetchTranscript } from "./youtube.js";
import { extractVocabFromLesson } from "./coach.js";
import { SessionContext } from "./types.js";

async function runSimulation() {
  console.log("=== STARTING 10-TURN SESSION SIMULATION WITH AI COACH ===");
  
  // 1. Setup mock lesson
  const videoUrl = "https://www.youtube.com/watch?v=BCDXweG6CLc";
  console.log(`Fetching transcript for ${videoUrl}...`);
  const lesson = await fetchTranscript(videoUrl);
  console.log("Extracting vocabulary...");
  const vocab = await extractVocabFromLesson(lesson);
  
  // 2. Build SessionContext then open session
  console.log("Opening Speak Session...");
  let ctx: SessionContext = {
    lesson,
    vocab,
    phase: "shadow",
    history: [],
    sessionStarted: new Date(),
    turnsCompleted: 0,
  };
  const openingResponse = await openSession(ctx);
  ctx.phase = "practice";
  
  console.log(`AI Coach (Opening): "${openingResponse.reply}"`);
  console.log(`Session Initialized. Phase: ${ctx.phase}`);
  
  // 3. Simulating 10 turns
  const learnerInputs = [
    "Hello! I want to practice time expressions.",
    "Why do British people say 'quarter past'?",
    "Ah, I see. What about 'half past'?",
    "Can you give me a simple scenario to practice?",
    "I wake up at half past six in the morning.",
    "Did I say that correctly? Any grammar feedback?",
    "Thank you! Can we practice one more with 'quarter to'?",
    "I arrived at the school at quarter to eight.",
    "That is cool. You are a very friendly friend!",
    "I must go now. Thank you, goodbye!"
  ];

  for (let i = 0; i < learnerInputs.length; i++) {
    const input = learnerInputs[i];
    console.log(`\n--------------------------------------------`);
    console.log(`Turn ${i + 1}/10`);
    console.log(`Learner: "${input}"`);
    console.log(`AI Coach is thinking...`);
    
    try {
      const response = await processTurn(input, ctx);
      
      console.log(`AI Coach: "${response.reply}"`);
      if (response.feedbackOnLearner) {
        const fb = response.feedbackOnLearner;
        console.log(`[Feedback]: Score ${fb.score}/5 | Natural alt: "${fb.naturalAlternative || 'None'}"`);
      }
      if (response.usedVocab && response.usedVocab.length) {
        console.log(`[Used Vocab]: ${response.usedVocab.join(", ")}`);
      }
      if (response.whatIfPrompt) {
        console.log(`[What-if]: "${response.whatIfPrompt}"`);
      }

      // Add to history
      ctx.history.push({
        role: "learner",
        text: input,
        timestamp: new Date(),
        phase: ctx.phase
      });
      ctx.history.push({
        role: "coach",
        text: response.reply,
        timestamp: new Date(),
        phase: ctx.phase
      });
      ctx.turnsCompleted++;

      if (response.suggestedNextPhase) {
        ctx.phase = response.suggestedNextPhase;
      }
    } catch (err: any) {
      console.error(`ERROR on turn ${i + 1}:`, err.message);
    }
  }

  console.log(`\n--------------------------------------------`);
  console.log("Generating debrief...");
  try {
    ctx.phase = "debrief";
    const debrief = await generateDebrief(ctx);
    console.log(`AI Coach Debrief: "${debrief}"`);
  } catch (err: any) {
    console.error("ERROR generating debrief:", err.message);
  }
  
  console.log("\n=== SIMULATION COMPLETED ===");
}

runSimulation().catch(console.error);
