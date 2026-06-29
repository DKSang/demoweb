import express, { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// @ts-ignore
import { YoutubeTranscript } from "youtube-transcript";
import dotenv from "dotenv";
import { DatabaseSync } from "node:sqlite";
import {
  extractVocabFromLesson,
  openSession,
  processTurn,
  generateDebrief
} from "./coach/coach.js";
import { SessionContext, ConversationTurn, SessionPhase } from "./coach/types.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "qwen/qwen3-next-80b-a3b-instruct";

// Ensure data folder exists
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

// Initialize SQLite database connection
const DB_FILE = path.join(DATA_DIR, "bloom.db");
const db = new DatabaseSync(DB_FILE);

// Setup database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS vocabulary (
    word TEXT PRIMARY KEY,
    ipa TEXT,
    definition TEXT,
    example TEXT,
    day INTEGER,
    dateSaved TEXT
  );

  CREATE TABLE IF NOT EXISTS progress (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id TEXT PRIMARY KEY,
    role TEXT,
    content TEXT,
    correction TEXT
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    title TEXT,
    videoId TEXT,
    isInitialized INTEGER,
    vocab TEXT,
    lines TEXT,
    theme TEXT,
    gameStartWords TEXT
  );

  CREATE TABLE IF NOT EXISTS streaks (
    date TEXT PRIMARY KEY
  );
`);

// Database Migration and Seeding
const defaultProgress = {
  currentDay: 1,
  completedDays: {},
  todayTasks: {
    listen: false,
    shadow: false,
    speak: false,
    game: false
  }
};

// 1. Initialize progress table
const stmtCheckProg = db.prepare("SELECT COUNT(*) as count FROM progress");
const rowProg: any = stmtCheckProg.get();
if (rowProg.count === 0) {
  let initialProgress = defaultProgress;
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const dataRaw = fs.readFileSync(PROGRESS_FILE, "utf-8");
      const progress = JSON.parse(dataRaw);

      let todayTasks = progress.todayTasks || { listen: false, shadow: false, speak: false, game: false };
      if (todayTasks.hasOwnProperty("quiz")) {
        todayTasks.game = todayTasks.quiz;
        delete todayTasks.quiz;
      }
      let completedDays = progress.completedDays || {};
      for (const d in completedDays) {
        if (completedDays[d].hasOwnProperty("quiz")) {
          completedDays[d].game = completedDays[d].quiz;
          delete completedDays[d].quiz;
        }
      }
      initialProgress = {
        currentDay: progress.currentDay || 1,
        completedDays,
        todayTasks
      };
    } catch (err) {
      console.error("Failed to parse progress.json for SQLite database initialization:", err);
    }
  }
  const stmtInsert = db.prepare("INSERT OR REPLACE INTO progress (key, value) VALUES (?, ?)");
  stmtInsert.run("currentDay", String(initialProgress.currentDay));
  stmtInsert.run("completedDays", JSON.stringify(initialProgress.completedDays));
  stmtInsert.run("todayTasks", JSON.stringify(initialProgress.todayTasks));
  console.log("[Bloom Server] Initialized progress table in SQLite database.");
}

// Helper getter/setter functions for progress
const getProgress = () => {
  const stmt = db.prepare("SELECT key, value FROM progress");
  const rows = stmt.all() as { key: string, value: string }[];

  const progress: any = {
    currentDay: 1,
    completedDays: {},
    todayTasks: { listen: false, shadow: false, speak: false, game: false }
  };

  for (const row of rows) {
    if (row.key === "currentDay") {
      progress.currentDay = Number(row.value);
    } else if (row.key === "completedDays") {
      progress.completedDays = JSON.parse(row.value);
    } else if (row.key === "todayTasks") {
      progress.todayTasks = JSON.parse(row.value);
    }
  }
  return progress;
};

const saveProgress = (progress: any) => {
  const stmt = db.prepare("INSERT OR REPLACE INTO progress (key, value) VALUES (?, ?)");
  stmt.run("currentDay", String(progress.currentDay));
  stmt.run("completedDays", JSON.stringify(progress.completedDays));
  stmt.run("todayTasks", JSON.stringify(progress.todayTasks));
};

// Get today's vocabulary for word games
const getTodaysVocabulary = () => {
  const today = new Date().toISOString().split("T")[0];
  const currentDayStmt = db.prepare("SELECT value FROM progress WHERE key = 'currentDay'");
  const currentDayRow = currentDayStmt.get() as { value: string } | undefined;
  const currentDay = currentDayRow ? Number(currentDayRow.value) : 1;

  // Get vocabulary saved today or for current day
  const stmt = db.prepare("SELECT word, ipa, definition, example, day FROM vocabulary WHERE dateSaved = ? OR day = ? ORDER BY word");
  const rows = stmt.all(today, currentDay) as { word: string, ipa: string, definition: string, example: string, day: number }[];

  return rows.map(row => ({
    word: row.word,
    ipa: row.ipa,
    definition: row.definition,
    example: row.example,
    day: row.day
  }));
};

// Get recent vocabulary for word games (last 7 days)
const getRecentVocabulary = (days: number = 7) => {
  const stmt = db.prepare(`
    SELECT word, ipa, definition, example, day, dateSaved
    FROM vocabulary
    WHERE dateSaved >= date('now', ?)
    ORDER BY dateSaved DESC, word
  `);
  const rows = stmt.all(`-${days} days`) as { word: string, ipa: string, definition: string, example: string, day: number, dateSaved: string }[];

  return rows.map(row => ({
    word: row.word,
    ipa: row.ipa,
    definition: row.definition,
    example: row.example,
    day: row.day,
    dateSaved: row.dateSaved
  }));
};

// Get or create game streak
const getGameStreak = (): { count: number; lastPlayed: string | null } => {
  const stmt = db.prepare("SELECT value FROM progress WHERE key = 'gameStreak'");
  const row = stmt.get() as { value: string } | undefined;

  if (!row) {
    return { count: 0, lastPlayed: null };
  }

  const data = JSON.parse(row.value);
  return { count: data.count || 0, lastPlayed: data.lastPlayed || null };
};

const updateGameStreak = () => {
  const today = new Date().toISOString().split("T")[0];
  const current = getGameStreak();

  let newCount = current.count + 1;

  // Reset streak if last played was more than 1 day ago
  if (current.lastPlayed) {
    const lastDate = new Date(current.lastPlayed);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      newCount = 1; // Reset streak
    }
  }

  const stmt = db.prepare("INSERT OR REPLACE INTO progress (key, value) VALUES (?, ?)");
  stmt.run("gameStreak", JSON.stringify({ count: newCount, lastPlayed: today }));

  return { count: newCount, lastPlayed: today };
};

// Get user achievements
const getUserAchievements = () => {
  const stmt = db.prepare("SELECT value FROM progress WHERE key = 'achievements'");
  const row = stmt.get() as { value: string } | undefined;

  if (!row) {
    return [];
  }

  return JSON.parse(row.value);
};

const addAchievement = (achievement: string) => {
  const achievements = getUserAchievements();
  if (!achievements.includes(achievement)) {
    achievements.push(achievement);
    const stmt = db.prepare("INSERT OR REPLACE INTO progress (key, value) VALUES (?, ?)");
    stmt.run("achievements", JSON.stringify(achievements));
  }
  return achievements;
};

// 2. Initialize lessons table
const rowLessons: any = db.prepare("SELECT COUNT(*) as count FROM lessons").get();
if (rowLessons.count === 0) {
  let initialLessons = DEFAULT_LESSONS;
  if (fs.existsSync(LESSONS_FILE)) {
    try {
      const raw = fs.readFileSync(LESSONS_FILE, "utf-8");
      initialLessons = JSON.parse(raw);
    } catch (err) {
      console.error("Failed to read lessons.json for SQLite database initialization:", err);
    }
  }
  const stmtInsert = db.prepare(`
    INSERT OR REPLACE INTO lessons (id, title, videoId, isInitialized, vocab, lines, theme, gameStartWords)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const l of initialLessons) {
    // Add fallbacks for theme and gameStartWords in database migration
    let theme = (l as any).theme;
    if (!theme) {
      if (l.title.toLowerCase().includes("haircut")) {
        theme = "Haircut";
      } else if (l.title.toLowerCase().includes("time")) {
        theme = "Time Expressions";
      } else if (l.title.toLowerCase().includes("money") || l.title.toLowerCase().includes("slang")) {
        theme = "Money Slang";
      } else {
        theme = "Conversation";
      }
    }
    let gameStartWords = (l as any).gameStartWords;
    if (!gameStartWords || gameStartWords.length === 0) {
      gameStartWords = l.vocab && l.vocab.length > 0
        ? l.vocab.map((v: any) => v.word)
        : ["Conversation", "Language", "Vocabulary", "Speaking", "Practice"];
    }

    stmtInsert.run(
      l.id,
      l.title,
      l.videoId,
      l.isInitialized ? 1 : 0,
      JSON.stringify(l.vocab || []),
      JSON.stringify(l.lines || []),
      theme,
      JSON.stringify(gameStartWords)
    );
  }
  console.log("[Bloom Server] Populated lessons table in SQLite database.");
}

