import express, { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// @ts-ignore
import { YoutubeTranscript } from "youtube-transcript";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_URL = process.env.VITE_OLLAMA_URL || "http://127.0.0.1:11434";

// Ensure data folder and database files exist
const DATA_DIR = path.resolve(__dirname, "../data");
const VOCAB_FILE = path.join(DATA_DIR, "vocabulary.json");
const STREAKS_FILE = path.join(DATA_DIR, "streaks.json");
const HISTORY_FILE = path.join(DATA_DIR, "chat_history.json");
const LESSONS_FILE = path.join(DATA_DIR, "lessons.json");
const COMMON_VOCAB_FILE = path.join(DATA_DIR, "common_vocab.json");
const PROGRESS_FILE = path.join(DATA_DIR, "user_progress.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const initializeFile = (filePath: string, defaultContent: string) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultContent, "utf-8");
  }
};

// 36 Videos Pre-populated Metadata
const DEFAULT_LESSONS = [
  { id: "BCDXweG6CLc", title: "British Time Expressions You Need Every Day ⏰", videoId: "BCDXweG6CLc", isInitialized: false, vocab: [], lines: [] },
  { id: "cjJLqjjuOs4", title: "Can You Understand British Money Slang? 🇬🇧", videoId: "cjJLqjjuOs4", isInitialized: false, vocab: [], lines: [] },
  { id: "IXuJSwk1gck", title: "The English words you don't learn unless you go to England.", videoId: "IXuJSwk1gck", isInitialized: false, vocab: [], lines: [] },
  { id: "K9pY8Or7-GA", title: "If you want to be good at English... Don't go to school.", videoId: "K9pY8Or7-GA", isInitialized: false, vocab: [], lines: [] },
  { id: "-i7ixwtCsfI", title: "British Small Talk for English Learners (easier than you think)", videoId: "-i7ixwtCsfI", isInitialized: false, vocab: [], lines: [] },
  { id: "v-xAFgWxD_U", title: "Learn English: Good Habits vs Bad habits", videoId: "v-xAFgWxD_U", isInitialized: false, vocab: [], lines: [] },
  { id: "8pNMP3K9J3o", title: "Learn English while I explore Singapore | B1-B2 level", videoId: "8pNMP3K9J3o", isInitialized: false, vocab: [], lines: [] },
  { id: "0t_i3WEWPmE", title: "Learn English while I explore Busan's coastline | B1-B2 level", videoId: "0t_i3WEWPmE", isInitialized: false, vocab: [], lines: [] },
  { id: "-cgajIN2k7g", title: "Learn English while I travel to Busan | Comprehensible input vlog", videoId: "-cgajIN2k7g", isInitialized: false, vocab: [], lines: [] },
  { id: "MoqN5rZTOB8", title: "Learn English in Seoul | Comprehensible Input Vlog", videoId: "MoqN5rZTOB8", isInitialized: false, vocab: [], lines: [] },
  { id: "DqeDWOrIc2g", title: "Learn English in SEOUL 🇰🇷 🌸 Hanok Village, Gyeonbokgung, Korean food 🥘", videoId: "DqeDWOrIc2g", isInitialized: false, vocab: [], lines: [] },
  { id: "CqPtmnzdqS8", title: "Learn English at the AIRPORT ✈️ Vietnam to Seoul 🇻🇳🇰🇷 Comprehensible Input", videoId: "CqPtmnzdqS8", isInitialized: false, vocab: [], lines: [] },
  { id: "VgmVsuMys34", title: "Have you tried learning English like this? (Christmas edition) 🎅🏻 🎄", videoId: "VgmVsuMys34", isInitialized: false, vocab: [], lines: [] },
  { id: "I0X-OZd6EFo", title: "Getting ready for Christmas 🎄🎅 Learn English with comprehensible input", videoId: "I0X-OZd6EFo", isInitialized: false, vocab: [], lines: [] },
  { id: "3lEwi8RCPhI", title: "Moving House 🏡 Learn English 🇬🇧 Comprehensible Input 🗣️", videoId: "3lEwi8RCPhI", isInitialized: false, vocab: [], lines: [] },
  { id: "WycE-UoOnkc", title: "Learn English Slang with 2 British Boys 🇬🇧", videoId: "WycE-UoOnkc", isInitialized: false, vocab: [], lines: [] },
  { id: "BJsOHCUPnWY", title: "HOTEL ENGLISH 🏨 All you need to know for travelling abroad 🇬🇧✈️", videoId: "BJsOHCUPnWY", isInitialized: false, vocab: [], lines: [] },
  { id: "W7OIM1I77Wg", title: "Daily Life English - Korea Planning 🇰🇷 Shopping 🛍️ Pizza 🍕", videoId: "W7OIM1I77Wg", isInitialized: false, vocab: [], lines: [] },
  { id: "5aPkddzAT4A", title: "The RIGHT way to become fluent in ENGLISH", videoId: "5aPkddzAT4A", isInitialized: false, vocab: [], lines: [] },
  { id: "xD2IWnl7I3g", title: "Learn English in the Supermarket 🛒🍎 Comprehensible Input", videoId: "xD2IWnl7I3g", isInitialized: false, vocab: [], lines: [] },
  { id: "vub4dz7NRXA", title: "Real-Life English at the Mall 🛍️🍿 Comprehensible Input", videoId: "vub4dz7NRXA", isInitialized: false, vocab: [], lines: [] },
  { id: "DaP9OxWQOcs", title: "LEARN ENGLISH while I buy a plant 🌱 go for coffee ☕️ and cook pasta 🍝  Comprehensible Input", videoId: "DaP9OxWQOcs", isInitialized: false, vocab: [], lines: [] },
  { id: "4wPHt1x-JWc", title: "Learn English Clothes Vocabulary (B1-B2) | Comprehensible Input", videoId: "4wPHt1x-JWc", isInitialized: false, vocab: [], lines: [] },
  { id: "0ZvQzxYWiaM", title: "Learn English while I clean my house | Comprehensible Input", videoId: "0ZvQzxYWiaM", isInitialized: false, vocab: [], lines: [] },
  { id: "HxwA7WvhkwY", title: "Q&A: I got 100k subscribers teaching comprehensible input", videoId: "HxwA7WvhkwY", isInitialized: false, vocab: [], lines: [] },
  { id: "VsqkTzOVP9U", title: "My Daily Routine in the Countryside | Learn English with Comprehensible Input", videoId: "VsqkTzOVP9U", isInitialized: false, vocab: [], lines: [] },
  { id: "K5SnwXUb3N8", title: "I love travelling & teaching English 🚂 comprehensible input", videoId: "K5SnwXUb3N8", isInitialized: false, vocab: [], lines: [] },
  { id: "5IDjknB0Wr4", title: "Learn beautiful English in the city at night | comprehensible input", videoId: "5IDjknB0Wr4", isInitialized: false, vocab: [], lines: [] },
  { id: "SSIpq-ny9Kc", title: "Café Hopping & Learning English with us | comprehensible input", videoId: "SSIpq-ny9Kc", isInitialized: false, vocab: [], lines: [] },
  { id: "A7MgqFcYnkI", title: "an unexpected birthday 🎈 | Learn English with Comprehensible Input", videoId: "A7MgqFcYnkI", isInitialized: false, vocab: [], lines: [] },
  { id: "q2jiv5mXW4M", title: "How I Start My Day in the English Countryside | Comprehensible Input", videoId: "q2jiv5mXW4M", isInitialized: false, vocab: [], lines: [] },
  { id: "52t241OQ7Ec", title: "Learn English Through My Trip to London 🇬🇧 | Comprehensible Input", videoId: "52t241OQ7Ec", isInitialized: false, vocab: [], lines: [] },
  { id: "LDGDk6Sv1SI", title: "Learn English with vlog 🛵| mountain, beach and city vocabulary | Comprehensible Input", videoId: "LDGDk6Sv1SI", isInitialized: false, vocab: [], lines: [] },
  { id: "J85jdQ6VkDI", title: "Learn English for daily life 🛍️ | cooking, shopping + sunset picnic | comprehensible input", videoId: "J85jdQ6VkDI", isInitialized: false, vocab: [], lines: [] },
  { id: "BQhgHI8u-z4", title: "Learn English naturally 🌾| bike ride vocabulary in the countryside | comprehensible input", videoId: "BQhgHI8u-z4", isInitialized: false, vocab: [], lines: [] },
  { id: "RJbUtcaoNCY", title: "Learn English While Getting a Haircut in Vietnam 💇 | Barbershop Vocabulary | Comprehensible Input", videoId: "RJbUtcaoNCY", isInitialized: false, vocab: [], lines: [] }
];

