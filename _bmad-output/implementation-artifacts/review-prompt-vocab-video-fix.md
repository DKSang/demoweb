# Blind Hunter Code Review Prompt

You are the **Blind Hunter** reviewer. Your job is to review the code changes below for code quality, syntax, logic errors, potential bugs, and architectural compliance. You receive ONLY this diff.

## Code Diff

```diff
diff --git a/src/components/AISpeakingLab.tsx b/src/components/AISpeakingLab.tsx
index 5f24e64..1cfa091 100644
--- a/src/components/AISpeakingLab.tsx
+++ b/src/components/AISpeakingLab.tsx
@@ -207,6 +207,7 @@ export default function AISpeakingLab() {
     definition: "",
     example: ""
   });
+  const [isInferring, setIsInferring] = useState(false);
 
   // Daily task lock & status states
   const [hasShadowedToday, setHasShadowedToday] = useState(false);
@@ -595,6 +596,69 @@ export default function AISpeakingLab() {
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
+          model: "llama3",
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
@@ -969,8 +1033,7 @@ export default function AISpeakingLab() {
           {/* ======================================= */}
           {/* TAB 1: YOUTUBE SHADOWING HUB            */}
           {/* ======================================= */}
-          {activeTab === "shadow" && (
-            <>
+          <div className={`lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start ${activeTab === "shadow" ? "" : "hidden"}`}>
               {/* Left Column: Player & Subtitles */}
               <div className="lg:col-span-8 flex flex-col gap-6">
                 <div className="rounded-[2rem] liquid-glass p-6 flex flex-col gap-5">
@@ -1184,8 +1247,7 @@ export default function AISpeakingLab() {
                 </div>
 
               </div>
-            </>
-          )}
+          </div>
 
           {/* ======================================= */}
           {/* TAB 2: INTERACTIVE SPEAKING COACH       */}
@@ -1564,6 +1626,89 @@ export default function AISpeakingLab() {
                       </div>
                     </div>
                   )
+                ) : vocabSubTab === "add" ? (
+                  <form onSubmit={handleAddCustomWord} className="flex flex-col gap-5 bg-black/45 p-6 rounded-2xl border border-white/5">
+                    <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
+                      <Plus className="w-4 h-4 text-white/60" />
+                      <h4 className="text-xs font-semibold text-white tracking-wide uppercase">Add Custom Vocabulary</h4>
+                    </div>
+
+                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
+                      <div className="flex flex-col gap-1.5">
+                        <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">Vocabulary Word <span className="text-red-400">*</span></label>
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
+                      </div>
+
+                      <div className="flex flex-col gap-1.5">
+                        <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">Pronunciation (IPA - Optional)</label>
+                        <input
+                          type="text"
+                          placeholder="e.g. /ˌserənˈdipədē/"
+                          value={newWordForm.ipa}
+                          onChange={(e) => setNewWordForm(prev => ({ ...prev, ipa: e.target.value }))}
+                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all focus:border-white/20"
+                        />
+                      </div>
+                    </div>
+
+                    <div className="flex flex-col gap-1.5">
+                      <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">Definition (Optional)</label>
+                      <textarea
+                        placeholder="e.g. The occurrence and development of events by chance in a happy or beneficial way."
+                        value={newWordForm.definition}
+                        onChange={(e) => setNewWordForm(prev => ({ ...prev, definition: e.target.value }))}
+                        rows={3}
+                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all focus:border-white/20 resize-none font-sans"
+                      />
+                    </div>
+
+                    <div className="flex flex-col gap-1.5">
+                      <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">Example Sentence (Optional)</label>
+                      <textarea
+                        placeholder="e.g. We found the charming little restaurant by pure serendipity."
+                        value={newWordForm.example}
+                        onChange={(e) => setNewWordForm(prev => ({ ...prev, example: e.target.value }))}
+                        rows={2}
+                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all focus:border-white/20 resize-none font-serif italic"
+                      />
+                    </div>
+
+                    <button
+                      type="submit"
+                      className="py-3 rounded-full bg-white text-black hover:bg-white/95 text-xs font-semibold hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 w-full"
+                    >
+                      <Plus className="w-3.5 h-3.5 text-black" />
+                      <span>Save to Vocabulary Store</span>
+                    </button>
+                  </form>
                 ) : (
```

Please evaluate this diff and report back any potential bugs, logic gaps, or code improvements.