// 3. Initialize vocabulary table
const rowVocab: any = db.prepare("SELECT COUNT(*) as count FROM vocabulary").get();
if (rowVocab.count === 0 && fs.existsSync(VOCAB_FILE)) {
  try {
    const dataRaw = fs.readFileSync(VOCAB_FILE, "utf-8");
    const vocab = JSON.parse(dataRaw);
    if (Array.isArray(vocab)) {
      const stmtInsert = db.prepare("INSERT OR REPLACE INTO vocabulary (word, ipa, definition, example, day, dateSaved) VALUES (?, ?, ?, ?, ?, ?)");
      for (const item of vocab) {
        stmtInsert.run(
          item.word,
          item.ipa || "",
          item.definition || "",
          item.example || "",
          item.day || 1,
          item.dateSaved || new Date().toISOString().split("T")[0]
        );
      }
      console.log("[Bloom Server] Migrated vocabulary.json to SQLite database.");
    }
  } catch (err) {
    console.error("Failed to migrate vocabulary to SQLite:", err);
  }
}

// 4. Initialize streaks table
const rowStreaks: any = db.prepare("SELECT COUNT(*) as count FROM streaks").get();
if (rowStreaks.count === 0 && fs.existsSync(STREAKS_FILE)) {
  try {
    const raw = fs.readFileSync(STREAKS_FILE, "utf-8");
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      const stmtInsert = db.prepare("INSERT OR IGNORE INTO streaks (date) VALUES (?)");
      for (const d of list) {
        stmtInsert.run(d);
      }
      console.log("[Bloom Server] Migrated streaks.json to SQLite database.");
    }
  } catch (err) {
    console.error("Failed to migrate streaks to SQLite:", err);
  }
}