initializeFile(VOCAB_FILE, "[]");
initializeFile(STREAKS_FILE, "[]");
initializeFile(HISTORY_FILE, "[]");
initializeFile(LESSONS_FILE, JSON.stringify(DEFAULT_LESSONS, null, 2));
initializeFile(COMMON_VOCAB_FILE, "[]");

const defaultProgress = {
  currentDay: 1,
  completedDays: {},
  todayTasks: {
    listen: false,
    shadow: false,
    speak: false,
    quiz: false
  }
};
initializeFile(PROGRESS_FILE, JSON.stringify(defaultProgress, null, 2));

app.use(express.json({ limit: '100kb' }));

// Root & Health check routes
app.get("/", (req: Request, res: Response) => {
  res.send("<h1>Bloom Backend Gateway is Running</h1><p>Navigate to http://localhost:3000 to use the web application.</p>");
});

app.get("/api", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Bloom API is online" });
});

// Helper: Fetch YouTube Timed Transcript using youtube-transcript package
async function getYoutubeTranscript(videoId: string) {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  if (!transcript || transcript.length === 0) {
    throw new Error("Empty transcript fetched from video.");
  }
  
  const lines = transcript.map(t => ({
    start: Math.round(t.offset / 1000), // convert offset from ms to seconds
    end: Math.round((t.offset + t.duration) / 1000), // convert from ms to seconds
    text: t.text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
  }));
  
  // Smooth end boundaries to prevent overlaps
  for (let i = 0; i < lines.length - 1; i++) {
    lines[i].end = lines[i + 1].start;
  }
  
  return lines;
}

