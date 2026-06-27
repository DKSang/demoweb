import express, { Request, Response } from "express";
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
  {
    id: "BCDXweG6CLc",
    title: "British Time Expressions You Need Every Day ⏰",
    videoId: "BCDXweG6CLc",
    isInitialized: true,
    vocab: [
      { word: "crack on", ipa: "/kræk ɒn/", definition: "to start or continue doing something quickly and with energy", example: "Let's crack on with the lesson." },
      { word: "stupid o'clock", ipa: "/ˈstjuːpɪd əˈklɒk/", definition: "an unreasonably early or late hour of the day", example: "I woke up at stupid o'clock this morning." },
      { word: "yonks", ipa: "/jɒŋks/", definition: "a very long time", example: "I haven't seen you in yonks!" },
      { word: "faff", ipa: "/fæf/", definition: "to spend time doing things that are not important without achieving much", example: "Stop faffing around and get ready." },
      { word: "now and then", ipa: "/naʊ ænd ðen/", definition: "occasionally; from time to time", example: "We go out for dinner now and then." },
      { word: "getting on for", ipa: "/ˈɡetɪŋ ɒn fɔːr/", definition: "approaching a certain age, time, or number", example: "It is getting on for midnight." }
    ],
    lines: [
      { start: 0, end: 5, text: "Hello everyone and welcome back to Sprout English." },
      { start: 6, end: 12, text: "Today we are looking at British time expressions that you will hear every day." },
      { start: 13, end: 18, text: "Let's crack on with the first phrase before we run out of time." },
      { start: 19, end: 25, text: "I had to wake up at stupid o'clock this morning to catch my train." },
      { start: 26, end: 32, text: "Honestly, I haven't been to this part of the city in absolute yonks." },
      { start: 33, end: 39, text: "If you stop faffing around, we might actually finish this work early." },
      { start: 40, end: 46, text: "We go down to the local pub now and then just to catch up." },
      { start: 47, end: 53, text: "Look at the clock, it is getting on for ten already, we should go." }
    ]
  },
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

app.use(express.json());

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

// 1. Ollama Chat Gateway Proxy Route
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { model, messages, options } = req.body;

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "llama3",
        messages: messages || [],
        stream: false,
        options: options || {}
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ error: `Ollama error: ${errorText}` });
      return;
    }

    const data = await response.json();

    // Log chat history
    try {
      const historyRaw = fs.readFileSync(HISTORY_FILE, "utf-8");
      const history = JSON.parse(historyRaw);
      history.push({
        timestamp: new Date().toISOString(),
        messages: messages,
        assistantResponse: data.message
      });
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
    } catch (logErr) {
      console.error("Failed to log chat history:", logErr);
    }

    res.json(data);
  } catch (err: any) {
    console.error("Server API Chat Error:", err);
    res.status(500).json({ error: "Failed to communicate with Ollama", details: err.message });
  }
});

// 2. Vocabulary API Routes
app.get("/api/vocabulary", (req: Request, res: Response) => {
  try {
    const data = fs.readFileSync(VOCAB_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read vocabulary data", details: err.message });
  }
});

app.post("/api/vocabulary", (req: Request, res: Response) => {
  try {
    const newWord = req.body;
    if (!newWord || !newWord.word) {
      res.status(400).json({ error: "Word object with word property is required" });
      return;
    }

    const dataRaw = fs.readFileSync(VOCAB_FILE, "utf-8");
    const vocab = JSON.parse(dataRaw);

    const exists = vocab.some((w: any) => w.word.toLowerCase() === newWord.word.toLowerCase());
    if (!exists) {
      vocab.push({
        ...newWord,
        dateSaved: newWord.dateSaved || new Date().toLocaleDateString()
      });
      fs.writeFileSync(VOCAB_FILE, JSON.stringify(vocab, null, 2), "utf-8");
    }

    res.json(vocab);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save vocabulary word", details: err.message });
  }
});

app.delete("/api/vocabulary/:word", (req: Request, res: Response) => {
  try {
    const targetWord = req.params.word.toLowerCase();
    const dataRaw = fs.readFileSync(VOCAB_FILE, "utf-8");
    const vocab = JSON.parse(dataRaw);

    const filtered = vocab.filter((w: any) => w.word.toLowerCase() !== targetWord);
    fs.writeFileSync(VOCAB_FILE, JSON.stringify(filtered, null, 2), "utf-8");

    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete vocabulary word", details: err.message });
  }
});

// 3. Streaks API Routes
app.get("/api/streaks", (req: Request, res: Response) => {
  try {
    const data = fs.readFileSync(STREAKS_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read streak data", details: err.message });
  }
});

app.post("/api/streaks", (req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const dataRaw = fs.readFileSync(STREAKS_FILE, "utf-8");
    const streaks = JSON.parse(dataRaw);

    if (!streaks.includes(todayStr)) {
      streaks.push(todayStr);
      fs.writeFileSync(STREAKS_FILE, JSON.stringify(streaks, null, 2), "utf-8");
    }

    res.json(streaks);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save streak date", details: err.message });
  }
});

// 4. Dynamic Lessons Playlist Routes
app.get("/api/lessons", (req: Request, res: Response) => {
  try {
    const data = fs.readFileSync(LESSONS_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read lessons data", details: err.message });
  }
});

app.post("/api/lessons/:id/initialize", async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.id;
    const lessonsRaw = fs.readFileSync(LESSONS_FILE, "utf-8");
    const lessons = JSON.parse(lessonsRaw);
    
    const lessonIndex = lessons.findIndex((l: any) => l.id === lessonId);
    if (lessonIndex === -1) {
      res.status(404).json({ error: "Lesson not found." });
      return;
    }
    
    const lesson = lessons[lessonIndex];
    
    // 1. Fetch transcript lines directly from YouTube video
    console.log(`[Bloom Server] Fetching subtitles for video: ${lesson.videoId}...`);
    const transcriptLines = await getYoutubeTranscript(lesson.videoId);
    
    if (transcriptLines.length === 0) {
      throw new Error("No caption lines parsed from video.");
    }
    
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

    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        messages: [{ role: "system", content: systemPrompt }],
        stream: false,
        options: { temperature: 0.3 }
      })
    });

    let vocab: any[] = [];
    if (ollamaResponse.ok) {
      const ollamaData = await ollamaResponse.json();
      let responseText = ollamaData.message?.content || "[]";
      
      // Sanitization: Remove any markdown backticks wrapper if Llama-3 outputs it
      responseText = responseText.trim();
      if (responseText.startsWith("```")) {
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          responseText = jsonMatch[1];
        }
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
    fs.writeFileSync(LESSONS_FILE, JSON.stringify(lessons, null, 2), "utf-8");
    console.log(`[Bloom Server] Lesson ${lessonId} initialized successfully with ${vocab.length} words and ${transcriptLines.length} lines.`);
    
    res.json(lesson);
  } catch (err: any) {
    console.error(`Failed to initialize lesson:`, err);
    res.status(500).json({ error: "Failed to initialize lesson captions & vocabulary", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Bloom Server] Backend initialized and running on http://localhost:${PORT}`);
});