// 5. Initialize chat history table
const rowHistory: any = db.prepare("SELECT COUNT(*) as count FROM chat_history").get();
if (rowHistory.count === 0 && fs.existsSync(HISTORY_FILE)) {
  try {
    const dataRaw = fs.readFileSync(HISTORY_FILE, "utf-8");
    const history = JSON.parse(dataRaw);
    if (Array.isArray(history)) {
      const stmtInsert = db.prepare("INSERT OR REPLACE INTO chat_history (id, role, content, correction) VALUES (?, ?, ?, ?)");
      for (const msg of history) {
        stmtInsert.run(
          msg.id || Math.random().toString(36).substring(7),
          msg.role || "user",
          msg.content || "",
          msg.correction ? JSON.stringify(msg.correction) : null
        );
      }
      console.log("[Bloom Server] Migrated chat_history.json to SQLite database.");
    }
  } catch (err) {
    console.error("Failed to migrate chat history to SQLite:", err);
  }
}

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

// SQLite handles synchronization and write transactions natively. FileWriteQueue is deprecated.

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

// OpenRouter Options Sanitizer & Clamping Utility
const sanitizeChatOptions = (clientOptions: any) => {
  const options: any = {};
  if (clientOptions) {
    if (typeof clientOptions.temperature === "number") {
      options.temperature = Math.max(0, Math.min(1.5, clientOptions.temperature));
    }
    if (typeof clientOptions.num_predict === "number") {
      options.num_predict = Math.max(1, Math.min(2000, clientOptions.num_predict));
    }
    if (typeof clientOptions.num_ctx === "number") {
      options.num_ctx = Math.max(256, Math.min(4096, clientOptions.num_ctx));
    }
  }
  return options;
};

// OpenRouter Helper function
async function callOpenRouter(messages: any[], temperature = 0.3, maxTokens = 1000, modelOverride?: string) {
  const model = modelOverride || OPENROUTER_MODEL || "qwen/qwen3-next-80b-a3b-instruct";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Bloom English Lab"
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


// 1. OpenRouter Chat Gateway Proxy Route with rate limiting and options sanitization
app.post("/api/chat", rateLimiter(15, 60000), async (req: Request, res: Response) => {
  try {
    const { model, messages, options, stream } = req.body;
    const sanitizedOptions = sanitizeChatOptions(options);
    const targetModel = model || OPENROUTER_MODEL || "qwen/qwen3-next-80b-a3b-instruct";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Bloom English Lab"
      },
      body: JSON.stringify({
        model: targetModel,
        messages: messages || [],
        stream: stream === true,
        temperature: sanitizedOptions.temperature ?? 0.7,
        max_tokens: sanitizedOptions.num_predict ?? 1000 // Map num_predict to max_tokens
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ error: `OpenRouter error: ${errorText}` });
      return;
    }

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const bodyStream = response.body;
      if (!bodyStream) {
        res.status(500).json({ error: "OpenRouter returned an empty response body stream" });
        return;
      }

      // @ts-ignore
      const reader = bodyStream.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          let lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith("data: ")) {
              const dataStr = cleanLine.substring(6).trim();
              if (dataStr === "[DONE]") {
                continue;
              }
              try {
                const parsed = JSON.parse(dataStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  res.write(JSON.stringify({ message: { content } }) + "\n");
                }
              } catch (e) {
                // Ignore partial JSON parsing errors
              }
            }
          }
        }
      }

      if (buffer.trim().startsWith("data: ")) {
        const dataStr = buffer.trim().substring(6).trim();
        if (dataStr !== "[DONE]") {
          try {
            const parsed = JSON.parse(dataStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              res.write(JSON.stringify({ message: { content } }) + "\n");
            }
          } catch (e) {}
        }
      }

      res.end();
      return;
    }

    const openRouterData = await response.json();
    const assistantContent = openRouterData.choices?.[0]?.message?.content || "";

    const data = {
      model: targetModel,
      message: {
        role: "assistant",
        content: assistantContent
      },
      done: true
    };

    // Log chat history in SQLite database
    try {
      const stmtInsert = db.prepare("INSERT OR REPLACE INTO chat_history (id, role, content, correction) VALUES (?, ?, ?, ?)");
      const userMsg = messages[messages.length - 1];
      if (userMsg) {
        stmtInsert.run(
          Math.random().toString(36).substring(7),
          userMsg.role,
          userMsg.content,
          userMsg.correction ? JSON.stringify(userMsg.correction) : null
        );
      }
      stmtInsert.run(
        Math.random().toString(36).substring(7),
        data.message.role,
        data.message.content,
        null
      );
    } catch (logErr) {
      console.error("Failed to log chat history:", logErr);
    }

    res.json(data);
  } catch (err: any) {
    console.error("Server API Chat Error:", err);
    res.status(500).json({ error: "Failed to communicate with OpenRouter", details: err.message });
  }
});