// Helper: Reconstruct raw transcript segments into clean sentences with timestamps using punctuation rules
async function reconstructTranscriptIntoSentences(transcriptLines: any[]) {
  const words: { word: string; start: number; end: number; isLineEnd?: boolean }[] = [];

  for (const line of transcriptLines) {
    const text = line.text.trim();
    if (!text) continue;
    
    // Skip sound effect brackets
    if (text.startsWith("[") && text.endsWith("]")) continue;
    if (text.startsWith("(") && text.endsWith(")")) continue;

    const segmentWords = text.split(/\s+/).filter(w => {
      return !(w.startsWith("[") && w.endsWith("]")) && !(w.startsWith("(") && w.endsWith(")"));
    });

    if (segmentWords.length === 0) continue;

    const duration = line.end - line.start;
    const safeDuration = duration <= 0 ? 0.5 * segmentWords.length : duration;
    const wordDuration = safeDuration / segmentWords.length;

    for (let i = 0; i < segmentWords.length; i++) {
      words.push({
        word: segmentWords[i],
        start: Number((line.start + i * wordDuration).toFixed(2)),
        end: Number((line.start + (i + 1) * wordDuration).toFixed(2)),
        isLineEnd: i === segmentWords.length - 1
      });
    }
  }

  const sentences: any[] = [];
  let currentSentenceWords: typeof words = [];
  const ABBREVIATIONS = new Set(["mr", "mrs", "dr", "st", "vs", "eg", "ie", "jr", "sr", "co", "ltd", "inc", "approx", "etc"]);

  for (let i = 0; i < words.length; i++) {
    const item = words[i];
    currentSentenceWords.push(item);

    const wordText = item.word;
    const cleanWord = wordText.toLowerCase().replace(/[^a-z]/g, "");

    const lastChar = wordText[wordText.length - 1];
    let isSentenceEnd = (lastChar === '.' || lastChar === '?' || lastChar === '!') && !ABBREVIATIONS.has(cleanWord);

    // Safeguards for sentence splitting (applies to all transcripts)
    const nextItem = words[i + 1];
    const hasGap = nextItem && (nextItem.start - item.end) > 0.8;
    const isTooLong = currentSentenceWords.length >= 16;
    const isEndAndLongEnough = currentSentenceWords.length >= 10 && item.isLineEnd;

    if (isSentenceEnd || isTooLong || isEndAndLongEnough || hasGap) {
      isSentenceEnd = true;
    }

    if (isSentenceEnd || i === words.length - 1) {
      const sentenceText = currentSentenceWords.map(w => w.word).join(" ");
      const start = currentSentenceWords[0].start;
      const end = currentSentenceWords[currentSentenceWords.length - 1].end;

      sentences.push({
        start: Math.round(start),
        end: Math.round(end),
        text: sentenceText
      });

      currentSentenceWords = [];
    }
  }

  // Smooth end boundaries to prevent overlaps
  for (let i = 0; i < sentences.length - 1; i++) {
    sentences[i].end = sentences[i + 1].start;
  }
  return sentences;
}

  // --- Robustness Utilities ---

