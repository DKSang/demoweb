import dotenv from "dotenv";
dotenv.config();
import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFreeLLMAPIKey(): string {
  const dbPath = path.resolve(__dirname, "../../freellmapi/server/data/freeapi.db");
  if (fs.existsSync(dbPath)) {
    const db = new DatabaseSync(dbPath);
    const row = db.prepare("SELECT value FROM settings WHERE key = 'unified_api_key'").get() as { value: string } | undefined;
    return row?.value || "";
  }
  return "";
}

async function run() {
  const key = getFreeLLMAPIKey();
  console.log("Retrieved FreeLLMAPI Key:", key);
  
  const body = {
    model: "qwen/qwen-2.5-72b-instruct",
    messages: [{ role: "user", content: "hello" }],
    response_format: { type: "json_object" }
  };
  
  try {
    const res = await fetch("http://localhost:4000/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify(body)
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err: any) {
    console.error("Fetch Error:", err);
  }
}

run();