// Helper to construct SessionContext from database lesson and history
function buildSessionContext(lesson: any, historyMessages: any[], phase: SessionPhase): SessionContext {
  const videoLesson = {
    youtubeUrl: `https://www.youtube.com/watch?v=${lesson.videoId}`,
    videoId: lesson.videoId,
    title: lesson.title,
    transcript: JSON.parse(lesson.lines || "[]").map((l: any) => ({
      text: l.text,
      offset: l.start ?? 0,
      duration: l.end !== undefined && l.start !== undefined ? l.end - l.start : 0
    })),
    rawTranscript: JSON.parse(lesson.lines || "[]").map((l: any) => l.text).join(" "),
    fetchedAt: new Date()
  };

  const vocabResult = {
    topic: lesson.theme || "Conversation",
    vocab: JSON.parse(lesson.vocab || "[]").map((v: any) => ({
      word: v.word,
      ipa: v.ipa || "",
      partOfSpeech: v.partOfSpeech || "phrase",
      definition: v.definition || "",
      example: v.example || ""
    })),
    keyPhrases: JSON.parse(lesson.gameStartWords || "[]")
  };

  const history: ConversationTurn[] = historyMessages.map((m: any) => ({
    role: m.role === "user" ? "learner" : "coach",
    text: m.content,
    timestamp: new Date(),
    phase: m.phase || "practice",
    feedbackScore: m.feedback?.score
  }));

  return {
    lesson: videoLesson,
    vocab: vocabResult,
    phase,
    history,
    sessionStarted: new Date(),
    turnsCompleted: history.filter(h => h.role === "learner").length
  };
}

// 1c. Open Session for AI Coach
app.post("/api/coach/open-session", rateLimiter(10, 60000), async (req: Request, res: Response) => {
  try {
    const { lessonId, day, model } = req.body;
    if (!lessonId || !day) {
      return res.status(400).json({ error: "Missing lessonId or day" });
    }

    const stmtFind = db.prepare("SELECT * FROM lessons WHERE id = ?");
    const lessonRow: any = stmtFind.get(lessonId);
    if (!lessonRow) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const clientModel = model || OPENROUTER_MODEL || "qwen/qwen3-next-80b-a3b-instruct";
    const ctx = buildSessionContext(lessonRow, [], "shadow");

    const coachResp = await openSession(ctx);

    const welcomeMsg = {
      id: `bot-${Date.now()}`,
      role: "assistant",
      content: coachResp.reply,
      phase: "shadow",
      usedVocab: coachResp.usedVocab || []
    };

    // Save initial message in history
    const historyKey = `chat_${lessonId}_${day}`;
    const stmtInsert = db.prepare("INSERT OR REPLACE INTO progress (key, value) VALUES (?, ?)");
    stmtInsert.run(historyKey, JSON.stringify([welcomeMsg]));

    res.json(welcomeMsg);
  } catch (err: any) {
    console.error("Failed to open AI Coach session:", err);
    res.status(500).json({ error: "Failed to open AI Coach session", details: err.message });
  }
});

// 1d. Process Turn for AI Coach
app.post("/api/coach/process-turn", rateLimiter(15, 60000), async (req: Request, res: Response) => {
  try {
    const { lessonId, day, message, phase, model } = req.body;
    if (!lessonId || !day || message === undefined || !phase) {
      return res.status(400).json({ error: "Missing lessonId, day, message or phase" });
    }

    const stmtFind = db.prepare("SELECT * FROM lessons WHERE id = ?");
    const lessonRow: any = stmtFind.get(lessonId);
    if (!lessonRow) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const historyKey = `chat_${lessonId}_${day}`;
    const stmtHistory = db.prepare("SELECT value FROM progress WHERE key = ?");
    const row = stmtHistory.get(historyKey) as { value: string } | undefined;
    const existingMessages = row ? JSON.parse(row.value) : [];

    const clientModel = model || OPENROUTER_MODEL || "qwen/qwen3-next-80b-a3b-instruct";
    const ctx = buildSessionContext(lessonRow, existingMessages, phase);

    const coachResp = await processTurn(message, ctx);

    // Save learner message
    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      phase: phase
    };

    // Backwards compatible correction format if AI provided feedback
    let correction = undefined;
    if (coachResp.feedbackOnLearner?.naturalAlternative) {
      correction = {
        original: message,
        corrected: coachResp.feedbackOnLearner.naturalAlternative,
        explanation: coachResp.feedbackOnLearner.improvements.join(" ")
      };
    }

    // Save coach reply
    const nextPhase = coachResp.suggestedNextPhase || phase;
    const botMsg = {
      id: `bot-${Date.now()}`,
      role: "assistant",
      content: coachResp.reply,
      phase: nextPhase,
      usedVocab: coachResp.usedVocab || [],
      feedback: coachResp.feedbackOnLearner || null,
      correction
    };

    const updatedMessages = [...existingMessages, userMsg, botMsg];
    const stmtInsert = db.prepare("INSERT OR REPLACE INTO progress (key, value) VALUES (?, ?)");
    stmtInsert.run(historyKey, JSON.stringify(updatedMessages));

    res.json(botMsg);
  } catch (err: any) {
    console.error("Failed to process AI Coach turn:", err);
    res.status(500).json({ error: "Failed to process AI Coach turn", details: err.message });
  }
});

// 1e. Generate Debrief for AI Coach
app.post("/api/coach/debrief", rateLimiter(10, 60000), async (req: Request, res: Response) => {
  try {
    const { lessonId, day, model } = req.body;
    if (!lessonId || !day) {
      return res.status(400).json({ error: "Missing lessonId or day" });
    }

    const stmtFind = db.prepare("SELECT * FROM lessons WHERE id = ?");
    const lessonRow: any = stmtFind.get(lessonId);
    if (!lessonRow) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const historyKey = `chat_${lessonId}_${day}`;
    const stmtHistory = db.prepare("SELECT value FROM progress WHERE key = ?");
    const row = stmtHistory.get(historyKey) as { value: string } | undefined;
    const existingMessages = row ? JSON.parse(row.value) : [];

    const clientModel = model || OPENROUTER_MODEL || "qwen/qwen3-next-80b-a3b-instruct";
    const ctx = buildSessionContext(lessonRow, existingMessages, "debrief");

    const debriefText = await generateDebrief(ctx);

    const debriefMsg = {
      id: `bot-${Date.now()}`,
      role: "assistant",
      content: debriefText,
      phase: "debrief",
      usedVocab: []
    };

    const updatedMessages = [...existingMessages, debriefMsg];
    const stmtInsert = db.prepare("INSERT OR REPLACE INTO progress (key, value) VALUES (?, ?)");
    stmtInsert.run(historyKey, JSON.stringify(updatedMessages));

    res.json(debriefMsg);
  } catch (err: any) {
    console.error("Failed to generate AI Coach debrief:", err);
    res.status(500).json({ error: "Failed to generate AI Coach debrief", details: err.message });
  }
});

