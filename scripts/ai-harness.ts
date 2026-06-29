import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY || "";
const defaultModel = process.env.OPENROUTER_MODEL || "openrouter/free";

async function callOpenRouter(messages: any[], temperature = 0.3, maxTokens = 1000, model = defaultModel) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Bloom AI Harness",
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function testChat(prompt: string, model: string) {
  console.log(`\n=== Testing Chat Completion (Model: ${model}) ===`);
  console.log(`Prompt: "${prompt}"`);
  console.log("Sending request...");
  try {
    const start = Date.now();
    const content = await callOpenRouter([
      { role: "system", content: "You are a helpful English learning assistant." },
      { role: "user", content: prompt }
    ], 0.7, 1000, model);
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\nResponse received in ${duration}s:`);
    console.log("-----------------------------------------");
    console.log(content);
    console.log("-----------------------------------------");
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

async function testVocab(model: string) {
  console.log(`\n=== Testing Vocabulary Extraction (Model: ${model}) ===`);
  const transcriptSnippet = "Welcome back to another lesson. Today, we're talking about money. In Britain, we have a lot of slang for money. For example, a quid is one pound, and a grand is a thousand pounds.";
  const systemPrompt = `You are a professional British lexicographer. Analyze this transcript and extract exactly 2-3 interesting British slang or vocab words as a JSON object: {"vocab": [{"word": "...", "ipa": "...", "definition": "...", "example": "..."}]}`;
  
  console.log("Sending request...");
  try {
    const start = Date.now();
    const content = await callOpenRouter([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze: "${transcriptSnippet}"` }
    ], 0.3, 1000, model);
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\nResponse received in ${duration}s:`);
    console.log("-----------------------------------------");
    console.log(content);
    console.log("-----------------------------------------");
    try {
      JSON.parse(content.trim().substring(content.indexOf("{"), content.lastIndexOf("}") + 1));
      console.log("✅ Valid JSON output structure!");
    } catch (e) {
      console.log("❌ Invalid JSON formatting.");
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

async function testValidation(word: string, previousWord: string, model: string) {
  console.log(`\n=== Testing Word Semantic Connection Game Validation (Model: ${model}) ===`);
  console.log(`Connection: "${previousWord}" -> "${word}"`);
  
  const systemPrompt = `You are an AI word connection validator. Verify if there is a logical, semantic, or colloquial connection between the words. Respond ONLY with a JSON object: {"valid": true/false, "explanation": "..."}`;
  
  console.log("Sending request...");
  try {
    const start = Date.now();
    const content = await callOpenRouter([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Validate connection between "${previousWord}" and "${word}"` }
    ], 0.2, 500, model);
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\nResponse received in ${duration}s:`);
    console.log("-----------------------------------------");
    console.log(content);
    console.log("-----------------------------------------");
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

function showHelp() {
  console.log(`
Bloom AI Harness Utility
Usage:
  npx tsx scripts/ai-harness.ts chat "<prompt>" [model]
  npx tsx scripts/ai-harness.ts vocab [model]
  npx tsx scripts/ai-harness.ts validate "<word>" "<previousWord>" [model]
  `);
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    showHelp();
    return;
  }

  const mode = args[0];
  if (!apiKey) {
    console.error("Error: OPENROUTER_API_KEY is not defined in your .env file!");
    return;
  }

  switch (mode) {
    case "chat": {
      const prompt = args[1] || "Hello!";
      const model = args[2] || defaultModel;
      await testChat(prompt, model);
      break;
    }
    case "vocab": {
      const model = args[1] || defaultModel;
      await testVocab(model);
      break;
    }
    case "validate": {
      const word = args[1] || "coffee";
      const prev = args[2] || "tea";
      const model = args[3] || defaultModel;
      await testValidation(word, prev, model);
      break;
    }
    default:
      showHelp();
  }
}

run();
