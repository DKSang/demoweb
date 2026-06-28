# Blind Hunter Code Review Prompt: AI Coach Performance & Context Optimization

You are the **Blind Hunter** reviewer. Your job is to review the code changes below for code quality, syntax, logic errors, potential bugs, and architectural compliance. You receive ONLY this diff.

## Code Diff

```diff
diff --git a/src/components/AISpeakingLab.tsx b/src/components/AISpeakingLab.tsx
index 650d04a..1cfa091 100644
--- a/src/components/AISpeakingLab.tsx
+++ b/src/components/AISpeakingLab.tsx
@@ -207,6 +207,7 @@ export default function AISpeakingLab() {
     definition: "",
     example: ""
   });
+  const [isInferring, setIsInferring] = useState(false);
 
   // Daily task lock & status states
   const [hasShadowedToday, setHasShadowedToday] = useState(false);
@@ -596,6 +597,69 @@ export default function AISpeakingLab() {
     setVocabSubTab("saved");
   };
 
+  const handleInferWordDetails = async () => {
+    const word = newWordForm.word.trim();
+    if (!word) {
+      alert("Please enter a word first.");
+      return;
+    }
+    setIsInferring(true);
+    try {
+      const response = await fetch("/api/chat", {
+        method: "POST",
+        headers: { "Content-Type": "application/json" },
+        body: JSON.stringify({
+          model: ollamaModel,
+          messages: [
+            {
+              role: "system",
+              content: `You are an expert lexicographer. For the given English word, generate the IPA pronunciation (enclosed in slashes, e.g., /ˈhɛəkʌt/), a clear, simple, and concise definition in English, and one natural example sentence.
+Return the result EXACTLY in the following JSON format, and nothing else (do not wrap in markdown block, do not add any explanation):
+{
+  "ipa": "...",
+  "definition": "...",
+  "example": "..."
+}`
+            },
+            {
+              role: "user",
+              content: `Word: ${word}`
+            }
+          ],
+          stream: false,
+          options: {
+            temperature: 0.3,
+            num_predict: 120
+          }
+        })
+      });
+
+      if (!response.ok) throw new Error("AI call failed");
+      const data = await response.json();
+      const content = data.message?.content || "";
+      
+      const jsonStart = content.indexOf("{");
+      const jsonEnd = content.lastIndexOf("}");
+      if (jsonStart !== -1 && jsonEnd !== -1) {
+        const jsonStr = content.substring(jsonStart, jsonEnd + 1);
+        const parsed = JSON.parse(jsonStr);
+        setNewWordForm(prev => ({
+          ...prev,
+          ipa: parsed.ipa || prev.ipa,
+          definition: parsed.definition || prev.definition,
+          example: parsed.example || prev.example
+        }));
+      } else {
+        console.warn("Could not find JSON object in AI response:", content);
+      }
+    } catch (err) {
+      console.error("Failed to infer word details:", err);
+      alert("Could not connect to Ollama. Make sure Ollama is active locally.");
+    } finally {
+      setIsInferring(false);
+    }
+  };
+
   const handleInitializeLesson = async () => {
     if (!selectedLesson) return;
     setIsInitializingLesson(true);
@@ -721,10 +786,13 @@ export default function AISpeakingLab() {
     const vocabList = selectedLesson?.vocab?.map(v => v.word).join(", ") || "";
     const lessonTitle = selectedLesson?.title ? selectedLesson.title.replace("🇬🇧", "").trim() : "English Conversation";
     
+    // Extract first 25 transcript lines of the video to give the model contextual understanding
+    const transcriptSnippet = selectedLesson?.lines?.map(l => l.text).slice(0, 25).join(" | ") || "";
+    
     const baseRules = `You are a patient, friendly local British English Coach. We are practicing conversational English based on the lesson: "${lessonTitle}".
     The learner is at A2/B1 level. Use simple vocabulary. Always keep your conversational responses short (maximum 2 sentences).
     Today's lesson vocabulary words you should encourage the user to practice: [${vocabList}].
