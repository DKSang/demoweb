import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const initializeFile = (filePath: string, defaultContent: string) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultContent, "utf-8");
  }
};

initializeFile(VOCAB_FILE, "[]");
initializeFile(STREAKS_FILE, "[]");
initializeFile(HISTORY_FILE, "[]");

app.use(express.json());

// Root & Health check routes
app.get("/", (req: Request, res: Response) => {
  res.send("<h1>Bloom Backend Gateway is Running</h1><p>Navigate to http://localhost:3000 to use the web application.</p>");
});

app.get("/api", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Bloom API is online" });
});

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

    // Log chat history to data/chat_history.json
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

    // Case-insensitive de-duplication check
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

app.listen(PORT, () => {
  console.log(`[Bloom Server] Backend initialized and running on http://localhost:${PORT}`);
});