// 1b. OpenRouter connection health check endpoint
app.get("/api/openrouter/health", async (req: Request, res: Response) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Bloom English Lab"
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      res.json({ status: "ok", models: data.data || [] });
    } else {
      res.json({ status: "error", message: `OpenRouter returned status ${response.status}` });
    }
  } catch (err: any) {
    res.json({ status: "error", message: "Failed to connect to OpenRouter service" });
  }
});

// 2. Vocabulary API Routes (SQLite)
app.get("/api/vocabulary", (req: Request, res: Response) => {
  try {
    const stmt = db.prepare("SELECT * FROM vocabulary");
    const rows = stmt.all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read vocabulary data", details: err.message });
  }
});

app.get("/api/common-vocabulary", async (req: Request, res: Response) => {
  try {
    // Read-only static asset is still read from filesystem safely
    const data = await fs.promises.readFile(COMMON_VOCAB_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read common vocabulary data", details: err.message });
  }
});

app.post("/api/vocabulary", (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body || typeof body.word !== "string" || !body.word.trim()) {
      res.status(400).json({ error: "Word object with word property is required" });
      return;
    }

    const word = body.word.trim();
    const ipa = typeof body.ipa === "string" ? body.ipa.trim() : "";
    const definition = typeof body.definition === "string" ? body.definition.trim() : "";
    const example = typeof body.example === "string" ? body.example.trim() : "";
    const day = typeof body.day === "number" ? body.day : 1;
    const dateSaved = typeof body.dateSaved === "string" ? body.dateSaved.trim() : (() => {
      const d = new Date();
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - offset * 60 * 1000);
      return localDate.toISOString().split("T")[0];
    })();

    const stmtInsert = db.prepare(`
      INSERT OR REPLACE INTO vocabulary (word, ipa, definition, example, day, dateSaved)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmtInsert.run(word, ipa, definition, example, day, dateSaved);

    const rows = db.prepare("SELECT * FROM vocabulary").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save vocabulary word", details: err.message });
  }
});

app.delete("/api/vocabulary/:word", (req: Request, res: Response) => {
  try {
    const targetWord = req.params.word;
    const stmtDelete = db.prepare("DELETE FROM vocabulary WHERE LOWER(word) = LOWER(?)");
    stmtDelete.run(targetWord);

    const rows = db.prepare("SELECT * FROM vocabulary").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete vocabulary word", details: err.message });
  }
});

// 3. Streaks API Routes (SQLite)
app.get("/api/streaks", (req: Request, res: Response) => {
  try {
    const rows = db.prepare("SELECT date FROM streaks ORDER BY date ASC").all() as { date: string }[];
    res.json(rows.map(r => r.date));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read streak data", details: err.message });
  }
});

app.post("/api/streaks", (req: Request, res: Response) => {
  try {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    const todayStr = localDate.toISOString().split("T")[0];

    const stmtInsert = db.prepare("INSERT OR IGNORE INTO streaks (date) VALUES (?)");
    stmtInsert.run(todayStr);

    const rows = db.prepare("SELECT date FROM streaks ORDER BY date ASC").all() as { date: string }[];
    res.json(rows.map(r => r.date));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save streak date", details: err.message });
  }
});

// 4. Dynamic Lessons Playlist Routes (SQLite)
app.get("/api/lessons", (req: Request, res: Response) => {
  try {
    const rows = db.prepare("SELECT * FROM lessons").all() as any[];
    const parsed = rows.map(row => ({
      ...row,
      isInitialized: row.isInitialized === 1,
      vocab: JSON.parse(row.vocab || "[]"),
      lines: JSON.parse(row.lines || "[]"),
      gameStartWords: JSON.parse(row.gameStartWords || "[]")
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read lessons data", details: err.message });
  }
});

app.post("/api/lessons/:id/initialize", rateLimiter(5, 60000), async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.id;
    const stmtFind = db.prepare("SELECT * FROM lessons WHERE id = ?");
    const lessonRow: any = stmtFind.get(lessonId);
    if (!lessonRow) {
      res.status(404).json({ error: "Lesson not found." });
      return;
    }
    const lesson = {
      ...lessonRow,
      isInitialized: lessonRow.isInitialized === 1,
      vocab: JSON.parse(lessonRow.vocab || "[]"),
      lines: JSON.parse(lessonRow.lines || "[]"),
      gameStartWords: JSON.parse(lessonRow.gameStartWords || "[]")
    };

    // 1. Fetch transcript lines directly from YouTube video
    console.log(`[Bloom Server] Fetching subtitles for video: ${lesson.videoId}...`);
    const rawLines = await getYoutubeTranscript(lesson.videoId);

    if (rawLines.length === 0) {
      throw new Error("No caption lines parsed from video.");
    }

    console.log(`[Bloom Server] Reconstructing transcript lines into complete sentences...`);
    const transcriptLines = await reconstructTranscriptIntoSentences(rawLines);

    // 2. Call extractVocabFromLesson from coach.ts
    const clientModel = req.body?.model || OPENROUTER_MODEL || "qwen/qwen3-next-80b-a3b-instruct";
    console.log(`[Bloom Server] Asking extractVocabFromLesson to extract vocabulary...`);

    const videoLessonData = {
      youtubeUrl: `https://www.youtube.com/watch?v=${lesson.videoId}`,
      videoId: lesson.videoId,
      rawTranscript: transcriptLines.map(l => l.text).join(" "),
      transcript: transcriptLines.map(l => ({ text: l.text, offset: l.start ?? 0, duration: l.end !== undefined && l.start !== undefined ? l.end - l.start : 0 })),
      fetchedAt: new Date()
    };

    let vocab: any[] = [];
    let theme = "Conversation";
    let gameStartWords: string[] = [];

    try {
      const extraction = await extractVocabFromLesson(videoLessonData);
      vocab = extraction.vocab || [];
      theme = extraction.topic || "Conversation";
      gameStartWords = extraction.keyPhrases || [];
    } catch (apiErr: any) {
      console.error("extractVocabFromLesson failed, using defaults:", apiErr);
      vocab = [
        { word: "fluent", ipa: "/ˈfluːənt/", partOfSpeech: "adjective", definition: "able to speak or write easily and accurately", example: "He is fluent in English." }
      ];
      theme = "Speaking Practice";
      gameStartWords = ["fluent", "speaking", "practice", "conversation", "language"];
    }

    // 3. Update lesson in SQLite database
    const stmtUpdate = db.prepare(`
      UPDATE lessons
      SET isInitialized = 1, vocab = ?, lines = ?, theme = ?, gameStartWords = ?
      WHERE id = ?
    `);
    stmtUpdate.run(
      JSON.stringify(vocab),
      JSON.stringify(transcriptLines),
      theme,
      JSON.stringify(gameStartWords),
      lessonId
    );

    // Fetch updated lesson from DB
    const stmtSelect = db.prepare("SELECT * FROM lessons WHERE id = ?");
    const updatedLessonRow: any = stmtSelect.get(lessonId);
    const updatedLesson = {
      ...updatedLessonRow,
      isInitialized: updatedLessonRow.isInitialized === 1,
      vocab: JSON.parse(updatedLessonRow.vocab || "[]"),
      lines: JSON.parse(updatedLessonRow.lines || "[]"),
      gameStartWords: JSON.parse(updatedLessonRow.gameStartWords || "[]")
    };

    console.log(`[Bloom Server] Lesson ${lessonId} initialized successfully in SQLite with theme "${theme}", ${vocab.length} words and ${transcriptLines.length} lines.`);
    res.json(updatedLesson);
  } catch (err: any) {
    console.error(`Failed to initialize lesson:`, err);
    res.status(500).json({ error: "Failed to initialize lesson captions & vocabulary", details: err.message });
  }
});