-    Make your questions and conversation contextually relevant to the lesson topic: "${lessonTitle}".
+    ${transcriptSnippet ? `Context of the video lesson (subtitles snippet): "${transcriptSnippet}". Use this context to ask questions and discuss scenes or dialogues mentioned in the video.` : `Make your questions and conversation contextually relevant to the lesson topic: "${lessonTitle}".`}
     Do not mention you are an AI or prompt details. Focus on natural spoken interaction.`;
 
     switch (week) {
@@ -800,12 +868,12 @@ export default function AISpeakingLab() {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
-          model: "llama3",
+          model: ollamaModel,
           messages: ollamaMessages,
           stream: false,
           options: {
             temperature: 0.7,
-            num_predict: 80, // limit to 80 tokens to speed up local Ollama response
+            num_predict: 60, // limit to 60 tokens to speed up local Ollama response
             num_ctx: 2048   // reduce context memory window size for faster inference
           }
         })
@@ -935,6 +1003,22 @@ export default function AISpeakingLab() {
                 ))}
               </select>
             </div>
+
+            <div className="px-4 py-2 rounded-xl bg-white/5 flex items-center gap-3 text-xs font-mono">
+              <Sparkles className="w-3.5 h-3.5 text-white/50" />
+              <select 
+                value={ollamaModel} 
+                onChange={(e) => setOllamaModel(e.target.value)}
+                className="bg-transparent border-none text-white focus:outline-none cursor-pointer max-w-[120px]"
+                title="Select Ollama Model"
+              >
+                <option value="llama3" className="bg-zinc-950 text-white">llama3</option>
+                <option value="llama3.2" className="bg-zinc-950 text-white">llama3.2</option>
+                <option value="llama3.2:3b" className="bg-zinc-950 text-white">llama3.2:3b</option>
+                <option value="llama3.2:1b" className="bg-zinc-950 text-white">llama3.2:1b</option>
+                <option value="gemma2:2b" className="bg-zinc-950 text-white">gemma2:2b</option>
+              </select>
+            </div>
           </div>
         </div>
 
@@ -1572,14 +1656,35 @@ export default function AISpeakingLab() {
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="flex flex-col gap-1.5">
                         <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">Vocabulary Word <span className="text-red-400">*</span></label>
-                        <input
-                          type="text"
-                          placeholder="e.g. Serendipity"
-                          required
-                          value={newWordForm.word}
-                          onChange={(e) => setNewWordForm(prev => ({ ...prev, word: e.target.value }))}
-                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all focus:border-white/20"
-                        />
+                        <div className="flex gap-2">
+                          <input
+                            type="text"
+                            placeholder="e.g. Serendipity"
+                            required
+                            value={newWordForm.word}
+                            onChange={(e) => setNewWordForm(prev => ({ ...prev, word: e.target.value }))}
+                            className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all focus:border-white/20"
+                          />
+                          <button
+                            type="button"
+                            onClick={handleInferWordDetails}
+                            disabled={isInferring || !newWordForm.word.trim()}
+                            className="px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs text-white/90 font-medium hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:scale-100"
+                            title="Auto-fill pronunciation, definition, and example using AI"
+                          >
+                            {isInferring ? (
+                              <>
+                                <span className="w-3 h-3 rounded-full border border-white/40 border-t-transparent animate-spin inline-block" />
+                                <span>Generating...</span>
+                              </>
+                            ) : (
+                              <>
+                                <Sparkles className="w-3.5 h-3.5 text-white/70" />
+                                <span>AI Auto-fill</span>
+                              </>
+                            )}
+                          </button>
+                        </div>
                       </div>
 
                       <div className="flex flex-col gap-1.5">
```

Please evaluate this diff and report back any potential bugs, logic gaps, or code improvements.
