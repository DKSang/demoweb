import { YoutubeTranscript } from 'youtube-transcript';

const OLLAMA_URL = "http://127.0.0.1:11434";

async function reconstructTranscriptIntoSentences(transcriptLines) {
  const batchSize = 15;
  const reconstructed = [];
  
  for (let i = 0; i < transcriptLines.length; i += batchSize) {
    const batch = transcriptLines.slice(i, i + batchSize);
    const systemPrompt = `You are a professional subtitle editor. Take this array of raw transcript segments with start and end times, and merge them into complete, grammatically correct English sentences. 
    Add proper capitalization and punctuation. Keep the timestamps (start, end) aligned with the flow of the sentences.
    
    Output the result EXACTLY as a JSON array of objects matching this TypeScript interface:
    interface TimedLine {
      start: number;
      end: number;
      text: string;
    }
    
    Do NOT wrap in markdown blocks like \`\`\`json. Return only the raw JSON array.
    
    Segments to process:
    ${JSON.stringify(batch)}`;

    try {
      console.log(`Sending batch ${i} to Ollama...`);
      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3",
          messages: [{ role: "system", content: systemPrompt }],
          stream: false,
          options: { temperature: 0.1 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.message?.content || "[]";
        console.log("Ollama Raw Content for batch " + i + ":", content);
        content = content.trim();
        const startIndex = content.indexOf("[");
        const endIndex = content.lastIndexOf("]");
        if (startIndex !== -1 && endIndex !== -1) {
          content = content.substring(startIndex, endIndex + 1);
        }
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          reconstructed.push(...parsed);
        } else {
          reconstructed.push(...batch);
        }
      } else {
        console.log("Ollama Response Not OK:", response.status, await response.text());
        reconstructed.push(...batch);
      }
    } catch (err) {
      console.error("[Bloom Server] Batch reconstruction error, fallback to raw:", err);
      reconstructed.push(...batch);
    }
  }

  // Smooth end boundaries to prevent overlaps
  for (let i = 0; i < reconstructed.length - 1; i++) {
    reconstructed[i].end = reconstructed[i + 1].start;
  }
  return reconstructed;
}

async function run() {
  const t = await YoutubeTranscript.fetchTranscript('RJbUtcaoNCY');
  const lines = t.map(x => ({
    start: Math.round(x.offset / 1000),
    end: Math.round((x.offset + x.duration) / 1000),
    text: x.text
  }));
  const res = await reconstructTranscriptIntoSentences(lines.slice(0, 15));
  console.log("Reconstructed:", JSON.stringify(res, null, 2));
}
run();
