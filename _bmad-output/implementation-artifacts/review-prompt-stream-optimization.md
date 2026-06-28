# Blind Hunter Code Review Prompt: AI Coach Real-time Streaming & Optimization

You are the **Blind Hunter** reviewer. Your job is to review the code changes below for code quality, syntax, logic errors, potential bugs, and architectural compliance. You receive ONLY this diff.

## Code Diff

```diff
diff --git a/src/components/AISpeakingLab.tsx b/src/components/AISpeakingLab.tsx
index 650d04a..1cfa091 100644
--- a/src/components/AISpeakingLab.tsx
+++ b/src/components/AISpeakingLab.tsx
@@ -852,6 +856,15 @@ Return the result EXACTLY in the following JSON format, and nothing else (do not
     setChatHistory(updatedHistory);
     setIsLlamaLoading(true);
 
+    const botId = `bot-${Date.now()}`;
+    const placeholderMsg: ChatMessage = {
+      id: botId,
+      role: "assistant",
+      content: ""
+    };
+    setChatHistory(prev => [...prev, placeholderMsg]);
+    setIsLlamaLoading(false); // set to false because stream displays immediately
+
     try {
       // Map history to Ollama parameters
       const systemPrompt = getSystemPrompt(currentWeek);
@@ -864,12 +877,12 @@ Return the result EXACTLY in the following JSON format, and nothing else (do not
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
-          model: "llama3",
+          model: ollamaModel,
           messages: ollamaMessages,
-          stream: false,
+          stream: true,
           options: {
             temperature: 0.7,
-            num_predict: 80, // limit to 80 tokens to speed up local Ollama response
+            num_predict: 60, // limit to 60 tokens to speed up local Ollama response
             num_ctx: 2048   // reduce context memory window size for faster inference
           }
         })
@@ -879,20 +892,48 @@ Return the result EXACTLY in the following JSON format, and nothing else (do not
         throw new Error("Local Ollama connection failed.");
       }
 
-      const data = await response.json();
-      const botResponse = data.message?.content || "";
+      const reader = response.body?.getReader();
+      if (!reader) throw new Error("Stream reader not available");
+
+      const decoder = new TextDecoder();
+      let done = false;
+      let accumulatedContent = "";
+
+      while (!done) {
+        const { value, done: doneReading } = await reader.read();
+        done = doneReading;
+        if (value) {
+          const chunkStr = decoder.decode(value, { stream: true });
+          const lines = chunkStr.split("\n").filter(l => l.trim() !== "");
+          for (const line of lines) {
+            try {
+              const parsed = JSON.parse(line);
+              if (parsed.message?.content) {
+                accumulatedContent += parsed.message.content;
+                setChatHistory(prev =>
+                  prev.map(msg =>
+                    msg.id === botId
+                      ? { ...msg, content: accumulatedContent }
+                      : msg
+                  )
+                );
+              }
+            } catch (e) {
+              // Ignore partial/non-JSON lines
+            }
+          }
+        }
+      }
 
-      // Parse grammar correction if in Week 3/4
-      let cleanText = botResponse;
+      // Stream is complete! Parse grammar correction and speak.
+      let cleanText = accumulatedContent;
       let correctionData = undefined;
 
-      // Extract simple correction tags [Correction] ...
-      if (currentWeek >= 3 && botResponse.toLowerCase().includes("[correction]")) {
-        const parts = botResponse.split(/\[correction\]/i);
+      if (currentWeek >= 3 && accumulatedContent.toLowerCase().includes("[correction]")) {
+        const parts = accumulatedContent.split(/\[correction\]/i);
         cleanText = parts[0].trim();
         const correctionBlock = parts[1]?.trim() || "";
 
-        // Attempt basic parse of the correction text
         correctionData = {
           original: textToSend,
           corrected: correctionBlock.split("\n")[0] || "",
@@ -900,26 +941,29 @@ Return the result EXACTLY in the following JSON format, and nothing else (do not
         };
       }
 
-      const assistantMsg: ChatMessage = {
-        id: `bot-${Date.now()}`,
-        role: "assistant",
-        content: cleanText,
-        correction: correctionData
-      };
+      setChatHistory(prev =>
+        prev.map(msg =>
+          msg.id === botId
+            ? { ...msg, content: cleanText, correction: correctionData }
+            : msg
+        )
+      );
 
-      setChatHistory(prev => [...prev, assistantMsg]);
       speakAIResponse(cleanText);
       markDayPracticed();
     } catch (err) {
       console.error(err);
-      setChatHistory(prev => [
-        ...prev,
-        {
-          id: `error-${Date.now()}`,
-          role: "assistant",
-          content: "Oops! I could not connect to your local Ollama. Please make sure Ollama is running (`ollama run llama3`) on port 11434, and that the Vite proxy is active."
-        }
-      ]);
+      setChatHistory(prev =>
+        prev.map(msg =>
+          msg.id === botId
+            ? {
+                id: `error-${Date.now()}`,
+                role: "assistant",
+                content: "Oops! I could not connect to your local Ollama. Please make sure Ollama is running (`ollama run llama3`) on port 11434, and that the Vite proxy is active."
+              }
+            : msg
+        )
+      );
     } finally {
       setIsLlamaLoading(false);
     }
diff --git a/src/server.ts b/src/server.ts
index 7926c30..b5b3d68 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -142,7 +142,7 @@ async function getYoutubeTranscript(videoId: string) {
 // 1. Ollama Chat Gateway Proxy Route
 app.post("/api/chat", async (req: Request, res: Response) => {
   try {
-    const { model, messages, options } = req.body;
+    const { model, messages, options, stream } = req.body;
 
     const response = await fetch(`${OLLAMA_URL}/api/chat`, {
       method: "POST",
@@ -150,7 +150,7 @@ app.post("/api/chat", async (req: Request, res: Response) => {
       body: JSON.stringify({
         model: model || "llama3",
         messages: messages || [],
-        stream: false,
+        stream: stream === true,
         options: options || {}
       })
     });
@@ -161,6 +161,31 @@ app.post("/api/chat", async (req: Request, res: Response) => {
       return;
     }
 
+    if (stream) {
+      res.setHeader("Content-Type", "text/event-stream");
+      res.setHeader("Cache-Control", "no-cache");
+      res.setHeader("Connection", "keep-alive");
+
+      const bodyStream = response.body;
+      if (!bodyStream) {
+        res.status(500).json({ error: "Ollama returned an empty response body stream" });
+        return;
+      }
+
+      // @ts-ignore
+      const reader = bodyStream.getReader();
+      let done = false;
+      while (!done) {
+        const { value, done: doneReading } = await reader.read();
+        done = doneReading;
+        if (value) {
+          res.write(value);
+        }
+      }
+      res.end();
+      return;
+    }
+
     const data = await response.json();
 
     // Log chat history
```

Please evaluate this diff and report back any potential bugs, logic gaps, or code improvements.