// 5. User Progress Daily Progression API Routes (SQLite)
app.get("/api/progress", (req: Request, res: Response) => {
  try {
    res.json(getProgress());
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read progress data", details: err.message });
  }
});

app.post("/api/progress/task", (req: Request, res: Response) => {
  try {
    const { taskName, completed } = req.body;
    if (!taskName || typeof completed !== "boolean") {
      res.status(400).json({ error: "Invalid task parameter payload" });
      return;
    }

    const progress = getProgress();

    if (progress.todayTasks.hasOwnProperty(taskName)) {
      progress.todayTasks[taskName] = completed;
      saveProgress(progress);
    }

    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update progress task", details: err.message });
  }
});

app.post("/api/progress/next-day", (req: Request, res: Response) => {
  try {
    const progress = getProgress();

    const tasks = progress.todayTasks;
    const allCompleted = tasks.listen && tasks.shadow && tasks.speak && tasks.game;

    if (allCompleted) {
      const finishedDay = progress.currentDay;
      progress.completedDays[finishedDay] = { ...tasks };
      progress.currentDay = finishedDay + 1;
      progress.todayTasks = {
        listen: false,
        shadow: false,
        speak: false,
        game: false
      };

      // Record streak date for today
      const d = new Date();
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - offset * 60 * 1000);
      const todayStr = localDate.toISOString().split("T")[0];

      try {
        const stmtInsert = db.prepare("INSERT OR IGNORE INTO streaks (date) VALUES (?)");
        stmtInsert.run(todayStr);
      } catch (streakErr) {
        console.error("Failed to automatically record streak on day complete:", streakErr);
      }

      saveProgress(progress);
    }

    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to proceed to next day", details: err.message });
  }
});

app.post("/api/progress/reset", rateLimiter(3, 60000), (req: Request, res: Response) => {
  try {
    // Require explicit confirmation token to prevent accidental/malicious resets
    if (req.body?.confirm !== true) {
      res.status(400).json({ error: "Missing confirm token. Send { confirm: true } to reset progress." });
      return;
    }
    const defaultProg = {
      currentDay: 1,
      completedDays: {},
      todayTasks: {
        listen: false,
        shadow: false,
        speak: false,
        game: false
      }
    };
    saveProgress(defaultProg);
    res.json(defaultProg);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reset progress", details: err.message });
  }
});