// Sequential Asynchronous File Write Queue to prevent race conditions
class FileWriteQueue {
  private queue: Promise<void> = Promise.resolve();

  async enqueueWrite(filePath: string, data: string): Promise<void> {
    const next = () => fs.promises.writeFile(filePath, data, "utf-8");
    this.queue = this.queue.then(next).catch((err) => {
      console.error(`[Bloom Queue] Failed writing to: ${filePath}`, err);
      throw err;
    });
    return this.queue;
  }
}
const fileWriteQueue = new FileWriteQueue();

// Simple In-Memory Rate Limiter Middleware
interface RateLimitInfo {
  count: number;
  resetTime: number;
}
const ipLimits = new Map<string, RateLimitInfo>();

const rateLimiter = (limit: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    
    let info = ipLimits.get(ip);
    if (!info || now > info.resetTime) {
      info = { count: 1, resetTime: now + windowMs };
      ipLimits.set(ip, info);
      return next();
    }
    
    if (info.count >= limit) {
      res.status(429).json({ error: "Too many requests, please try again later." });
      return;
    }
    
    info.count++;
    next();
  };
};

// Ollama Options Sanitizer & Clamping Utility
const sanitizeChatOptions = (clientOptions: any) => {
  const options: any = {};
  if (clientOptions) {
    if (typeof clientOptions.temperature === "number") {
      options.temperature = Math.max(0, Math.min(1.5, clientOptions.temperature));
    }
    if (typeof clientOptions.num_predict === "number") {
      options.num_predict = Math.max(1, Math.min(150, clientOptions.num_predict));
    }
    if (typeof clientOptions.num_ctx === "number") {
      options.num_ctx = Math.max(256, Math.min(4096, clientOptions.num_ctx));
    }
  }
  return options;
};

