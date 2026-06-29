import { VideoLesson, TranscriptSegment } from "./types.js";

// ─── YouTube URL Parser ───────────────────────────────────────────────────────

export function extractVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // bare ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  throw new Error(`Cannot extract video ID from: ${url}`);
}

// ─── Transcript Fetcher ───────────────────────────────────────────────────────

export async function fetchTranscript(youtubeUrl: string): Promise<VideoLesson> {
  const videoId = extractVideoId(youtubeUrl);

  // Dynamically import so the harness file is testable without the package
  let YoutubeTranscript: {
    fetchTranscript: (id: string) => Promise<TranscriptSegment[]>;
  };

  try {
    // youtube-transcript package exports differently based on version
    const mod = await import("youtube-transcript");
    YoutubeTranscript = (mod as any).YoutubeTranscript ?? (mod as any).default ?? mod;
  } catch {
    throw new Error(
      "youtube-transcript package not found. Run: npm install youtube-transcript"
    );
  }

  let segments: TranscriptSegment[];

  try {
    const raw = await YoutubeTranscript.fetchTranscript(videoId);

    // Normalise to our TranscriptSegment shape
    segments = raw.map((s: any) => ({
      text: s.text?.trim() ?? "",
      offset: s.offset ?? s.start ?? 0,
      duration: s.duration ?? 0,
    }));
  } catch (err: any) {
    if (err?.message?.includes("Transcript is disabled")) {
      throw new Error(
        `Transcripts are disabled for video ${videoId}. Try a different video.`
      );
    }
    if (err?.message?.includes("Could not find")) {
      throw new Error(
        `No transcript available for video ${videoId} (no captions found).`
      );
    }
    throw err;
  }

  const rawTranscript = segments.map((s) => s.text).join(" ");

  if (rawTranscript.trim().length < 100) {
    throw new Error(
      `Transcript for ${videoId} is too short (${rawTranscript.length} chars). May be music-only or auto-captions failed.`
    );
  }

  return {
    youtubeUrl,
    videoId,
    transcript: segments,
    rawTranscript,
    fetchedAt: new Date(),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a snippet of the transcript around a given time offset (ms).
 * Useful for giving the AI context without sending the full transcript.
 */
export function getTranscriptWindow(
  lesson: VideoLesson,
  offsetMs: number,
  windowMs = 30_000
): string {
  return lesson.transcript
    .filter(
      (s) =>
        s.offset >= offsetMs - windowMs / 2 &&
        s.offset <= offsetMs + windowMs / 2
    )
    .map((s) => s.text)
    .join(" ");
}

/**
 * Splits the full transcript into ~N equal chunks for chunked processing.
 */
export function chunkTranscript(lesson: VideoLesson, chunkCount = 5): string[] {
  const texts = lesson.transcript.map((s) => s.text);
  const chunkSize = Math.ceil(texts.length / chunkCount);
  const chunks: string[] = [];
  for (let i = 0; i < texts.length; i += chunkSize) {
    chunks.push(texts.slice(i, i + chunkSize).join(" "));
  }
  return chunks;
}