app.post("/api/games/validate", async (req: Request, res: Response) => {
  try {
    const { gameType, trunk, previousWord, word, model, lessonContext } = req.body;
    if (!gameType || !word) {
      res.status(400).json({ error: "Missing gameType or word parameter" });
      return;
    }

    const clientModel = model || "llama3";
    let systemPrompt = "";

    // Extract lesson context if available
    const theme = lessonContext?.theme || "General Conversation";
    let relatedVocab = lessonContext?.relatedVocab || [];

    // OPTIMIZATION #3: Enhance with user's vocabulary from SQLite
    // Prioritize today's vocab and recent vocab for personalized learning
    const todaysVocab = getTodaysVocabulary();
    const recentVocab = getRecentVocabulary(7);

    // Combine lesson vocab with user's personal vocab (prioritize user's new words)
    if (todaysVocab.length > 0) {
      const userWords = todaysVocab.map(v => v.word);
      relatedVocab = [...new Set([...relatedVocab, ...userWords])];
    } else if (recentVocab.length > 0) {
      const userWords = recentVocab.map(v => v.word);
      relatedVocab = [...new Set([...relatedVocab, ...userWords])];
    }

    const vocabListStr = relatedVocab.length > 0 ? relatedVocab.join(", ") : "none provided";

    if (gameType === "tree") {
      if (!trunk) {
        res.status(400).json({ error: "Missing trunk word parameter for Word Tree validation" });
        return;
      }

      // Context-Enhanced Prompt with Few-Shot and Chain-of-Thought
      systemPrompt = `You are a semantic validator for an English learning game called "Word Tree".

LESSON CONTEXT:
- Theme: ${theme}
- Related vocabulary in this lesson: ${vocabListStr}
- Central word (trunk): "${trunk}"

TASK:
Determine if the English word "${word}" is directly or indirectly related to the central word "${trunk}" within the context of this lesson.

REASONING STEPS (Chain-of-Thought):
1. Identify the semantic space or activity domain of "${trunk}".
2. Check if "${word}" exists in, serves, or is commonly associated with that domain.
3. Consider if "${word}" appears in the lesson vocabulary list (strong signal).
4. Decide: Is this a reasonable connection for an English learner?

FEW-SHOT EXAMPLES:
- Trunk: "Haircut" → Input: "clipper" → VALID (tool used in haircut)
- Trunk: "Haircut" → Input: "barber" → VALID (person who does haircut)
- Trunk: "Book" → Input: "page" → VALID (part of a book)
- Trunk: "Book" → Input: "library" → VALID (place related to books)
- Trunk: "Time" → Input: "clock" → VALID (device showing time)
- Trunk: "Time" → Input: "schedule" → VALID (concept related to time)

RULES:
- Be lenient for thematic or indirect connections (learners think creatively).
- Accept tools, places, people, actions, or concepts related to the trunk.
- Reject completely unrelated words (e.g., "banana" for "Haircut").

RESPONSE FORMAT:
Respond ONLY with a raw JSON object (no markdown, no explanation outside JSON):
{
  "valid": true/false,
  "explanation": "a short 1-sentence explanation referencing the connection"
}`;
    } else if (gameType === "association") {
      if (!previousWord) {
        res.status(400).json({ error: "Missing previousWord parameter for Word Association validation" });
        return;
      }

      // Context-Enhanced Prompt for Association Game
      systemPrompt = `You are a semantic validator for an English learning game called "Word Association".

LESSON CONTEXT:
- Theme: ${theme}
- Related vocabulary in this lesson: ${vocabListStr}

TASK:
Determine if "${word}" is a valid, logical next link from "${previousWord}". The connection can be:
- Descriptive (adjective/noun modifying previous)
- Thematic (same topic/domain)
- Functional (cause-effect, tool-purpose)
- Common phrase/collocation

REASONING STEPS (Chain-of-Thought):
1. What is the meaning/domain of "${previousWord}"?
2. Does "${word}" logically follow or connect to it?
3. Is this a common association native speakers would make?
4. Does "${word}" appear in the lesson vocabulary (boosts validity)?

FEW-SHOT EXAMPLES:
- "Traffic light" → "red" → VALID (color of traffic light)
- "Red" → "stop" → VALID (red means stop)
- "Stop" → "police" → VALID (police stop you)
- "Police" → "car" → VALID (police car)
- "Haircut" → "scissors" → VALID (tool for haircut)
- "Scissors" → "cut" → VALID (action with scissors)
- "Cut" → "hair" → VALID (what gets cut)

RULES:
- Accept creative but reasonable associations.
- Reject random/unrelated jumps (e.g., "apple" → "airplane").

RESPONSE FORMAT:
Respond ONLY with a raw JSON object (no markdown, no explanation outside JSON):
{
  "valid": true/false,
  "explanation": "a short 1-sentence explanation of the association link"
}`;
    } else {
      res.status(400).json({ error: "Invalid gameType. Must be 'tree' or 'association'" });
      return;
    }

    // Embedding service bypassed as OpenRouter only handles text completions
    let embeddingValid: boolean | null = null;

    // Call OpenRouter for LLM-based validation
    try {
      const responseText = await callOpenRouter([
        { role: "system", content: systemPrompt },
        { role: "user", content: `Validate: "${word}"` }
      ], 0.2, 500, clientModel);

      let content = responseText.trim();

      // Extract JSON
      const jsonStart = content.indexOf("{");
      const jsonEnd = content.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        content = content.substring(jsonStart, jsonEnd + 1);
        const result = JSON.parse(content);

        // Add embedding score if available
        if (embeddingValid !== null) {
          result.similarityScore = embeddingValid;
        }

        res.json(result);
        return;
      }
      throw new Error("Failed to get valid JSON response from OpenRouter");
    } catch (apiErr) {
      console.warn("OpenRouter validation failed, using fallback heuristic:", apiErr);
      const referenceWord = gameType === "tree" ? trunk : previousWord;
      res.json({
        valid: true,
        explanation: `Accepted (AI offline fallback). Connection between "${word}" and "${referenceWord}" is plausible.`,
        fallback: true
      });
    }
  } catch (err: any) {
    console.error("Failed to validate game word:", err);
    res.status(500).json({ error: "Failed to validate game word", details: err.message });
  }
});