// 1. Ollama Chat Gateway Proxy Route with rate limiting and options sanitization
app.post("/api/chat", rateLimiter(15, 60000), async (req: Request, res: Response) => {
  try {
    const { model, messages, options, stream } = req.body;
    const sanitizedOptions = sanitizeChatOptions(options);

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "gemma2:2b",
        messages: messages || [],
        stream: stream === true,
        options: sanitizedOptions
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ error: `Ollama error: ${errorText}` });
      return;
    }

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const bodyStream = response.body;
      if (!bodyStream) {
        res.status(500).json({ error: "Ollama returned an empty response body stream" });
        return;
      }

      // @ts-ignore
      const reader = bodyStream.getReader();
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          res.write(value);
        }
      }
      res.end();
      return;
    }

    const data = await response.json();

    // Log chat history asynchronously
    try {
      const historyRaw = await fs.promises.readFile(HISTORY_FILE, "utf-8");
      const history = JSON.parse(historyRaw);
      history.push({
        timestamp: new Date().toISOString(),
        messages: messages,
        assistantResponse: data.message
      });
      await fileWriteQueue.enqueueWrite(HISTORY_FILE, JSON.stringify(history, null, 2));
    } catch (logErr) {
      console.error("Failed to log chat history:", logErr);
    }

    res.json(data);
  } catch (err: any) {
    console.error("Server API Chat Error:", err);
    res.status(500).json({ error: "Failed to communicate with Ollama", details: err.message });
  }
});

// 1b. Ollama connection health check endpoint
app.get("/api/ollama/health", async (req: Request, res: Response) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      method: "GET",
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      res.json({ status: "ok", models: data.models || [] });
    } else {
      res.json({ status: "error", message: `Ollama returned status ${response.status}` });
    }
  } catch (err: any) {
    res.json({ status: "error", message: "Failed to connect to local Ollama service" });
  }
});

// 2. Vocabulary API Routes (Asynchronous & Sanitized)
app.get("/api/vocabulary", async (req: Request, res: Response) => {
  try {
    const data = await fs.promises.readFile(VOCAB_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read vocabulary data", details: err.message });
  }
});

app.get("/api/common-vocabulary", async (req: Request, res: Response) => {
  try {
    const data = await fs.promises.readFile(COMMON_VOCAB_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read common vocabulary data", details: err.message });
  }
});

app.post("/api/vocabulary", async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body || typeof body.word !== "string" || !body.word.trim()) {
      res.status(400).json({ error: "Word object with word property is required" });
      return;
    }

    // Input Sanitization to only permitted keys
    const newWord = {
      word: body.word.trim(),
      ipa: typeof body.ipa === "string" ? body.ipa.trim() : "",
      definition: typeof body.definition === "string" ? body.definition.trim() : "",
      example: typeof body.example === "string" ? body.example.trim() : "",
      day: typeof body.day === "number" ? body.day : 1,
      dateSaved: typeof body.dateSaved === "string" ? body.dateSaved.trim() : (() => {
        const d = new Date();
        const offset = d.getTimezoneOffset();
        const localDate = new Date(d.getTime() - offset * 60 * 1000);
        return localDate.toISOString().split("T")[0];
      })()
    };

    const dataRaw = await fs.promises.readFile(VOCAB_FILE, "utf-8");
    const vocab = JSON.parse(dataRaw);

    const exists = vocab.some((w: any) => w.word.toLowerCase() === newWord.word.toLowerCase());
    if (!exists) {
      vocab.push(newWord);
      await fileWriteQueue.enqueueWrite(VOCAB_FILE, JSON.stringify(vocab, null, 2));
    }

    res.json(vocab);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save vocabulary word", details: err.message });
  }
});

app.delete("/api/vocabulary/:word", async (req: Request, res: Response) => {
  try {
    const targetWord = req.params.word.toLowerCase();
    const dataRaw = await fs.promises.readFile(VOCAB_FILE, "utf-8");
    const vocab = JSON.parse(dataRaw);

    const filtered = vocab.filter((w: any) => w.word.toLowerCase() !== targetWord);
    await fileWriteQueue.enqueueWrite(VOCAB_FILE, JSON.stringify(filtered, null, 2));

    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete vocabulary word", details: err.message });
  }
});