// NEW API: Get user's vocabulary for games
app.get("/api/games/vocabulary", (req: Request, res: Response) => {
  try {
    const { days } = req.query;
    const daysNum = days ? parseInt(days as string) : 7;

    const todaysVocab = getTodaysVocabulary();
    const recentVocab = getRecentVocabulary(daysNum);

    res.json({
      today: todaysVocab,
      recent: recentVocab,
      total: new Set([...todaysVocab.map(v => v.word), ...recentVocab.map(v => v.word)]).size
    });
  } catch (err: any) {
    console.error("Failed to fetch game vocabulary:", err);
    res.status(500).json({ error: "Failed to fetch vocabulary", details: err.message });
  }
});

// NEW API: Get user's game stats (streak, achievements)
app.get("/api/games/stats", (req: Request, res: Response) => {
  try {
    const streak = getGameStreak();
    const achievements = getUserAchievements();

    res.json({
      streak: streak.count,
      lastPlayed: streak.lastPlayed,
      achievements,
      totalAchievements: achievements.length
    });
  } catch (err: any) {
    console.error("Failed to fetch game stats:", err);
    res.status(500).json({ error: "Failed to fetch stats", details: err.message });
  }
});

// NEW API: Update game streak and add achievement
app.post("/api/games/streak", (req: Request, res: Response) => {
  try {
    const { achievement } = req.body;

    const updatedStreak = updateGameStreak();

    let newAchievements = [];
    if (achievement) {
      newAchievements = addAchievement(achievement);
    }

    res.json({
      streak: updatedStreak.count,
      lastPlayed: updatedStreak.lastPlayed,
      achievements: newAchievements
    });
  } catch (err: any) {
    console.error("Failed to update game streak:", err);
    res.status(500).json({ error: "Failed to update streak", details: err.message });
  }
});

// NEW API: Save word tree state to SQLite
app.post("/api/games/tree/save", (req: Request, res: Response) => {
  try {
    const { trunk, branches } = req.body;

    if (!trunk || !branches) {
      return res.status(400).json({ error: "Missing trunk or branches" });
    }

    const stmt = db.prepare("INSERT OR REPLACE INTO progress (key, value) VALUES (?, ?)");
    stmt.run(`tree_${trunk}`, JSON.stringify({ trunk, branches, savedAt: new Date().toISOString() }));

    res.json({ success: true, message: "Tree saved successfully" });
  } catch (err: any) {
    console.error("Failed to save tree:", err);
    res.status(500).json({ error: "Failed to save tree", details: err.message });
  }
});

// NEW API: Load word tree state from SQLite
app.get("/api/games/tree/load/:trunk", (req: Request, res: Response) => {
  try {
    const { trunk } = req.params;

    const stmt = db.prepare("SELECT value FROM progress WHERE key = ?");
    const row = stmt.get(`tree_${trunk}`) as { value: string } | undefined;

    if (!row) {
      return res.json({ trunk, branches: [] });
    }

    const data = JSON.parse(row.value);
    res.json(data);
  } catch (err: any) {
    console.error("Failed to load tree:", err);
    res.status(500).json({ error: "Failed to load tree", details: err.message });
  }
});

// NEW API: Get chat history for a specific lesson and day
app.get("/api/chat-history", (req: Request, res: Response) => {
  try {
    const { lessonId, day } = req.query;
    
    if (!lessonId || !day) {
      return res.status(400).json({ error: "Missing lessonId or day parameter" });
    }

    // Create a composite key for this lesson+day combination
    const historyKey = `chat_${lessonId}_${day}`;
    
    const stmt = db.prepare("SELECT value FROM progress WHERE key = ?");
    const row = stmt.get(historyKey) as { value: string } | undefined;

    if (!row) {
      return res.json([]);
    }

    const messages = JSON.parse(row.value);
    res.json(messages);
  } catch (err: any) {
    console.error("Failed to load chat history:", err);
    res.status(500).json({ error: "Failed to load chat history", details: err.message });
  }
});

// NEW API: Save chat history for a specific lesson and day
app.post("/api/chat-history", (req: Request, res: Response) => {
  try {
    const { lessonId, day, messages } = req.body;
    
    if (!lessonId || !day || !messages) {
      return res.status(400).json({ error: "Missing lessonId, day, or messages" });
    }

    // Create a composite key for this lesson+day combination
    const historyKey = `chat_${lessonId}_${day}`;
    
    const stmt = db.prepare("INSERT OR REPLACE INTO progress (key, value) VALUES (?, ?)");
    stmt.run(historyKey, JSON.stringify(messages));

    res.json({ success: true, message: "Chat history saved successfully" });
  } catch (err: any) {
    console.error("Failed to save chat history:", err);
    res.status(500).json({ error: "Failed to save chat history", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Bloom Server] Backend initialized and running on http://localhost:${PORT}`);
});