// 3. Streaks API Routes (Asynchronous)
app.get("/api/streaks", async (req: Request, res: Response) => {
  try {
    const data = await fs.promises.readFile(STREAKS_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read streak data", details: err.message });
  }
});

app.post("/api/streaks", async (req: Request, res: Response) => {
  try {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    const todayStr = localDate.toISOString().split("T")[0];
    
    const dataRaw = await fs.promises.readFile(STREAKS_FILE, "utf-8");
    const streaks = JSON.parse(dataRaw);

    if (!streaks.includes(todayStr)) {
      streaks.push(todayStr);
      await fileWriteQueue.enqueueWrite(STREAKS_FILE, JSON.stringify(streaks, null, 2));
    }

    res.json(streaks);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save streak date", details: err.message });
  }
});

// 4. Dynamic Lessons Playlist Routes (Asynchronous)
app.get("/api/lessons", async (req: Request, res: Response) => {
  try {
    const data = await fs.promises.readFile(LESSONS_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read lessons data", details: err.message });
  }
});

app.post("/api/lessons/:id/initialize", rateLimiter(5, 60000), async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.id;
    const lessonsRaw = await fs.promises.readFile(LESSONS_FILE, "utf-8");
    const lessons = JSON.parse(lessonsRaw);
    
    const lessonIndex = lessons.findIndex((l: any) => l.id === lessonId);
    if (lessonIndex === -1) {
      res.status(404).json({ error: "Lesson not found." });
      return;
    }
    
    const lesson = lessons[lessonIndex];
    
    // 1. Fetch transcript lines directly from YouTube video
    console.log(`[Bloom Server] Fetching subtitles for video: ${lesson.videoId}...`);
    const rawLines = await getYoutubeTranscript(lesson.videoId);
    
    if (rawLines.length === 0) {
      throw new Error("No caption lines parsed from video.");
    }

    console.log(`[Bloom Server] Reconstructing transcript lines into complete sentences...`);
    const transcriptLines = await reconstructTranscriptIntoSentences(rawLines);
    
    // 2. Send transcript snippet to Llama-3 to extract 5-6 British vocabulary words
    const snippetText = transcriptLines.slice(0, 100).map(l => l.text).join(" ");
    console.log(`[Bloom Server] Asking Llama-3 to extract British vocabulary words...`);
    
    const systemPrompt = `You are a professional British lexicographer. Extract exactly 5-6 interesting British vocabulary words, idioms, or slang phrases present or relevant to this lesson:
    "${snippetText}"

    Output a valid JSON array matching this TypeScript structure:
    interface VocabWord {
      word: string;
      ipa: string;
      definition: string;
      example: string;
    }

    Rules:
    - Respond ONLY with the raw JSON array.
    - Do NOT wrap in markdown code blocks like \`\`\`json.
    - Do NOT output any preamble, notes, or chat text.`;

    const clientModel = req.body?.model || "llama3";

    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: clientModel,
        messages: [{ role: "system", content: systemPrompt }],
        stream: false,
        options: { temperature: 0.3 }
      })
    });

    let vocab: any[] = [];
    if (ollamaResponse.ok) {
      const ollamaData = await ollamaResponse.json();
      let responseText = ollamaData.message?.content || "[]";
      
      responseText = responseText.trim();
      const startIndex = responseText.indexOf("[");
      const endIndex = responseText.lastIndexOf("]");
      if (startIndex !== -1 && endIndex !== -1) {
        responseText = responseText.substring(startIndex, endIndex + 1);
      }
      
      try {
        vocab = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("Failed to parse Llama-3 vocabulary response. Using defaults.", parseErr);
        // Fallback vocabulary
        vocab = [
          { word: "fluent", ipa: "/ˈfluːənt/", definition: "able to speak or write a foreign language easily and accurately", example: "He is fluent in English." }
        ];
      }
    }

    // 3. Update lesson in array
    lesson.vocab = vocab;
    lesson.lines = transcriptLines;
    lesson.isInitialized = true;
    
    lessons[lessonIndex] = lesson;
    await fileWriteQueue.enqueueWrite(LESSONS_FILE, JSON.stringify(lessons, null, 2));
    console.log(`[Bloom Server] Lesson ${lessonId} initialized successfully with ${vocab.length} words and ${transcriptLines.length} lines.`);
    
    res.json(lesson);
  } catch (err: any) {
    console.error(`Failed to initialize lesson:`, err);
    res.status(500).json({ error: "Failed to initialize lesson captions & vocabulary", details: err.message });
  }
});

// 5. User Progress Daily Progression API Routes (Asynchronous)
app.get("/api/progress", async (req: Request, res: Response) => {
  try {
    const data = await fs.promises.readFile(PROGRESS_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read progress data", details: err.message });
  }
});

app.post("/api/progress/task", async (req: Request, res: Response) => {
  try {
    const { taskName, completed } = req.body;
    if (!taskName || typeof completed !== "boolean") {
      res.status(400).json({ error: "Invalid task parameter payload" });
      return;
    }

    const dataRaw = await fs.promises.readFile(PROGRESS_FILE, "utf-8");
    const progress = JSON.parse(dataRaw);

    if (progress.todayTasks.hasOwnProperty(taskName)) {
      progress.todayTasks[taskName] = completed;
      await fileWriteQueue.enqueueWrite(PROGRESS_FILE, JSON.stringify(progress, null, 2));
    }

    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update progress task", details: err.message });
  }
});

app.post("/api/progress/next-day", async (req: Request, res: Response) => {
  try {
    const dataRaw = await fs.promises.readFile(PROGRESS_FILE, "utf-8");
    const progress = JSON.parse(dataRaw);

    const tasks = progress.todayTasks;
    const allCompleted = tasks.listen && tasks.shadow && tasks.speak && tasks.quiz;

    if (allCompleted) {
      const finishedDay = progress.currentDay;
      progress.completedDays[finishedDay] = { ...tasks };
      progress.currentDay = finishedDay + 1;
      progress.todayTasks = {
        listen: false,
        shadow: false,
        speak: false,
        quiz: false
      };

      // Record streak date for today
      const d = new Date();
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - offset * 60 * 1000);
      const todayStr = localDate.toISOString().split("T")[0];

      try {
        const streaksRaw = await fs.promises.readFile(STREAKS_FILE, "utf-8");
        const streaks = JSON.parse(streaksRaw);
        if (!streaks.includes(todayStr)) {
          streaks.push(todayStr);
          await fileWriteQueue.enqueueWrite(STREAKS_FILE, JSON.stringify(streaks, null, 2));
        }
      } catch (streakErr) {
        console.error("Failed to automatically record streak on day complete:", streakErr);
      }

      await fileWriteQueue.enqueueWrite(PROGRESS_FILE, JSON.stringify(progress, null, 2));
    }

    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to proceed to next day", details: err.message });
  }
});

app.post("/api/progress/reset", rateLimiter(3, 60000), async (req: Request, res: Response) => {
  try {
    // Require explicit confirmation token to prevent accidental/malicious resets
    if (req.body?.confirm !== true) {
      res.status(400).json({ error: "Missing confirm token. Send { confirm: true } to reset progress." });
      return;
    }
    const defaultProgress = {
      currentDay: 1,
      completedDays: {},
      todayTasks: {
        listen: false,
        shadow: false,
        speak: false,
        quiz: false
      }
    };
    await fileWriteQueue.enqueueWrite(PROGRESS_FILE, JSON.stringify(defaultProgress, null, 2));
    res.json(defaultProgress);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reset progress", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Bloom Server] Backend initialized and running on http://localhost:${PORT}`);
});
